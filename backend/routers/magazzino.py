from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from database import get_db
from models import Articolo, MovimentoMagazzino, Organizzazione, User, RuoloEnum
from auth import require_roles, get_active_org_id
from utils.plan import check_feature
import schemas

router = APIRouter(prefix="/api/magazzino", tags=["magazzino"])

_tutti = require_roles(RuoloEnum.proprietario, RuoloEnum.amministratore, RuoloEnum.commerciale, RuoloEnum.tecnico)
_admin = require_roles(RuoloEnum.proprietario, RuoloEnum.amministratore)


@router.get("/articoli", response_model=List[schemas.ArticoloOut])
def list_articoli(
    commitente: Optional[str] = None,
    cliente: Optional[str] = None,
    categoria: Optional[str] = None,
    search: Optional[str] = None,
    sotto_minimo: Optional[bool] = None,
    db: Session = Depends(get_db),
    _: User = Depends(_tutti),
    org_id: int = Depends(get_active_org_id),
):
    q = db.query(Articolo).options(joinedload(Articolo.movimenti)).filter(
        Articolo.organizzazione_id == org_id
    )
    if commitente:
        q = q.filter(Articolo.commitente == commitente)
    if cliente:
        q = q.filter(Articolo.cliente == cliente)
    if categoria:
        q = q.filter(Articolo.categoria == categoria)
    if search:
        pattern = f"%{search}%"
        q = q.filter(or_(
            Articolo.seriale.ilike(pattern),
            Articolo.cespite.ilike(pattern),
            Articolo.marca.ilike(pattern),
            Articolo.modello.ilike(pattern),
            Articolo.descrizione.ilike(pattern),
            Articolo.fornitore.ilike(pattern),
        ))
    if sotto_minimo is True:
        q = q.filter(
            Articolo.quantita_minima.isnot(None),
            Articolo.quantita_disponibile <= Articolo.quantita_minima,
        )
    return q.order_by(Articolo.commitente, Articolo.cliente, Articolo.categoria, Articolo.descrizione).all()


@router.post("/articoli", response_model=schemas.ArticoloOut, status_code=201)
def create_articolo(
    payload: schemas.ArticoloCreate,
    db: Session = Depends(get_db),
    _: User = Depends(_admin),
    org_id: int = Depends(get_active_org_id),
):
    org = db.query(Organizzazione).filter_by(id=org_id).first()
    check_feature(org, 'magazzino')
    if payload.seriale:
        if db.query(Articolo).filter(
            Articolo.organizzazione_id == org_id,
            Articolo.seriale == payload.seriale,
        ).first():
            raise HTTPException(status_code=409, detail=f"Seriale '{payload.seriale}' già presente in magazzino")
    if payload.cespite:
        if db.query(Articolo).filter(
            Articolo.organizzazione_id == org_id,
            Articolo.cespite == payload.cespite,
        ).first():
            raise HTTPException(status_code=409, detail=f"Cespite '{payload.cespite}' già presente in magazzino")
    obj = Articolo(**payload.model_dump(), organizzazione_id=org_id)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return db.query(Articolo).options(joinedload(Articolo.movimenti)).filter_by(id=obj.id).first()


