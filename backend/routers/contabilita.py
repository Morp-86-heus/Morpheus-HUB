"""Contabilità della piattaforma — solo proprietario."""
from datetime import date, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, extract
from sqlalchemy.exc import IntegrityError

from database import get_db
from models import Fattura, FatturaVoce, Pagamento, Organizzazione, User
from auth import require_proprietario, get_current_user

router = APIRouter(prefix="/api/contabilita", tags=["contabilita"])

_prop = require_proprietario

# ── Helpers monetari ──────────────────────────────────────────────────────────

def _euro(cents: int) -> str:
    return f"€ {cents / 100:.2f}"


def _importo_pagato(fattura: Fattura) -> int:
    return sum(p.importo for p in fattura.pagamenti)


def _refresh_totale(db: Session, fattura: Fattura):
    fattura.importo_totale = sum(v.importo for v in fattura.voci)
    db.commit()


def _check_scaduta(db: Session, fattura: Fattura):
    """Transizione lazy inviata → scaduta."""
    if fattura.stato == "inviata" and fattura.data_scadenza and fattura.data_scadenza < date.today():
        fattura.stato = "scaduta"
        db.commit()


def _next_numero(db: Session) -> str:
    anno = date.today().year
    last = (
        db.query(Fattura)
        .filter(Fattura.numero.like(f"{anno}/%"))
        .order_by(Fattura.numero.desc())
        .first()
    )
    seq = int(last.numero.split("/")[1]) + 1 if last else 1
    return f"{anno}/{seq:03d}"


def _guard_modificabile(fattura: Fattura):
    if fattura.stato in ("pagata", "annullata"):
        raise HTTPException(status_code=409, detail=f"Fattura in stato '{fattura.stato}': non modificabile")


# ── Schemas ───────────────────────────────────────────────────────────────────

class VoceIn(BaseModel):
    descrizione: str
    quantita: int = 1
    prezzo_unitario: int   # centesimi

class VoceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    fattura_id: int
    descrizione: str
    quantita: int
    prezzo_unitario: int
    importo: int

class PagamentoIn(BaseModel):
    data_pagamento: date
    importo: int           # centesimi
    metodo: str = "bonifico"
    note: Optional[str] = None

class PagamentoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    fattura_id: int
    data_pagamento: date
    importo: int
    metodo: str
    note: Optional[str] = None

class FatturaIn(BaseModel):
    organizzazione_id: Optional[int] = None
    data_emissione: date
    data_scadenza: Optional[date] = None
    note: Optional[str] = None
    voci: List[VoceIn] = []

class FatturaUpdate(BaseModel):
    organizzazione_id: Optional[int] = None
    data_emissione: Optional[date] = None
    data_scadenza: Optional[date] = None
    note: Optional[str] = None

class FatturaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    numero: str
    organizzazione_id: Optional[int] = None
    organizzazione_nome: Optional[str] = None
    data_emissione: date
    data_scadenza: Optional[date] = None
    stato: str
    importo_totale: int
    importo_pagato: int = 0
    note: Optional[str] = None
    voci: List[VoceOut] = []
    pagamenti: List[PagamentoOut] = []

class FatturaListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    numero: str
    organizzazione_id: Optional[int] = None
    organizzazione_nome: Optional[str] = None
    data_emissione: date
    data_scadenza: Optional[date] = None
    stato: str
    importo_totale: int
    importo_pagato: int = 0

