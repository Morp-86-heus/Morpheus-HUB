from datetime import date
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from database import get_db
from models import Evento, User, RuoloEnum
from auth import get_current_user, require_roles, get_active_org_id
import schemas

router = APIRouter(prefix="/api/eventi", tags=["eventi"])

_tutti = require_roles(
    RuoloEnum.proprietario, RuoloEnum.amministratore,
    RuoloEnum.commerciale, RuoloEnum.tecnico
)


@router.get("", response_model=List[schemas.EventoOut])
def list_eventi(
    data_da: date = Query(...),
    data_a: date = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(_tutti),
    org_id: int = Depends(get_active_org_id),
):
    return (
        db.query(Evento)
        .filter(
            Evento.organizzazione_id == org_id,
            or_(Evento.condiviso == True, Evento.created_by == current_user.id),
            Evento.data_fine >= data_da,
            Evento.data_inizio <= data_a,
        )
        .order_by(Evento.data_inizio, Evento.ora_inizio)
        .all()
    )


@router.post("", response_model=schemas.EventoOut, status_code=201)
def create_evento(
    body: schemas.EventoCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(_tutti),
    org_id: int = Depends(get_active_org_id),
):
    ev = Evento(
        **body.model_dump(),
        organizzazione_id=org_id,
        created_by=current_user.id,
    )
    db.add(ev)
    db.commit()
    db.refresh(ev)
    return ev


@router.put("/{evento_id}", response_model=schemas.EventoOut)
def update_evento(
    evento_id: int,
    body: schemas.EventoUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(_tutti),
    org_id: int = Depends(get_active_org_id),
):
    ev = db.query(Evento).filter(
        Evento.id == evento_id,
        Evento.organizzazione_id == org_id,
    ).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Evento non trovato")
    # Solo il creatore o admin/proprietario può modificare
    if ev.created_by != current_user.id and current_user.ruolo not in (
        RuoloEnum.proprietario, RuoloEnum.amministratore
    ):
        raise HTTPException(status_code=403, detail="Accesso negato")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(ev, field, value)
    db.commit()
    db.refresh(ev)
    return ev


@router.delete("/{evento_id}", status_code=204)
def delete_evento(
    evento_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(_tutti),
    org_id: int = Depends(get_active_org_id),
):
    ev = db.query(Evento).filter(
        Evento.id == evento_id,
        Evento.organizzazione_id == org_id,
    ).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Evento non trovato")
    if ev.created_by != current_user.id and current_user.ruolo not in (
        RuoloEnum.proprietario, RuoloEnum.amministratore
    ):
        raise HTTPException(status_code=403, detail="Accesso negato")
    db.delete(ev)
    db.commit()
