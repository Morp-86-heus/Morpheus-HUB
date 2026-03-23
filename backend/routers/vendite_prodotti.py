"""Vendite prodotti — gestione e integrazione automatica con la contabilità."""
from datetime import date, datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import extract

from database import get_db
from models import (
    VenditaProdotto, StatoVendita, ClienteDiretto, Servizio,
    RegistrazioneContabile, User,
)
from auth import get_current_user, get_active_org_id
from permissions import check_permission

router = APIRouter(prefix="/api/vendite-prodotti", tags=["vendite-prodotti"])


def _require_view(user: User, org_id: int, db: Session):
    if user.ruolo == RuoloEnum.proprietario:
        return
    if not check_permission(user.ruolo, "vendite.view", org_id, db):
        raise HTTPException(403, "Accesso negato: permesso vendite.view richiesto")


def _require_manage(user: User, org_id: int, db: Session):
    if user.ruolo == RuoloEnum.proprietario:
        return
    if not check_permission(user.ruolo, "vendite.manage", org_id, db):
        raise HTTPException(403, "Accesso negato: permesso vendite.manage richiesto")


# ── Schemas ───────────────────────────────────────────────────────────────────

class VenditaIn(BaseModel):
    cliente_id: Optional[int] = None
    servizio_id: Optional[int] = None
    prodotto_nome: str
    quantita: int = 1
    prezzo_unitario: int           # centesimi
    sconto_pct: int = 0            # 0-100
    data_vendita: date
    stato: str = "preventivo"
    note: Optional[str] = None


class VenditaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    organizzazione_id: int
    cliente_id: Optional[int] = None
    cliente_nome: Optional[str] = None
    servizio_id: Optional[int] = None
    prodotto_nome: str
    quantita: int
    prezzo_unitario: int
    sconto_pct: int
    totale: int
    data_vendita: date
    stato: str
    note: Optional[str] = None
    registrazione_contabile_id: Optional[int] = None
    created_at: Optional[datetime] = None


class StatsOut(BaseModel):
    num_preventivo: int
    num_confermata: int
    num_consegnata: int
    num_annullata: int
    totale_confermato: int   # centesimi (confermata + consegnata)
    totale_consegnato: int   # centesimi (solo consegnata = fatturate)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _calcola_totale(prezzo_unitario: int, quantita: int, sconto_pct: int) -> int:
    if not (0 <= sconto_pct <= 100):
        raise HTTPException(422, "sconto_pct deve essere compreso tra 0 e 100")
    lordo = prezzo_unitario * quantita
    sconto = round(lordo * sconto_pct / 100)
    return lordo - sconto


def _crea_registrazione(v: VenditaProdotto, db: Session) -> RegistrazioneContabile:
    reg = RegistrazioneContabile(
        organizzazione_id=v.organizzazione_id,
        tipo="manuale",
        cliente_nome=v.cliente_nome,
        descrizione=f"Vendita: {v.prodotto_nome}" + (f" (x{v.quantita})" if v.quantita > 1 else ""),
        importo=v.totale,
        data_competenza=v.data_vendita,
        stato="emessa",
    )
    db.add(reg)
    db.flush()  # per ottenere l'id
    return reg


def _annulla_registrazione(v: VenditaProdotto, db: Session):
    if v.registrazione_contabile_id:
        reg = db.query(RegistrazioneContabile).filter_by(id=v.registrazione_contabile_id).first()
        if reg and reg.stato != "annullata":
            reg.stato = "annullata"