@router.put("/articoli/{aid}", response_model=schemas.ArticoloOut)
def update_articolo(
    aid: int,
    payload: schemas.ArticoloUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(_admin),
    org_id: int = Depends(get_active_org_id),
):
    org = db.query(Organizzazione).filter_by(id=org_id).first()
    check_feature(org, 'magazzino')
    obj = db.query(Articolo).filter_by(id=aid, organizzazione_id=org_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Articolo non trovato")
    data = payload.model_dump(exclude_unset=True)
    if data.get("seriale") and data["seriale"] != obj.seriale:
        if db.query(Articolo).filter(
            Articolo.organizzazione_id == org_id,
            Articolo.seriale == data["seriale"],
            Articolo.id != aid,
        ).first():
            raise HTTPException(status_code=409, detail=f"Seriale '{data['seriale']}' già presente in magazzino")
    if data.get("cespite") and data["cespite"] != obj.cespite:
        if db.query(Articolo).filter(
            Articolo.organizzazione_id == org_id,
            Articolo.cespite == data["cespite"],
            Articolo.id != aid,
        ).first():
            raise HTTPException(status_code=409, detail=f"Cespite '{data['cespite']}' già presente in magazzino")
    for k, v in data.items():
        setattr(obj, k, v)
    obj.updated_at = datetime.utcnow()
    db.commit()
    return db.query(Articolo).options(joinedload(Articolo.movimenti)).filter_by(id=aid).first()


@router.delete("/articoli/{aid}", status_code=204)
def delete_articolo(
    aid: int,
    db: Session = Depends(get_db),
    _: User = Depends(_admin),
    org_id: int = Depends(get_active_org_id),
):
    org = db.query(Organizzazione).filter_by(id=org_id).first()
    check_feature(org, 'magazzino')
    obj = db.query(Articolo).filter_by(id=aid, organizzazione_id=org_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Articolo non trovato")
    db.delete(obj)
    db.commit()


@router.post("/articoli/{aid}/movimenti", status_code=201)
def add_movimento(
    aid: int,
    payload: schemas.MovimentoCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(_tutti),
    org_id: int = Depends(get_active_org_id),
):
    org = db.query(Organizzazione).filter_by(id=org_id).first()
    check_feature(org, 'magazzino')
    articolo = db.query(Articolo).filter_by(id=aid, organizzazione_id=org_id).first()
    if not articolo:
        raise HTTPException(status_code=404, detail="Articolo non trovato")

    if payload.tipo not in ("carico", "scarico", "rettifica"):
        raise HTTPException(status_code=400, detail="Tipo movimento non valido. Usa: carico, scarico, rettifica")

    if payload.tipo == "scarico" and articolo.quantita_disponibile < payload.quantita:
        raise HTTPException(status_code=400, detail="Quantità in scarico superiore alla giacenza disponibile")

    is_serialized = bool(articolo.seriale or articolo.cespite)

    db.add(MovimentoMagazzino(
        articolo_id=aid,
        tipo=payload.tipo,
        quantita=payload.quantita,
        riferimento_ticket_id=payload.riferimento_ticket_id,
        note=payload.note,
        creato_da=current_user.id,
    ))

    if payload.tipo == "carico":
        articolo.quantita_disponibile += payload.quantita
    elif payload.tipo == "scarico":
        articolo.quantita_disponibile -= payload.quantita
    else:
        articolo.quantita_disponibile = payload.quantita

    if is_serialized and articolo.quantita_disponibile <= 0 and payload.tipo in ("scarico", "rettifica"):
        db.commit()
        db.delete(articolo)
        db.commit()
        return Response(status_code=204)

    articolo.updated_at = datetime.utcnow()
    db.commit()
    return db.query(Articolo).options(joinedload(Articolo.movimenti)).filter_by(id=aid).first()


@router.get("/cerca-articolo")
def cerca_articolo(
    seriale: Optional[str] = None,
    cespite: Optional[str] = None,
    commitente: Optional[str] = None,
    cliente: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(_tutti),
    org_id: int = Depends(get_active_org_id),
):
    if not seriale and not cespite:
        return []
    q = db.query(Articolo).filter(Articolo.organizzazione_id == org_id)
    if seriale:
        q = q.filter(Articolo.seriale == seriale)
    elif cespite:
        q = q.filter(Articolo.cespite == cespite)
    if commitente:
        q = q.filter(Articolo.commitente == commitente)
    if cliente:
        q = q.filter(Articolo.cliente == cliente)
    q = q.filter(or_(Articolo.categoria != "Gestione Guasti", Articolo.categoria.is_(None)))
    return q.limit(5).all()


@router.get("/movimenti", response_model=schemas.PaginatedMovimenti)
def list_movimenti(
    commitente: Optional[str] = None,
    cliente: Optional[str] = None,
    tipo: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 50,
    db: Session = Depends(get_db),
    _: User = Depends(_admin),
    org_id: int = Depends(get_active_org_id),
):
    q = (db.query(MovimentoMagazzino)
           .join(Articolo, MovimentoMagazzino.articolo_id == Articolo.id)
           .outerjoin(User, MovimentoMagazzino.creato_da == User.id)
           .filter(Articolo.organizzazione_id == org_id))
    if commitente:
        q = q.filter(Articolo.commitente == commitente)
    if cliente:
        q = q.filter(Articolo.cliente == cliente)
    if tipo:
        q = q.filter(MovimentoMagazzino.tipo == tipo)
    if search:
        pattern = f"%{search}%"
        q = q.filter(or_(
            Articolo.descrizione.ilike(pattern),
            Articolo.seriale.ilike(pattern),
            Articolo.modello.ilike(pattern),
            MovimentoMagazzino.note.ilike(pattern),
        ))
    total = q.count()
    rows = q.order_by(MovimentoMagazzino.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    items = []
    for m in rows:
        utente = db.get(User, m.creato_da) if m.creato_da else None
        items.append(schemas.MovimentoLogOut(
            id=m.id,
            tipo=m.tipo,
            quantita=m.quantita,
            note=m.note,
            riferimento_ticket_id=m.riferimento_ticket_id,
            created_at=m.created_at,
            articolo_id=m.articolo_id,
            articolo_descrizione=m.articolo.descrizione,
            articolo_marca=m.articolo.marca,
            articolo_modello=m.articolo.modello,
            articolo_seriale=m.articolo.seriale,
            articolo_categoria=m.articolo.categoria,
            articolo_commitente=m.articolo.commitente,
            articolo_cliente=m.articolo.cliente,
            creato_da_nome=utente.nome_completo if utente else None,
        ))
    return {"total": total, "page": page, "page_size": page_size, "items": items}


@router.get("/categorie")
def list_categorie(
    db: Session = Depends(get_db),
    _: User = Depends(_tutti),
    org_id: int = Depends(get_active_org_id),
):
    rows = (
        db.query(Articolo.categoria)
        .filter(Articolo.organizzazione_id == org_id, Articolo.categoria.isnot(None))
        .distinct()
        .order_by(Articolo.categoria)
        .all()
    )
    return [r[0] for r in rows]
