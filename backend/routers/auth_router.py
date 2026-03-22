from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from database import get_db
from models import User, RuoloEnum, Organizzazione
from auth import (
    hash_password, verify_password, create_access_token,
    get_current_user, require_proprietario, require_admin_or_above, get_active_org_id,
)
from permissions import check_permission
import schemas


def _require_perm(user: User, permesso: str, db: Session):
    """Bypassa per il proprietario; verifica la matrice permessi per gli altri ruoli."""
    if user.ruolo == RuoloEnum.proprietario:
        return
    if not check_permission(user.ruolo.value, permesso, user.organizzazione_id, db):
        raise HTTPException(status_code=403, detail="Permesso negato")

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=schemas.Token)
def login(req: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenziali non valide")
    if not user.attivo:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabilitato")
    token = create_access_token(user.id, user.email, user.ruolo.value, remember_me=req.remember_me)
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.get("/me", response_model=schemas.UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/users", response_model=list[schemas.UserOut])
def list_users(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_above),
):
    """Lista utenti: proprietario sceglie l'org via header, amministratore vede solo la propria."""
    _require_perm(current_user, "utenti.view", db)
    if current_user.ruolo == RuoloEnum.proprietario:
        org_id_header = request.headers.get("X-Organization-Id")
        if not org_id_header:
            raise HTTPException(status_code=400, detail="Seleziona un'organizzazione")
        try:
            org_id = int(org_id_header)
        except (ValueError, TypeError):
            raise HTTPException(status_code=400, detail="X-Organization-Id non valido")
    else:
        org_id = current_user.organizzazione_id
    return (
        db.query(User)
        .filter(User.organizzazione_id == org_id)
        .order_by(User.cognome, User.nome)
        .all()
    )


@router.post("/users", response_model=schemas.UserOut, status_code=201)
def create_user(
    body: schemas.UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_above),
    org_id: int = Depends(get_active_org_id),
):
    """Crea un nuovo utente nell'organizzazione attiva."""
    _require_perm(current_user, "utenti.manage", db)
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=409, detail="Email già in uso")

    # Il ruolo proprietario non può essere assegnato a utenti di un'org
    if body.ruolo == RuoloEnum.proprietario:
        raise HTTPException(status_code=400, detail="Non puoi creare altri proprietari tramite questa interfaccia")

    user = User(
        email=body.email,
        nome=body.nome,
        cognome=body.cognome or "",
        telefono=body.telefono,
        password_hash=hash_password(body.password),
        ruolo=body.ruolo,
        attivo=True,
        organizzazione_id=org_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.put("/users/{user_id}", response_model=schemas.UserOut)
def update_user(
    user_id: int,
    body: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Utente non trovato")

    is_self = current_user.id == user_id
    is_proprietario = current_user.ruolo == RuoloEnum.proprietario
    is_amministratore = current_user.ruolo == RuoloEnum.amministratore

    # Modifica di altri utenti richiede utenti.manage
    if not is_self:
        _require_perm(current_user, "utenti.manage", db)

    # Amministratore può modificare utenti della propria org (non se stessi: già gestito da is_self)
    if is_amministratore and not is_self:
        if target.organizzazione_id != current_user.organizzazione_id:
            raise HTTPException(status_code=403, detail="Accesso negato")
    elif not is_proprietario and not is_self:
        raise HTTPException(status_code=403, detail="Accesso negato")

    if body.email is not None:
        if body.email != target.email:
            if db.query(User).filter(User.email == body.email, User.id != user_id).first():
                raise HTTPException(status_code=409, detail="Email già in uso")
            target.email = body.email
    if body.password:
        target.password_hash = hash_password(body.password)
    if body.nome is not None:
        target.nome = body.nome
    if body.cognome is not None:
        target.cognome = body.cognome
    if body.telefono is not None:
        target.telefono = body.telefono
    if is_proprietario:
        if body.ruolo is not None:
            if body.ruolo == RuoloEnum.proprietario and not is_self:
                raise HTTPException(status_code=400, detail="Non puoi assegnare il ruolo proprietario")
            target.ruolo = body.ruolo
        if body.attivo is not None:
            target.attivo = body.attivo
        if body.organizzazione_id is not None:
            if not db.query(Organizzazione).filter_by(id=body.organizzazione_id).first():
                raise HTTPException(status_code=404, detail="Organizzazione non trovata")
            target.organizzazione_id = body.organizzazione_id
    elif is_amministratore and not is_self:
        # Amministratore può attivare/disattivare utenti ma non cambiare ruolo o org
        if body.attivo is not None:
            target.attivo = body.attivo

    db.commit()
    db.refresh(target)
    return target


@router.delete("/users/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_above),
):
    _require_perm(current_user, "utenti.manage", db)
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Non puoi eliminare te stesso")
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    # Amministratore può eliminare solo utenti della propria org
    if current_user.ruolo == RuoloEnum.amministratore:
        if target.organizzazione_id != current_user.organizzazione_id:
            raise HTTPException(status_code=403, detail="Accesso negato")
        if target.ruolo == RuoloEnum.proprietario:
            raise HTTPException(status_code=403, detail="Non puoi eliminare il proprietario")
    db.delete(target)
    db.commit()