class PaginatedFatture(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[FatturaListItem]

class DashboardOut(BaseModel):
    fatturato_ytd: int
    incassato_ytd: int
    da_incassare: int
    scaduto: int
    num_bozza: int
    num_inviata: int
    num_pagata: int
    num_scaduta: int
    num_annullata: int

class RevenueOrgOut(BaseModel):
    organizzazione_id: Optional[int]
    organizzazione_nome: Optional[str]
    fatturato: int
    incassato: int

class TrendMese(BaseModel):
    mese: int
    mese_label: str
    fatturato: int
    incassato: int


# ── Helpers serializzazione ───────────────────────────────────────────────────

MESI = ["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"]

def _fattura_out(f: Fattura) -> FatturaOut:
    out = FatturaOut.model_validate(f)
    out.organizzazione_nome = f.organizzazione.nome if f.organizzazione else None
    out.importo_pagato = _importo_pagato(f)
    return out

def _fattura_list_item(f: Fattura) -> FatturaListItem:
    out = FatturaListItem.model_validate(f)
    out.organizzazione_nome = f.organizzazione.nome if f.organizzazione else None
    out.importo_pagato = _importo_pagato(f)
    return out


# ── Fatture — CRUD ────────────────────────────────────────────────────────────

@router.get("/fatture", response_model=PaginatedFatture)
def list_fatture(
    stato: Optional[List[str]] = Query(None),
    organizzazione_id: Optional[int] = None,
    data_da: Optional[date] = None,
    data_a: Optional[date] = None,
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    _: User = Depends(_prop),
):
    q = (
        db.query(Fattura)
        .options(joinedload(Fattura.voci), joinedload(Fattura.pagamenti), joinedload(Fattura.organizzazione))
    )
    if stato:
        q = q.filter(Fattura.stato.in_(stato))
    if organizzazione_id:
        q = q.filter(Fattura.organizzazione_id == organizzazione_id)
    if data_da:
        q = q.filter(Fattura.data_emissione >= data_da)
    if data_a:
        q = q.filter(Fattura.data_emissione <= data_a)
    if search:
        q = q.filter(Fattura.numero.ilike(f"%{search}%"))

    fatture = q.order_by(Fattura.data_emissione.desc(), Fattura.id.desc()).all()

    # Lazy scaduta check
    for f in fatture:
        _check_scaduta(db, f)

    total = len(fatture)
    items = fatture[(page - 1) * page_size: page * page_size]
    return {"total": total, "page": page, "page_size": page_size,
            "items": [_fattura_list_item(f) for f in items]}


@router.post("/fatture", response_model=FatturaOut, status_code=201)
def create_fattura(
    payload: FatturaIn,
    db: Session = Depends(get_db),
    _: User = Depends(_prop),
):
    for attempt in range(2):
        numero = _next_numero(db)
        fattura = Fattura(
            numero=numero,
            organizzazione_id=payload.organizzazione_id,
            data_emissione=payload.data_emissione,
            data_scadenza=payload.data_scadenza,
            note=payload.note,
        )
        db.add(fattura)
        try:
            db.flush()
        except IntegrityError:
            db.rollback()
            if attempt == 1:
                raise HTTPException(status_code=409, detail="Numero fattura duplicato, riprovare")
            continue
        for v in payload.voci:
            importo = v.quantita * v.prezzo_unitario
            db.add(FatturaVoce(
                fattura_id=fattura.id,
                descrizione=v.descrizione,
                quantita=v.quantita,
                prezzo_unitario=v.prezzo_unitario,
                importo=importo,
            ))
        db.commit()
        db.refresh(fattura)
        fattura.importo_totale = sum(vv.importo for vv in fattura.voci)
        db.commit()
        db.refresh(fattura)
        return _fattura_out(fattura)


@router.get("/fatture/{fattura_id}", response_model=FatturaOut)
def get_fattura(
    fattura_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(_prop),
):
    f = db.query(Fattura).options(
        joinedload(Fattura.voci), joinedload(Fattura.pagamenti), joinedload(Fattura.organizzazione)
    ).filter(Fattura.id == fattura_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Fattura non trovata")
    _check_scaduta(db, f)
    return _fattura_out(f)


@router.put("/fatture/{fattura_id}", response_model=FatturaOut)
def update_fattura(
    fattura_id: int,
    payload: FatturaUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(_prop),
):
    f = db.query(Fattura).options(
        joinedload(Fattura.voci), joinedload(Fattura.pagamenti), joinedload(Fattura.organizzazione)
    ).filter(Fattura.id == fattura_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Fattura non trovata")
    _guard_modificabile(f)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(f, k, v)
    db.commit()
    db.refresh(f)
    return _fattura_out(f)


@router.delete("/fatture/{fattura_id}", status_code=204)
def delete_fattura(
    fattura_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(_prop),
):
    f = db.query(Fattura).filter(Fattura.id == fattura_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Fattura non trovata")
    if f.stato != "bozza":
        raise HTTPException(status_code=409, detail="Solo le fatture in bozza possono essere eliminate")
    db.delete(f)
    db.commit()


# ── Transizioni di stato ──────────────────────────────────────────────────────

@router.post("/fatture/{fattura_id}/invia", response_model=FatturaOut)
def invia_fattura(
    fattura_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(_prop),
):
    f = db.query(Fattura).options(
        joinedload(Fattura.voci), joinedload(Fattura.pagamenti), joinedload(Fattura.organizzazione)
    ).filter(Fattura.id == fattura_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Fattura non trovata")
    if f.stato != "bozza":
        raise HTTPException(status_code=409, detail="Solo le fatture in bozza possono essere inviate")
    if f.importo_totale == 0:
        raise HTTPException(status_code=422, detail="Aggiungi almeno una voce prima di inviare")
    f.stato = "inviata"
    if not f.data_scadenza:
        f.data_scadenza = f.data_emissione + timedelta(days=30)
    db.commit()
    db.refresh(f)
    return _fattura_out(f)


@router.post("/fatture/{fattura_id}/annulla", response_model=FatturaOut)
def annulla_fattura(
    fattura_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(_prop),
):
    f = db.query(Fattura).options(
        joinedload(Fattura.voci), joinedload(Fattura.pagamenti), joinedload(Fattura.organizzazione)
    ).filter(Fattura.id == fattura_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Fattura non trovata")
    if f.stato == "pagata":
        raise HTTPException(status_code=409, detail="Non puoi annullare una fattura già pagata")
    f.stato = "annullata"
    db.commit()
    db.refresh(f)
    return _fattura_out(f)


# ── Voci ─────────────────────────────────────────────────────────────────────

@router.post("/fatture/{fattura_id}/voci", response_model=VoceOut, status_code=201)
def add_voce(
    fattura_id: int,
    payload: VoceIn,
    db: Session = Depends(get_db),
    _: User = Depends(_prop),
):
    f = db.query(Fattura).options(joinedload(Fattura.voci)).filter(Fattura.id == fattura_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Fattura non trovata")
    _guard_modificabile(f)
    v = FatturaVoce(
        fattura_id=fattura_id,
        descrizione=payload.descrizione,
        quantita=payload.quantita,
        prezzo_unitario=payload.prezzo_unitario,
        importo=payload.quantita * payload.prezzo_unitario,
    )
    db.add(v)
    db.flush()
    db.refresh(f)
    _refresh_totale(db, f)
    db.refresh(v)
    return v


@router.put("/fatture/{fattura_id}/voci/{voce_id}", response_model=VoceOut)
def update_voce(
    fattura_id: int,
    voce_id: int,
    payload: VoceIn,
    db: Session = Depends(get_db),
    _: User = Depends(_prop),
):
    f = db.query(Fattura).options(joinedload(Fattura.voci)).filter(Fattura.id == fattura_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Fattura non trovata")
    _guard_modificabile(f)
    v = db.query(FatturaVoce).filter(FatturaVoce.id == voce_id, FatturaVoce.fattura_id == fattura_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Voce non trovata")
    v.descrizione = payload.descrizione
    v.quantita = payload.quantita
    v.prezzo_unitario = payload.prezzo_unitario
    v.importo = payload.quantita * payload.prezzo_unitario
    db.flush()
    db.refresh(f)
    _refresh_totale(db, f)
    db.refresh(v)
    return v


@router.delete("/fatture/{fattura_id}/voci/{voce_id}", status_code=204)
def delete_voce(
    fattura_id: int,
    voce_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(_prop),
):
    f = db.query(Fattura).options(joinedload(Fattura.voci)).filter(Fattura.id == fattura_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Fattura non trovata")
    _guard_modificabile(f)
    v = db.query(FatturaVoce).filter(FatturaVoce.id == voce_id, FatturaVoce.fattura_id == fattura_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Voce non trovata")
    db.delete(v)
    db.flush()
    db.refresh(f)
    _refresh_totale(db, f)


# ── Pagamenti ─────────────────────────────────────────────────────────────────

@router.post("/fatture/{fattura_id}/pagamenti", response_model=PagamentoOut, status_code=201)
def add_pagamento(
    fattura_id: int,
    payload: PagamentoIn,
    db: Session = Depends(get_db),
    _: User = Depends(_prop),
):
    f = db.query(Fattura).options(
        joinedload(Fattura.pagamenti), joinedload(Fattura.organizzazione)
    ).filter(Fattura.id == fattura_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Fattura non trovata")
    if f.stato not in ("inviata", "scaduta"):
        raise HTTPException(status_code=409,
            detail=f"Impossibile registrare pagamenti su una fattura in stato '{f.stato}'")
    if payload.importo <= 0:
        raise HTTPException(status_code=422, detail="L'importo deve essere maggiore di zero")
    gia_pagato = _importo_pagato(f)
    residuo = f.importo_totale - gia_pagato
    if payload.importo > residuo:
        raise HTTPException(status_code=422,
            detail=f"Il pagamento ({_euro(payload.importo)}) supera il residuo ({_euro(residuo)})")
    p = Pagamento(
        fattura_id=fattura_id,
        data_pagamento=payload.data_pagamento,
        importo=payload.importo,
        metodo=payload.metodo,
        note=payload.note,
    )
    db.add(p)
    db.flush()
    db.refresh(f)
    if _importo_pagato(f) >= f.importo_totale:
        f.stato = "pagata"
    db.commit()
    db.refresh(p)
    return p


@router.delete("/fatture/{fattura_id}/pagamenti/{pag_id}", status_code=204)
def delete_pagamento(
    fattura_id: int,
    pag_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(_prop),
):
    f = db.query(Fattura).options(joinedload(Fattura.pagamenti)).filter(Fattura.id == fattura_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Fattura non trovata")
    if f.stato == "annullata":
        raise HTTPException(status_code=409, detail="Fattura annullata")
    p = db.query(Pagamento).filter(Pagamento.id == pag_id, Pagamento.fattura_id == fattura_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Pagamento non trovato")
    db.delete(p)
    db.flush()
    db.refresh(f)
    if f.stato == "pagata":
        remaining = _importo_pagato(f)
        if remaining < f.importo_totale:
            if f.data_scadenza and f.data_scadenza < date.today():
                f.stato = "scaduta"
            else:
                f.stato = "inviata"
    db.commit()


# ── Stats ─────────────────────────────────────────────────────────────────────

@router.get("/stats", response_model=DashboardOut)
def get_stats(
    db: Session = Depends(get_db),
    _: User = Depends(_prop),
):
    anno = date.today().year

    # Esegui lazy scaduta su tutte le inviata
    scadute = db.query(Fattura).filter(
        Fattura.stato == "inviata",
        Fattura.data_scadenza < date.today(),
    ).all()
    for f in scadute:
        f.stato = "scaduta"
    if scadute:
        db.commit()

    fatture_anno = db.query(Fattura).filter(
        extract("year", Fattura.data_emissione) == anno,
        Fattura.stato != "annullata",
    ).options(joinedload(Fattura.pagamenti)).all()

    fatturato_ytd = sum(f.importo_totale for f in fatture_anno)
    incassato_ytd = sum(
        sum(p.importo for p in f.pagamenti
            if p.data_pagamento.year == anno)
        for f in fatture_anno
    )

    da_incassare = sum(
        f.importo_totale - _importo_pagato(f)
        for f in fatture_anno
        if f.stato == "inviata"
    )
    scaduto = sum(
        f.importo_totale - _importo_pagato(f)
        for f in fatture_anno
        if f.stato == "scaduta"
    )

    def count(stato):
        return db.query(Fattura).filter(Fattura.stato == stato).count()

    return DashboardOut(
        fatturato_ytd=fatturato_ytd,
        incassato_ytd=incassato_ytd,
        da_incassare=da_incassare,
        scaduto=scaduto,
        num_bozza=count("bozza"),
        num_inviata=count("inviata"),
        num_pagata=count("pagata"),
        num_scaduta=count("scaduta"),
        num_annullata=count("annullata"),
    )


@router.get("/stats/per-organizzazione", response_model=List[RevenueOrgOut])
def stats_per_org(
    db: Session = Depends(get_db),
    _: User = Depends(_prop),
):
    fatture = db.query(Fattura).filter(
        Fattura.stato != "annullata"
    ).options(joinedload(Fattura.pagamenti), joinedload(Fattura.organizzazione)).all()

    agg: dict = {}
    for f in fatture:
        key = f.organizzazione_id
        if key not in agg:
            agg[key] = {
                "organizzazione_id": key,
                "organizzazione_nome": f.organizzazione.nome if f.organizzazione else "Generale",
                "fatturato": 0,
                "incassato": 0,
            }
        agg[key]["fatturato"] += f.importo_totale
        agg[key]["incassato"] += _importo_pagato(f)

    return sorted(agg.values(), key=lambda x: x["fatturato"], reverse=True)


@router.get("/stats/trend-mensile", response_model=List[TrendMese])
def stats_trend(
    anno: int = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(_prop),
):
    if not anno:
        anno = date.today().year

    fatture = db.query(Fattura).filter(
        extract("year", Fattura.data_emissione) == anno,
        Fattura.stato != "annullata",
    ).options(joinedload(Fattura.pagamenti)).all()

    mesi = {m: {"fatturato": 0, "incassato": 0} for m in range(1, 13)}
    for f in fatture:
        mesi[f.data_emissione.month]["fatturato"] += f.importo_totale
        for p in f.pagamenti:
            if p.data_pagamento.year == anno:
                mesi[p.data_pagamento.month]["incassato"] += p.importo

    return [
        TrendMese(mese=m, mese_label=MESI[m - 1], **v)
        for m, v in mesi.items()
    ]
