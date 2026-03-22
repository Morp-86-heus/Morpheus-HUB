from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional
from database import get_db
from models import Opportunita, ClienteDiretto, Organizzazione, User, RuoloEnum, FaseOpportunita
from auth import require_roles, get_active_org_id
from utils.plan import check_feature
import schemas

router = APIRouter(prefix="/api/opportunita", tags=["opportunita"])
_comm = require_roles(RuoloEnum.proprietario, RuoloEnum.amministratore, RuoloEnum.commerciale)


def _enrich(o: Opportunita) -> dict:
    cliente_nome = None
    if o.cliente:
        cliente_nome = o.cliente.ragione_sociale
    elif o.cliente_nome_libero:
        cliente_nome = o.cliente_nome_libero

    assegnato_nome = None
    if o.assegnato:
        assegnato_nome = f"{o.assegnato.nome} {o.assegnato.cognome or ''}".strip()

    return {
        "id": o.id,
        "titolo": o.titolo,
        "cliente_id": o.cliente_id,
        "cliente_nome_libero": o.cliente_nome_libero,
        "cliente_nome": cliente_nome,
        "valore": o.valore,
        "fase": o.fase,
        "probabilita": o.probabilita,
        "data_chiusura_prevista": o.data_chiusura_prevista,
        "assegnato_a": o.assegnato_a,
        "assegnato_nome": assegnato_nome,
        "note": o.note,
        "motivo_perdita": o.motivo_perdita,
        "organizzazione_id": o.organizzazione_id,
        "created_at": o.created_at,
        "updated_at": o.updated_at,
    }


def _query(db, org_id):
    return (db.query(Opportunita)
            .options(joinedload(Opportunita.cliente), joinedload(Opportunita.assegnato))
            .filter(Opportunita.organizzazione_id == org_id))


@router.get("", response_model=List[schemas.OpportunitaOut])
def list_opportunita(
    fase: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(_comm),
    org_id: int = Depends(get_active_org_id),
):
    q = _query(db, org_id)
    if fase:
        q = q.filter(Opportunita.fase == fase)
    if search:
        p = f"%{search}%"
        q = q.filter(Opportunita.titolo.ilike(p))
    return [schemas.OpportunitaOut(**_enrich(o)) for o in q.order_by(Opportunita.updated_at.desc()).all()]


@router.get("/stats", response_model=dict)
def stats_funnel(
    db: Session = Depends(get_db),
    _: User = Depends(_comm),
    org_id: int = Depends(get_active_org_id),
):
    """Conta e valore totale per fase"""
    rows = (db.query(
                Opportunita.fase,
                func.count(Opportunita.id).label("count"),
                func.coalesce(func.sum(Opportunita.valore), 0).label("valore"),
            )
            .filter(Opportunita.organizzazione_id == org_id)
            .group_by(Opportunita.fase)
            .all())

    per_fase = {r.fase: {"count": r.count, "valore": r.valore} for r in rows}
    totale_pipeline = sum(
        v["valore"] for f, v in per_fase.items()
        if f not in (FaseOpportunita.vinto, FaseOpportunita.perso)
    )
    vinto_valore = per_fase.get(FaseOpportunita.vinto, {}).get("valore", 0)
    return {"per_fase": per_fase, "totale_pipeline": totale_pipeline, "vinto_valore": vinto_valore}


@router.post("", response_model=schemas.OpportunitaOut, status_code=201)
def create_opportunita(
    body: schemas.OpportunitaCreate,
    db: Session = Depends(get_db),
    _: User = Depends(_comm),
    org_id: int = Depends(get_active_org_id),
):
    org = db.query(Organizzazione).filter_by(id=org_id).first()
    check_feature(org, 'funnel')
    obj = Opportunita(**body.model_dump(), organizzazione_id=org_id)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    obj = _query(db, org_id).filter(Opportunita.id == obj.id).first()
    return schemas.OpportunitaOut(**_enrich(obj))


@router.get("/{oid}", response_model=schemas.OpportunitaOut)
def get_opportunita(
    oid: int,
    db: Session = Depends(get_db),
    _: User = Depends(_comm),
    org_id: int = Depends(get_active_org_id),
):
    obj = _query(db, org_id).filter(Opportunita.id == oid).first()
    if not obj:
        raise HTTPException(404, "Opportunità non trovata")
    return schemas.OpportunitaOut(**_enrich(obj))


@router.put("/{oid}", response_model=schemas.OpportunitaOut)
def update_opportunita(
    oid: int,
    body: schemas.OpportunitaUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(_comm),
    org_id: int = Depends(get_active_org_id),
):
    org = db.query(Organizzazione).filter_by(id=org_id).first()
    check_feature(org, 'funnel')
    obj = db.query(Opportunita).filter_by(id=oid, organizzazione_id=org_id).first()
    if not obj:
        raise HTTPException(404, "Opportunità non trovata")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit()
    obj = _query(db, org_id).filter(Opportunita.id == oid).first()
    return schemas.OpportunitaOut(**_enrich(obj))


@router.delete("/{oid}", status_code=204)
def delete_opportunita(
    oid: int,
    db: Session = Depends(get_db),
    _: User = Depends(_comm),
    org_id: int = Depends(get_active_org_id),
):
    org = db.query(Organizzazione).filter_by(id=org_id).first()
    check_feature(org, 'funnel')
    obj = db.query(Opportunita).filter_by(id=oid, organizzazione_id=org_id).first()
    if not obj:
        raise HTTPException(404, "Opportunità non trovata")
    db.delete(obj)
    db.commit()
