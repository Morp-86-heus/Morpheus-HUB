from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from database import get_db
from models import LookupCommitente, LookupCliente, LookupTecnico, User, RuoloEnum
from auth import require_roles, get_active_org_id
import schemas

router = APIRouter(prefix="/api/lookup", tags=["lookup"])

STATI = ["In gestione", "Attesa parti", "Sospesa", "Chiusa", "Annullata"]

_admin = require_roles(RuoloEnum.proprietario, RuoloEnum.amministratore)
_any = require_roles(RuoloEnum.proprietario, RuoloEnum.amministratore, RuoloEnum.commerciale, RuoloEnum.tecnico)


# ── Commitenti ────────────────────────────────────────────────────────────────

@router.get("/commitenti", response_model=List[schemas.LookupCommitente])
def get_commitenti(
    db: Session = Depends(get_db),
    _: User = Depends(_any),
    org_id: int = Depends(get_active_org_id),
):
    return (
        db.query(LookupCommitente)
        .filter(LookupCommitente.organizzazione_id == org_id)
        .order_by(LookupCommitente.nome)
        .all()
    )


@router.get("/commitenti/full", response_model=List[schemas.CommitenteFull])
def get_commitenti_full(
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(_any),
    org_id: int = Depends(get_active_org_id),
):
    q = db.query(LookupCommitente).filter(LookupCommitente.organizzazione_id == org_id)
    if search:
        p = f"%{search}%"
        q = q.filter(or_(
            LookupCommitente.nome.ilike(p),
            LookupCommitente.citta.ilike(p),
            LookupCommitente.email.ilike(p),
            LookupCommitente.referente_nome.ilike(p),
        ))
    return q.order_by(LookupCommitente.nome).all()


@router.post("/commitenti", response_model=schemas.CommitenteFull, status_code=201)
def create_commitente(
    payload: schemas.CommitentePatch,
    db: Session = Depends(get_db),
    _: User = Depends(_admin),
    org_id: int = Depends(get_active_org_id),
):
    if not payload.nome:
        raise HTTPException(status_code=422, detail="Il nome è obbligatorio")
    if db.query(LookupCommitente).filter_by(nome=payload.nome, organizzazione_id=org_id).first():
        raise HTTPException(status_code=409, detail="Commitente già esistente")
    obj = LookupCommitente(**payload.model_dump(exclude_none=True), organizzazione_id=org_id)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.put("/commitenti/{cid}", response_model=schemas.CommitenteFull)
def update_commitente(
    cid: int,
    payload: schemas.CommitentePatch,
    db: Session = Depends(get_db),
    _: User = Depends(_admin),
    org_id: int = Depends(get_active_org_id),
):
    obj = db.query(LookupCommitente).filter_by(id=cid, organizzazione_id=org_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Non trovato")
    data = payload.model_dump(exclude_unset=True)
    if 'nome' in data and data['nome'] != obj.nome:
        db.query(LookupCliente).filter_by(
            commitente=obj.nome, organizzazione_id=org_id
        ).update({"commitente": data['nome']})
    for k, v in data.items():
        setattr(obj, k, v)
    obj.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/commitenti/{cid}", status_code=204)
def delete_commitente(
    cid: int,
    db: Session = Depends(get_db),
    _: User = Depends(_admin),
    org_id: int = Depends(get_active_org_id),
):
    obj = db.query(LookupCommitente).filter_by(id=cid, organizzazione_id=org_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Non trovato")
    db.delete(obj)
    db.commit()


# ── Clienti ───────────────────────────────────────────────────────────────────

@router.get("/clienti", response_model=List[schemas.LookupCliente])
def get_clienti(
    commitente: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(_any),
    org_id: int = Depends(get_active_org_id),
):
    q = db.query(LookupCliente).filter(LookupCliente.organizzazione_id == org_id)
    if commitente:
        q = q.filter(LookupCliente.commitente == commitente)
    return q.order_by(LookupCliente.commitente, LookupCliente.nome).all()


@router.post("/clienti", response_model=schemas.LookupCliente, status_code=201)
def create_cliente(
    nome: str,
    commitente: str,
    db: Session = Depends(get_db),
    _: User = Depends(_admin),
    org_id: int = Depends(get_active_org_id),
):
    if db.query(LookupCliente).filter_by(nome=nome, organizzazione_id=org_id).first():
        raise HTTPException(status_code=409, detail="Cliente già esistente")
    if not db.query(LookupCommitente).filter_by(nome=commitente, organizzazione_id=org_id).first():
        raise HTTPException(status_code=404, detail="Commitente non trovato")
    obj = LookupCliente(nome=nome, commitente=commitente, organizzazione_id=org_id)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.put("/clienti/{cid}", response_model=schemas.LookupCliente)
def update_cliente(
    cid: int,
    nome: str,
    commitente: str,
    db: Session = Depends(get_db),
    _: User = Depends(_admin),
    org_id: int = Depends(get_active_org_id),
):
    obj = db.query(LookupCliente).filter_by(id=cid, organizzazione_id=org_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Non trovato")
    if not db.query(LookupCommitente).filter_by(nome=commitente, organizzazione_id=org_id).first():
        raise HTTPException(status_code=404, detail="Commitente non trovato")
    obj.nome = nome
    obj.commitente = commitente
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/clienti/{cid}", status_code=204)
def delete_cliente(
    cid: int,
    db: Session = Depends(get_db),
    _: User = Depends(_admin),
    org_id: int = Depends(get_active_org_id),
):
    obj = db.query(LookupCliente).filter_by(id=cid, organizzazione_id=org_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Non trovato")
    db.delete(obj)
    db.commit()


# ── Tecnici / Stati ───────────────────────────────────────────────────────────

@router.get("/tecnici", response_model=List[schemas.LookupTecnico])
def get_tecnici(
    db: Session = Depends(get_db),
    _: User = Depends(_any),
    org_id: int = Depends(get_active_org_id),
):
    users = (
        db.query(User)
        .filter(
            User.ruolo == RuoloEnum.tecnico,
            User.attivo == True,
            User.organizzazione_id == org_id,
        )
        .order_by(User.cognome, User.nome)
        .all()
    )
    return [{"id": u.id, "nome": u.nome_completo, "colore": u.colore} for u in users]


@router.get("/stati")
def get_stati():
    return STATI
