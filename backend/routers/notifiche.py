"""Notifiche in-app per l'utente corrente."""
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from database import get_db
from models import Notifica, User
from auth import get_current_user, get_active_org_id

router = APIRouter(prefix="/api/notifiche", tags=["notifiche"])


# ── Schema output ─────────────────────────────────────────────────────────────

class NotificaOut(BaseModel):
    id: int
    tipo: str
    titolo: str
    messaggio: Optional[str] = None
    ticket_id: Optional[int] = None
    letta: bool
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


class NotificheResponse(BaseModel):
    items: List[NotificaOut]
    non_lette: int


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("", response_model=NotificheResponse)
def list_notifiche(
    limit: int = Query(50, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_active_org_id),
):
    items = (
        db.query(Notifica)
        .filter(
            Notifica.organizzazione_id == org_id,
            Notifica.user_id == current_user.id,
        )
        .order_by(Notifica.created_at.desc())
        .limit(limit)
        .all()
    )
    non_lette = sum(1 for n in items if not n.letta)
    return {"items": items, "non_lette": non_lette}


@router.post("/{notifica_id}/leggi")
def mark_read(
    notifica_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    n = db.query(Notifica).filter(
        Notifica.id == notifica_id,
        Notifica.user_id == current_user.id,
    ).first()
    if n and not n.letta:
        n.letta = True
        db.commit()
    return {"ok": True}


@router.post("/leggi-tutte")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_active_org_id),
):
    db.query(Notifica).filter(
        Notifica.organizzazione_id == org_id,
        Notifica.user_id == current_user.id,
        Notifica.letta == False,
    ).update({"letta": True})
    db.commit()
    return {"ok": True}


@router.delete("/vecchie")
def delete_vecchie(
    giorni: int = Query(30, ge=7),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_active_org_id),
):
    """Elimina le notifiche già lette più vecchie di N giorni."""
    from datetime import timedelta
    soglia = datetime.utcnow() - timedelta(days=giorni)
    db.query(Notifica).filter(
        Notifica.organizzazione_id == org_id,
        Notifica.user_id == current_user.id,
        Notifica.letta == True,
        Notifica.created_at < soglia,
    ).delete()
    db.commit()
    return {"ok": True}
