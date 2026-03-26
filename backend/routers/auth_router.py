import os
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from database import get_db
from models import User, RuoloEnum, Organizzazione
from auth import (
    hash_password, verify_password, create_access_token,
    get_current_user, require_proprietario, require_admin_or_above, get_active_org_id,
)
from permissions import check_permission
from utils.plan import check_user_limit
from utils.audit import log_action
import schemas


def _require_perm(user: User, permesso: str, db: Session):
    """Bypassa per il proprietario; verifica la matrice permessi per gli altri ruoli."""
    if user.ruolo == RuoloEnum.proprietario:
        return
    if not check_permission(user.ruolo.value, permesso, user.organizzazione_id, db):
        raise HTTPException(status_code=403, detail="Permesso negato")

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=schemas.Token)
def login(req: schemas.LoginRequest, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.password_hash):
        log_action("auth.login_failed", dettagli={"email": req.email}, request=request)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenziali non valide")
    if not user.attivo:
        log_action("auth.login_failed", user=user, dettagli={"motivo": "account_disabilitato"}, request=request)
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabilitato")
    token = create_access_token(user.id, user.email, user.ruolo.value, remember_me=req.remember_me)
    log_action("auth.login", user=user, org_id=user.organizzazione_id, request=request)
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.get("/me", response_model=schemas.UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/accetta-licenza", response_model=schemas.UserOut)
def accetta_licenza(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_user.licenza_accettata = True
    current_user.licenza_accettata_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(current_user)
    log_action("auth.licenza_accettata", user=current_user,
               org_id=current_user.organizzazione_id, request=request)
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

    # Verifica limite utenti per piano
    org = db.query(Organizzazione).filter_by(id=org_id).first()
    current_count = db.query(User).filter(User.organizzazione_id == org_id, User.attivo == True).count()
    check_user_limit(org, current_count)

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
    org = db.query(Organizzazione).filter_by(id=org_id).first()
    log_action("user.create", user=current_user, org_id=org_id, org_nome=org.nome if org else None,
               risorsa_tipo="user", risorsa_id=user.id,
               dettagli={"email": user.email, "ruolo": user.ruolo.value})
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
    # Determina tipo di azione
    if body.attivo is False:
        azione_audit = "user.deactivate"
    elif body.attivo is True:
        azione_audit = "user.activate"
    else:
        azione_audit = "user.update"
    org = db.query(Organizzazione).filter_by(id=target.organizzazione_id).first()
    log_action(azione_audit, user=current_user, org_id=target.organizzazione_id,
               org_nome=org.nome if org else None,
               risorsa_tipo="user", risorsa_id=target.id,
               dettagli={"email": target.email})
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
    org = db.query(Organizzazione).filter_by(id=target.organizzazione_id).first()
    log_action("user.delete", user=current_user, org_id=target.organizzazione_id,
               org_nome=org.nome if org else None,
               risorsa_tipo="user", risorsa_id=target.id,
               dettagli={"email": target.email, "ruolo": target.ruolo.value})
    db.delete(target)
    db.commit()


# ── Recupero password ──────────────────────────────────────────────────────────

RESET_TOKEN_EXPIRE_MINUTES = 60
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:13000")


@router.post("/forgot-password")
def forgot_password(req: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not user.attivo:
        # Risposta volutamente generica per non rivelare l'esistenza dell'account
        return {"message": "Se l'indirizzo email è registrato, riceverai le istruzioni a breve."}

    token = secrets.token_urlsafe(32)
    user.password_reset_token = token
    user.password_reset_expiry = datetime.now(timezone.utc) + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES)
    db.commit()

    reset_url = f"{FRONTEND_URL}/reset-password?token={token}"

    html = f"""
    <html>
    <body style="font-family:system-ui,sans-serif;color:#1e293b;background:#f8fafc;margin:0;padding:0">
      <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:16px;
                  border:1px solid #e2e8f0;padding:32px;box-shadow:0 4px 24px rgba(0,0,0,.06)">
        <div style="width:48px;height:48px;background:#f97316;border-radius:12px;
                    display:flex;align-items:center;justify-content:center;margin-bottom:20px">
          <span style="color:#fff;font-size:24px;line-height:1;font-weight:900">M</span>
        </div>
        <h2 style="margin:0 0 8px;font-size:20px;font-weight:700">Ripristino password</h2>
        <p style="margin:0 0 20px;color:#64748b;font-size:14px">
          Hai richiesto il ripristino della password per l'account <strong>{user.email}</strong>.<br>
          Clicca il pulsante qui sotto per impostare una nuova password. Il link è valido per {RESET_TOKEN_EXPIRE_MINUTES} minuti.
        </p>
        <a href="{reset_url}"
           style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;
                  padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600">
          Reimposta password
        </a>
        <p style="margin:20px 0 0;font-size:12px;color:#94a3b8">
          Se non hai richiesto il ripristino, ignora questa email. La tua password non verrà modificata.
        </p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 16px">
        <p style="margin:0;font-size:11px;color:#cbd5e1">
          Oppure copia questo link nel browser:<br>
          <span style="color:#2563eb;word-break:break-all">{reset_url}</span>
        </p>
        <p style="margin:16px 0 0;font-size:11px;color:#94a3b8;text-align:center">
          Morpheus HUB
        </p>
      </div>
    </body>
    </html>
    """

    # Usa l'SMTP di sistema (organizzazione_id IS NULL)
    from routers.email_config import get_system_smtp, send_email
    cfg = get_system_smtp(db)
    if not cfg or not cfg.enabled or not cfg.host or not cfg.from_email:
        # SMTP non configurato: il token è salvato, ma non si può inviare email
        return {"message": "SMTP di sistema non configurato. Contatta l'amministratore per ricevere il link di reset."}

    try:
        send_email(user.email, "Ripristino password — Morpheus HUB", html, cfg)
    except Exception:
        # Non rivelare l'errore SMTP all'utente
        pass

    return {"message": "Se l'indirizzo email è registrato, riceverai le istruzioni a breve."}


@router.get("/reset-password/validate/{token}")
def validate_reset_token(token: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.password_reset_token == token).first()
    if not user or not user.password_reset_expiry:
        return {"valid": False}
    expiry = user.password_reset_expiry
    if expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) > expiry:
        return {"valid": False}
    return {"valid": True, "email": user.email}


@router.post("/reset-password")
def reset_password(req: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.password_reset_token == req.token).first()
    if not user or not user.password_reset_expiry:
        raise HTTPException(400, "Token non valido o scaduto.")
    expiry = user.password_reset_expiry
    if expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) > expiry:
        raise HTTPException(400, "Il link di ripristino è scaduto. Richiedi un nuovo link.")
    if len(req.password) < 8:
        raise HTTPException(422, "La password deve essere di almeno 8 caratteri.")
    user.password_hash = hash_password(req.password)
    user.password_reset_token = None
    user.password_reset_expiry = None
    db.commit()
    return {"message": "Password aggiornata con successo. Ora puoi accedere."}
