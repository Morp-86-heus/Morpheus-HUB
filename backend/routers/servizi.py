from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models import Servizio, User, RuoloEnum
from auth import get_current_user, require_roles, get_active_org_id
import schemas

router = APIRouter(prefix="/api/servizi", tags=["servizi"])
_comm = require_roles(RuoloEnum.proprietario, RuoloEnum.amministratore, RuoloEnum.commerciale)


@router.get("", response_model=List[schemas.ServizioOut])
def list_servizi(
    search: Optional[str] = None,
    categoria: Optional[str] = None,
    attivo: Optional[bool] = None,
    db: Session = Depends(get_db),
    _: User = Depends(_comm),
    org_id: int = Depends(get_active_org_id),
):
    q = db.query(Servizio).filter(Servizio.organizzazione_id == org_id)
    if search:
        p = f"%{search}%"
        q = q.filter(Servizio.nome.ilike(p))
    if categoria:
        q = q.filter(Servizio.categoria == categoria)
    if attivo is not None:
        q = q.filter(Servizio.attivo == attivo)
    return q.order_by(Servizio.nome).all()


@router.post("", response_model=schemas.ServizioOut, status_code=201)
def create_servizio(
    body: schemas.ServizioCreate,
    db: Session = Depends(get_db),
    _: User = Depends(_comm),
    org_id: int = Depends(get_active_org_id),
):
    obj = Servizio(**body.model_dump(), organizzazione_id=org_id)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/{sid}", response_model=schemas.ServizioOut)
def get_servizio(
    sid: int,
    db: Session = Depends(get_db),
    _: User = Depends(_comm),
    org_id: int = Depends(get_active_org_id),
):
    obj = db.query(Servizio).filter_by(id=sid, organizzazione_id=org_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Servizio non trovato")
    return obj


@router.put("/{sid}", response_model=schemas.ServizioOut)
def update_servizio(
    sid: int,
    body: schemas.ServizioUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(_comm),
    org_id: int = Depends(get_active_org_id),
):
    obj = db.query(Servizio).filter_by(id=sid, organizzazione_id=org_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Servizio non trovato")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{sid}", status_code=204)
def delete_servizio(
    sid: int,
    db: Session = Depends(get_db),
    _: User = Depends(_comm),
    org_id: int = Depends(get_active_org_id),
):
    obj = db.query(Servizio).filter_by(id=sid, organizzazione_id=org_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Servizio non trovato")
    db.delete(obj)
    db.commit()
