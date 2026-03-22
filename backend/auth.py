import os
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from database import get_db, set_rls_org
from models import User, Organizzazione, RuoloEnum

SECRET_KEY = os.getenv("SECRET_KEY", "changeme-use-a-long-random-string-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 12
REMEMBER_ME_EXPIRE_DAYS = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(user_id: int, email: str, ruolo: str, remember_me: bool = False) -> str:
    if remember_me:
        expire = datetime.now(timezone.utc) + timedelta(days=REMEMBER_ME_EXPIRE_DAYS)
    else:
        expire = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    payload = {"sub": str(user_id), "email": email, "ruolo": ruolo, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Non autenticato")
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token non valido")
    user = db.query(User).filter(User.id == user_id, User.attivo == True).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Utente non trovato o disabilitato")
    return user


def get_active_org_id(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> int:
    """
    Restituisce l'organizzazione_id attiva per la richiesta corrente.
    - Utenti normali: usa il loro organizzazione_id (bloccati se licenza scaduta oltre grazia)
    - Proprietario: legge l'header X-Organization-Id (mai bloccato)
    """
    if current_user.ruolo == RuoloEnum.proprietario:
        org_id_header = request.headers.get("X-Organization-Id")
        if org_id_header:
            try:
                org_id = int(org_id_header)
            except (ValueError, TypeError):
                raise HTTPException(status_code=400, detail="Header X-Organization-Id non valido")
            set_rls_org(db, org_id)
            return org_id
        # Proprietario senza org selezionata: nessun filtro RLS (vede tutto)
        set_rls_org(db, None)
        raise HTTPException(
            status_code=400,
            detail="Seleziona un'organizzazione per accedere ai dati"
        )
    if current_user.organizzazione_id is None:
        raise HTTPException(status_code=400, detail="Utente non associato a nessuna organizzazione")

    # Blocca l'accesso se la licenza è scaduta oltre il periodo di grazia
    org = db.query(Organizzazione).filter_by(id=current_user.organizzazione_id).first()
    if org and org.stato_licenza == 'bloccata':
        raise HTTPException(
            status_code=403,
            detail="Accesso bloccato: licenza scaduta. Contatta l'amministratore per rinnovare."
        )

    set_rls_org(db, current_user.organizzazione_id)
    return current_user.organizzazione_id


def require_roles(*ruoli: RuoloEnum):
    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.ruolo not in ruoli:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Accesso negato. Ruoli richiesti: {[r.value for r in ruoli]}"
            )
        return current_user
    return dependency


def require_proprietario(u: User = Depends(require_roles(RuoloEnum.proprietario))): return u
def require_admin_or_above(u: User = Depends(require_roles(RuoloEnum.proprietario, RuoloEnum.amministratore))): return u
def require_commerciale_or_above(u: User = Depends(require_roles(RuoloEnum.proprietario, RuoloEnum.amministratore, RuoloEnum.commerciale))): return u
def require_any(u: User = Depends(get_current_user)): return u


def create_default_admin(db: Session):
    """Crea utente proprietario di default se non esiste nessun utente."""
    if db.query(User).count() == 0:
        org = db.query(Organizzazione).filter_by(nome="Morpheus Hub").first()
        admin = User(
            email="admin@admin.local",
            nome="Admin",
            cognome="",
            password_hash=hash_password("admin123"),
            ruolo=RuoloEnum.proprietario,
            attivo=True,
            organizzazione_id=org.id if org else None,
        )
        db.add(admin)
        db.commit()
        print("✓ Utente admin creato (email: admin@admin.local, password: admin123) — CAMBIA LA PASSWORD!")