def _enrich(v: VenditaProdotto) -> dict:
    d = {c.name: getattr(v, c.name) for c in v.__table__.columns}
    d["stato"] = v.stato.value if hasattr(v.stato, "value") else v.stato
    if v.cliente:
        d["cliente_nome"] = v.cliente.ragione_sociale
    return d


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("", response_model=dict)
def list_vendite(
    stato: Optional[str] = None,
    cliente_id: Optional[int] = None,
    search: Optional[str] = None,
    data_da: Optional[date] = None,
    data_a: Optional[date] = None,
    anno: Optional[int] = None,
    page: int = 1,
    page_size: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_active_org_id),
):
    _require_view(current_user, org_id, db)
    q = (
        db.query(VenditaProdotto)
        .filter(VenditaProdotto.organizzazione_id == org_id)
        .options(joinedload(VenditaProdotto.cliente))
    )
    if stato:
        q = q.filter(VenditaProdotto.stato == stato)
    if cliente_id:
        q = q.filter(VenditaProdotto.cliente_id == cliente_id)
    if search:
        q = q.filter(VenditaProdotto.prodotto_nome.ilike(f"%{search}%") |
                     VenditaProdotto.cliente_nome.ilike(f"%{search}%"))
    if anno:
        q = q.filter(extract("year", VenditaProdotto.data_vendita) == anno)
    if data_da:
        q = q.filter(VenditaProdotto.data_vendita >= data_da)
    if data_a:
        q = q.filter(VenditaProdotto.data_vendita <= data_a)

    total = q.count()
    items = (
        q.order_by(VenditaProdotto.data_vendita.desc(), VenditaProdotto.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return {"total": total, "page": page, "page_size": page_size, "items": [_enrich(v) for v in items]}


@router.get("/stats", response_model=StatsOut)
def stats_vendite(
    anno: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_active_org_id),
):
    _require_view(current_user, org_id, db)
    if not anno:
        anno = date.today().year
    vendite = db.query(VenditaProdotto).filter(
        VenditaProdotto.organizzazione_id == org_id,
        extract("year", VenditaProdotto.data_vendita) == anno,
    ).all()

    def stato_str(v):
        return v.stato.value if hasattr(v.stato, "value") else v.stato

    return StatsOut(
        num_preventivo=sum(1 for v in vendite if stato_str(v) == "preventivo"),
        num_confermata=sum(1 for v in vendite if stato_str(v) == "confermata"),
        num_consegnata=sum(1 for v in vendite if stato_str(v) == "consegnata"),
        num_annullata=sum(1 for v in vendite if stato_str(v) == "annullata"),
        totale_confermato=sum(v.totale for v in vendite if stato_str(v) in ("confermata", "consegnata")),
        totale_consegnato=sum(v.totale for v in vendite if stato_str(v) == "consegnata"),
    )


@router.post("", response_model=dict, status_code=201)
def create_vendita(
    payload: VenditaIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_active_org_id),
):
    _require_manage(current_user, org_id, db)
    totale = _calcola_totale(payload.prezzo_unitario, payload.quantita, payload.sconto_pct)

    # Snapshot nome cliente
    cliente_nome = None
    if payload.cliente_id:
        cl = db.query(ClienteDiretto).filter_by(id=payload.cliente_id, organizzazione_id=org_id).first()
        if not cl:
            raise HTTPException(status_code=404, detail="Cliente non trovato")
        cliente_nome = cl.ragione_sociale

    v = VenditaProdotto(
        organizzazione_id=org_id,
        cliente_id=payload.cliente_id,
        cliente_nome=cliente_nome,
        servizio_id=payload.servizio_id,
        prodotto_nome=payload.prodotto_nome,
        quantita=payload.quantita,
        prezzo_unitario=payload.prezzo_unitario,
        sconto_pct=payload.sconto_pct,
        totale=totale,
        data_vendita=payload.data_vendita,
        stato=payload.stato,
        note=payload.note,
    )
    db.add(v)
    db.flush()

    # Se già consegnata alla creazione, crea subito la registrazione contabile
    if payload.stato == "consegnata" and totale > 0:
        reg = _crea_registrazione(v, db)
        v.registrazione_contabile_id = reg.id

    db.commit()
    db.refresh(v)
    return _enrich(v)


@router.put("/{vendita_id}", response_model=dict)
def update_vendita(
    vendita_id: int,
    payload: VenditaIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_active_org_id),
):
    _require_manage(current_user, org_id, db)
    v = db.query(VenditaProdotto).filter_by(id=vendita_id, organizzazione_id=org_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Vendita non trovata")

    stato_precedente = v.stato.value if hasattr(v.stato, "value") else v.stato
    nuovo_stato = payload.stato

    # Aggiorna snapshot cliente
    if payload.cliente_id and payload.cliente_id != v.cliente_id:
        cl = db.query(ClienteDiretto).filter_by(id=payload.cliente_id, organizzazione_id=org_id).first()
        if not cl:
            raise HTTPException(status_code=404, detail="Cliente non trovato")
        v.cliente_nome = cl.ragione_sociale

    totale = _calcola_totale(payload.prezzo_unitario, payload.quantita, payload.sconto_pct)
    v.cliente_id = payload.cliente_id
    v.servizio_id = payload.servizio_id
    v.prodotto_nome = payload.prodotto_nome
    v.quantita = payload.quantita
    v.prezzo_unitario = payload.prezzo_unitario
    v.sconto_pct = payload.sconto_pct
    v.totale = totale
    v.data_vendita = payload.data_vendita
    v.stato = nuovo_stato
    v.note = payload.note

    # Gestione contabilità in base al cambio di stato
    if nuovo_stato == "consegnata" and stato_precedente != "consegnata" and totale > 0:
        # Diventa consegnata → crea registrazione
        if not v.registrazione_contabile_id:
            reg = _crea_registrazione(v, db)
            v.registrazione_contabile_id = reg.id
        else:
            # Aggiorna importo se era già presente (es. correzione prezzo)
            reg = db.query(RegistrazioneContabile).filter_by(id=v.registrazione_contabile_id).first()
            if reg and reg.stato != "annullata":
                reg.importo = totale
                reg.descrizione = f"Vendita: {v.prodotto_nome}" + (f" (x{v.quantita})" if v.quantita > 1 else "")
                reg.data_competenza = v.data_vendita
                reg.cliente_nome = v.cliente_nome

    elif nuovo_stato != "consegnata" and stato_precedente == "consegnata":
        # Non è più consegnata → annulla registrazione
        _annulla_registrazione(v, db)

    elif nuovo_stato == "consegnata" and stato_precedente == "consegnata" and v.registrazione_contabile_id:
        # Rimane consegnata ma i dati sono cambiati → aggiorna registrazione
        reg = db.query(RegistrazioneContabile).filter_by(id=v.registrazione_contabile_id).first()
        if reg and reg.stato != "annullata":
            reg.importo = totale
            reg.descrizione = f"Vendita: {v.prodotto_nome}" + (f" (x{v.quantita})" if v.quantita > 1 else "")
            reg.data_competenza = v.data_vendita
            reg.cliente_nome = v.cliente_nome

    db.commit()
    db.refresh(v)
    return _enrich(v)


@router.delete("/{vendita_id}", status_code=204)
def delete_vendita(
    vendita_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_active_org_id),
):
    _require_manage(current_user, org_id, db)
    v = db.query(VenditaProdotto).filter_by(id=vendita_id, organizzazione_id=org_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Vendita non trovata")
    _annulla_registrazione(v, db)
    db.delete(v)
    db.commit()
