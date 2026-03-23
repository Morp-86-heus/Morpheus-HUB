"""Utility per la scrittura di audit log."""
import logging
from typing import Optional
from fastapi import Request

logger = logging.getLogger(__name__)


def log_action(
    azione: str,
    *,
    user=None,
    org_id: Optional[int] = None,
    org_nome: Optional[str] = None,
    risorsa_tipo: Optional[str] = None,
    risorsa_id=None,
    dettagli: Optional[dict] = None,
    request: Optional[Request] = None,
):
    """
    Scrive un'entry di audit log in una sessione DB indipendente.
    Non solleva eccezioni: un fallimento del log non blocca l'operazione principale.
    """
    from database import SessionLocal
    from models import AuditLog

    ip = None
    if request:
        forwarded = request.headers.get("X-Forwarded-For")
        ip = forwarded.split(",")[0].strip() if forwarded else (
            request.client.host if request.client else None
        )

    ruolo = None
    if user:
        ruolo = user.ruolo.value if hasattr(user.ruolo, "value") else str(user.ruolo)

    db = SessionLocal()
    try:
        entry = AuditLog(
            user_id=user.id if user else None,
            user_nome=user.nome_completo if user else None,
            user_ruolo=ruolo,
            organizzazione_id=org_id,
            organizzazione_nome=org_nome,
            azione=azione,
            risorsa_tipo=risorsa_tipo,
            risorsa_id=str(risorsa_id) if risorsa_id is not None else None,
            dettagli=dettagli,
            ip_address=ip,
        )
        db.add(entry)
        db.commit()
    except Exception as exc:
        logger.warning("Audit log fallito [%s]: %s", azione, exc)
        try:
            db.rollback()
        except Exception:
            pass
    finally:
        db.close()
