from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from database import get_db
from models import ClienteDiretto, SedeClienteDiretto, User, RuoloEnum
from auth import get_current_user, require_roles, get_active_org_id
import schemas

router = APIRouter(prefix="/api/clienti-diretti", tags=["clienti-diretti"])

_admin = require_roles(RuoloEnum.proprietario, RuoloEnum.amministratore, RuoloEnum.commerciale)
_any = get_current_user


@router.get("", response_model=List[schemas.ClienteDirettoOut])
def list_clienti_diretti(
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(_any),
    org_id: int = Depends(get_active_org_id),
):
    q = db.query(ClienteDiretto).filter(ClienteDiretto.organizzazione_id == org_id)
    if search:
        p = f"%{search}%"
        q = q.filter(or_(
            ClienteDiretto.ragione_sociale.ilike(p),
            ClienteDiretto.citta.ilike(p),
            ClienteDiretto.partita_iva.ilike(p),
            ClienteDiretto.referente_nome.ilike(p),
            ClienteDiretto.email.ilike(p),
        ))
    return q.order_by(ClienteDiretto.ragione_sociale).all()


@router.post("", response_model=schemas.ClienteDirettoOut, status_code=201)
def create_cliente_diretto(
    body: schemas.ClienteDirettoCreate,
    db: Session = Depends(get_db),
    _: User = Depends(_admin),
    org_id: int = Depends(get_active_org_id),
):
    obj = ClienteDiretto(**body.model_dump(), organizzazione_id=org_id)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/{cid}", response_model=schemas.ClienteDirettoOut)
def get_cliente_diretto(
    cid: int,
    db: Session = Depends(get_db),
    _: User = Depends(_any),
    org_id: int = Depends(get_active_org_id),
):
    obj = db.query(ClienteDiretto).filter_by(id=cid, organizzazione_id=org_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    return obj


@router.put("/{cid}", response_model=schemas.ClienteDirettoOut)
def update_cliente_diretto(
    cid: int,
    body: schemas.ClienteDirettoUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(_admin),
    org_id: int = Depends(get_active_org_id),
):
    obj = db.query(ClienteDiretto).filter_by(id=cid, organizzazione_id=org_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{cid}", status_code=204)
def delete_cliente_diretto(
    cid: int,
    db: Session = Depends(get_db),
    _: User = Depends(_admin),
    org_id: int = Depends(get_active_org_id),
):
    obj = db.query(ClienteDiretto).filter_by(id=cid, organizzazione_id=org_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    db.delete(obj)
    db.commit()


# ── Sedi aggiuntive ────────────────────────────────────────────────────────────

def _get_cliente(cid: int, org_id: int, db: Session) -> ClienteDiretto:
    obj = db.query(ClienteDiretto).filter_by(id=cid, organizzazione_id=org_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    return obj


@router.get("/{cid}/sedi", response_model=List[schemas.SedeClienteDirettoOut])
def list_sedi(
    cid: int,
    db: Session = Depends(get_db),
    _: User = Depends(_any),
    org_id: int = Depends(get_active_org_id),
):
    _get_cliente(cid, org_id, db)
    return db.query(SedeClienteDiretto).filter_by(cliente_id=cid).order_by(SedeClienteDiretto.id).all()


@router.post("/{cid}/sedi", response_model=schemas.SedeClienteDirettoOut, status_code=201)
def create_sede(
    cid: int,
    body: schemas.SedeClienteDirettoCreate,
    db: Session = Depends(get_db),
    _: User = Depends(_admin),
    org_id: int = Depends(get_active_org_id),
):
    _get_cliente(cid, org_id, db)
    sede = SedeClienteDiretto(**body.model_dump(), cliente_id=cid, organizzazione_id=org_id)
    db.add(sede)
    db.commit()
    db.refresh(sede)
    return sede


@router.put("/{cid}/sedi/{sid}", response_model=schemas.SedeClienteDirettoOut)
def update_sede(
    cid: int,
    sid: int,
    body: schemas.SedeClienteDirettoUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(_admin),
    org_id: int = Depends(get_active_org_id),
):
    _get_cliente(cid, org_id, db)
    sede = db.query(SedeClienteDiretto).filter_by(id=sid, cliente_id=cid).first()
    if not sede:
        raise HTTPException(status_code=404, detail="Sede non trovata")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(sede, k, v)
    db.commit()
    db.refresh(sede)
    return sede


@router.delete("/{cid}/sedi/{sid}", status_code=204)
def delete_sede(
    cid: int,
    sid: int,
    db: Session = Depends(get_db),
    _: User = Depends(_admin),
    org_id: int = Depends(get_active_org_id),
):
    _get_cliente(cid, org_id, db)
    sede = db.query(SedeClienteDiretto).filter_by(id=sid, cliente_id=cid).first()
    if not sede:
        raise HTTPException(status_code=404, detail="Sede non trovata")
    db.delete(sede)
    db.commit()
