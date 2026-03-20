from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from database import get_db
from models import Listino, ListinoVoce, User, RuoloEnum
from auth import get_current_user, require_roles, get_active_org_id
import schemas

router = APIRouter(prefix="/api/listini", tags=["listini"])

_admin = require_roles(RuoloEnum.proprietario, RuoloEnum.amministratore)
_tutti = require_roles(RuoloEnum.proprietario, RuoloEnum.amministratore, RuoloEnum.commerciale, RuoloEnum.tecnico)


@router.get("", response_model=List[schemas.ListinoOut])
def list_listini(
    commitente: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(_tutti),
    org_id: int = Depends(get_active_org_id),
):
    q = db.query(Listino).options(joinedload(Listino.voci)).filter(Listino.organizzazione_id == org_id)
    if commitente:
        q = q.filter(Listino.commitente == commitente)
    return q.order_by(Listino.commitente, Listino.nome).all()


@router.post("", response_model=schemas.ListinoOut, status_code=201)
def create_listino(
    payload: schemas.ListinoCreate,
    db: Session = Depends(get_db),
    _: User = Depends(_admin),
    org_id: int = Depends(get_active_org_id),
):
    obj = Listino(**payload.model_dump(), organizzazione_id=org_id)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return db.query(Listino).options(joinedload(Listino.voci)).filter_by(id=obj.id).first()


@router.put("/{lid}", response_model=schemas.ListinoOut)
def update_listino(
    lid: int,
    payload: schemas.ListinoUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(_admin),
    org_id: int = Depends(get_active_org_id),
):
    obj = db.query(Listino).filter_by(id=lid, organizzazione_id=org_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Listino non trovato")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    obj.updated_at = datetime.utcnow()
    db.commit()
    return db.query(Listino).options(joinedload(Listino.voci)).filter_by(id=lid).first()


@router.delete("/{lid}", status_code=204)
def delete_listino(
    lid: int,
    db: Session = Depends(get_db),
    _: User = Depends(_admin),
    org_id: int = Depends(get_active_org_id),
):
    obj = db.query(Listino).filter_by(id=lid, organizzazione_id=org_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Listino non trovato")
    db.delete(obj)
    db.commit()


@router.post("/{lid}/voci", response_model=schemas.ListinoVoceOut, status_code=201)
def add_voce(
    lid: int,
    payload: schemas.ListinoVoceCreate,
    db: Session = Depends(get_db),
    _: User = Depends(_admin),
    org_id: int = Depends(get_active_org_id),
):
    if not db.query(Listino).filter_by(id=lid, organizzazione_id=org_id).first():
        raise HTTPException(status_code=404, detail="Listino non trovato")
    obj = ListinoVoce(listino_id=lid, **payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.put("/{lid}/voci/{vid}", response_model=schemas.ListinoVoceOut)
def update_voce(
    lid: int,
    vid: int,
    payload: schemas.ListinoVoceCreate,
    db: Session = Depends(get_db),
    _: User = Depends(_admin),
    org_id: int = Depends(get_active_org_id),
):
    # Verifica che il listino appartenga all'org
    if not db.query(Listino).filter_by(id=lid, organizzazione_id=org_id).first():
        raise HTTPException(status_code=404, detail="Listino non trovato")
    obj = db.query(ListinoVoce).filter_by(id=vid, listino_id=lid).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Voce non trovata")
    for k, v in payload.model_dump().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{lid}/voci/{vid}", status_code=204)
def delete_voce(
    lid: int,
    vid: int,
    db: Session = Depends(get_db),
    _: User = Depends(_admin),
    org_id: int = Depends(get_active_org_id),
):
    if not db.query(Listino).filter_by(id=lid, organizzazione_id=org_id).first():
        raise HTTPException(status_code=404, detail="Listino non trovato")
    obj = db.query(ListinoVoce).filter_by(id=vid, listino_id=lid).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Voce non trovata")
    db.delete(obj)
    db.commit()
