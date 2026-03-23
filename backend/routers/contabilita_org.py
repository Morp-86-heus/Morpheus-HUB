"""Contabilità per organizzazione — alimentata da ticket chiusi e vendite servizi."""
from datetime import date, datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import extract, func

from database import get_db
from models import (
    RegistrazioneContabile, Ticket, TicketChiusura,
    ContrattoServizio, ClienteDiretto, Servizio, Organizzazione
)
from auth import get_current_user, get_active_org_id
from permissions import check_permission
from utils.plan import check_feature
from models import User

router = APIRouter(prefix="/api/contabilita-org", tags=["contabilita-org"])

MESI = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"]


# ── Guards ────────────────────────────────────────────────────────────────────

def _require_view(user: User, org_id: int, db: Session):
    if user.ruolo == "proprietario":
        return
    if not check_permission(user.ruolo, "contabilita.view", org_id, db):
        raise HTTPException(status_code=403, detail="Accesso negato: permesso contabilita.view richiesto")


def _require_manage(user: User, org_id: int, db: Session):
    if user.ruolo == "proprietario":
        return
    if not check_permission(user.ruolo, "contabilita.manage", org_id, db):
        raise HTTPException(status_code=403, detail="Accesso negato: permesso contabilita.manage richiesto")


def _check_contabilita_feature(org_id: int, db: Session):
    org = db.query(Organizzazione).filter_by(id=org_id).first()
    if org:
        check_feature(org, "contabilita")


# ── Schemas ───────────────────────────────────────────────────────────────────

class RegistrazioneIn(BaseModel):
    descrizione: str
    importo: int                          # centesimi
    data_competenza: date
    cliente_nome: Optional[str] = None
    stato: str = "emessa"
    note: Optional[str] = None


class RegistrazioneUpdate(BaseModel):
    descrizione: Optional[str] = None
    importo: Optional[int] = None
    data_competenza: Optional[date] = None
    cliente_nome: Optional[str] = None
    stato: Optional[str] = None
    note: Optional[str] = None


class RegistrazioneOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    tipo: str
    riferimento_ticket_id: Optional[int] = None
    riferimento_contratto_id: Optional[int] = None
    cliente_nome: Optional[str] = None
    descrizione: str
    importo: int
    data_competenza: date
    stato: str
    note: Optional[str] = None
    created_at: Optional[datetime] = None


class PaginatedRegistrazioni(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[RegistrazioneOut]


class DashboardOut(BaseModel):
    totale_emesso: int
    totale_incassato: int
    da_incassare: int
    num_emessa: int
    num_incassata: int
    num_annullata: int
    num_ticket: int
    num_servizio: int
    num_manuale: int


class SyncResult(BaseModel):
    importate: int
    skippate: int
    annullate: int = 0


class TrendMese(BaseModel):
    mese: int
    mese_label: str
    emesso: int
    incassato: int


# ── Dashboard ─────────────────────────────────────────────────────────────────

@router.get("/anni", response_model=List[int])
def get_anni(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_active_org_id),
):
    """Restituisce gli anni per cui esistono registrazioni, più l'anno corrente."""
    _check_contabilita_feature(org_id, db)
    _require_view(current_user, org_id, db)

    rows = (
        db.query(extract("year", RegistrazioneContabile.data_competenza).label("anno"))
        .filter(RegistrazioneContabile.organizzazione_id == org_id)
        .distinct()
        .all()
    )
    anni = sorted({int(r.anno) for r in rows} | {date.today().year}, reverse=True)
    return anni


@router.get("/dashboard", response_model=DashboardOut)
def get_dashboard(
    anno: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_active_org_id),
):
    _check_contabilita_feature(org_id, db)
    _require_view(current_user, org_id, db)

    if not anno:
        anno = date.today().year

    q = db.query(RegistrazioneContabile).filter(
        RegistrazioneContabile.organizzazione_id == org_id,
        extract("year", RegistrazioneContabile.data_competenza) == anno,
    )
    regs = q.all()

    attive = [r for r in regs if r.stato != "annullata"]
    totale_emesso    = sum(r.importo for r in attive)
    totale_incassato = sum(r.importo for r in attive if r.stato == "incassata")
    da_incassare     = sum(r.importo for r in attive if r.stato == "emessa")

    return DashboardOut(
        totale_emesso=totale_emesso,
        totale_incassato=totale_incassato,
        da_incassare=da_incassare,
        num_emessa=sum(1 for r in regs if r.stato == "emessa"),
        num_incassata=sum(1 for r in regs if r.stato == "incassata"),
        num_annullata=sum(1 for r in regs if r.stato == "annullata"),
        num_ticket=sum(1 for r in regs if r.tipo == "ticket"),
        num_servizio=sum(1 for r in regs if r.tipo == "servizio"),
        num_manuale=sum(1 for r in regs if r.tipo == "manuale"),
    )


# ── Trend mensile ─────────────────────────────────────────────────────────────

@router.get("/trend-mensile", response_model=List[TrendMese])
def trend_mensile(
    anno: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_active_org_id),
):
    _check_contabilita_feature(org_id, db)
    _require_view(current_user, org_id, db)

    if not anno:
        anno = date.today().year

    regs = db.query(RegistrazioneContabile).filter(
        RegistrazioneContabile.organizzazione_id == org_id,
        RegistrazioneContabile.stato != "annullata",
        extract("year", RegistrazioneContabile.data_competenza) == anno,
    ).all()

    mesi: dict = {m: {"emesso": 0, "incassato": 0} for m in range(1, 13)}
    for r in regs:
        m = r.data_competenza.month
        mesi[m]["emesso"] += r.importo
        if r.stato == "incassata":
            mesi[m]["incassato"] += r.importo

    return [
        TrendMese(mese=m, mese_label=MESI[m - 1], **v)
        for m, v in mesi.items()
    ]


# ── Lista registrazioni ───────────────────────────────────────────────────────

@router.get("/registrazioni", response_model=PaginatedRegistrazioni)
def list_registrazioni(
    stato: Optional[List[str]] = Query(None),
    tipo: Optional[str] = None,
    data_da: Optional[date] = None,
    data_a: Optional[date] = None,
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_active_org_id),
):
    _check_contabilita_feature(org_id, db)
    _require_view(current_user, org_id, db)

    q = db.query(RegistrazioneContabile).filter(
        RegistrazioneContabile.organizzazione_id == org_id
    )
    if stato:
        q = q.filter(RegistrazioneContabile.stato.in_(stato))
    if tipo:
        q = q.filter(RegistrazioneContabile.tipo == tipo)
    if data_da:
        q = q.filter(RegistrazioneContabile.data_competenza >= data_da)
    if data_a:
        q = q.filter(RegistrazioneContabile.data_competenza <= data_a)
    if search:
        q = q.filter(
            RegistrazioneContabile.descrizione.ilike(f"%{search}%") |
            RegistrazioneContabile.cliente_nome.ilike(f"%{search}%")
        )

    total = q.count()
    items = (
        q.order_by(RegistrazioneContabile.data_competenza.desc(), RegistrazioneContabile.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return {"total": total, "page": page, "page_size": page_size, "items": items}


# ── Crea registrazione manuale ────────────────────────────────────────────────

@router.post("/registrazioni", response_model=RegistrazioneOut, status_code=201)
def create_registrazione(
    payload: RegistrazioneIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_active_org_id),
):
    _check_contabilita_feature(org_id, db)
    _require_manage(current_user, org_id, db)

    reg = RegistrazioneContabile(
        organizzazione_id=org_id,
        tipo="manuale",
        descrizione=payload.descrizione,
        importo=payload.importo,
        data_competenza=payload.data_competenza,
        cliente_nome=payload.cliente_nome,
        stato=payload.stato,
        note=payload.note,
    )
    db.add(reg)
    db.commit()
    db.refresh(reg)
    return reg


# ── Aggiorna registrazione ────────────────────────────────────────────────────

@router.put("/registrazioni/{reg_id}", response_model=RegistrazioneOut)
def update_registrazione(
    reg_id: int,
    payload: RegistrazioneUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_active_org_id),
):
    _check_contabilita_feature(org_id, db)
    _require_manage(current_user, org_id, db)

    reg = db.query(RegistrazioneContabile).filter(
        RegistrazioneContabile.id == reg_id,
        RegistrazioneContabile.organizzazione_id == org_id,
    ).first()
    if not reg:
        raise HTTPException(status_code=404, detail="Registrazione non trovata")
    if reg.stato == "annullata":
        raise HTTPException(status_code=409, detail="Registrazione annullata: non modificabile")

    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(reg, k, v)
    db.commit()
    db.refresh(reg)
    return reg


# ── Elimina registrazione manuale ─────────────────────────────────────────────

@router.delete("/registrazioni/{reg_id}", status_code=204)
def delete_registrazione(
    reg_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_active_org_id),
):
    _check_contabilita_feature(org_id, db)
    _require_manage(current_user, org_id, db)

    reg = db.query(RegistrazioneContabile).filter(
        RegistrazioneContabile.id == reg_id,
        RegistrazioneContabile.organizzazione_id == org_id,
    ).first()
    if not reg:
        raise HTTPException(status_code=404, detail="Registrazione non trovata")
    if reg.tipo != "manuale":
        raise HTTPException(status_code=409, detail="Solo le registrazioni manuali possono essere eliminate; usa 'annulla' per le altre")
    db.delete(reg)
    db.commit()


# ── Sync da ticket chiusi ─────────────────────────────────────────────────────

@router.post("/sync/tickets", response_model=SyncResult)
def sync_from_tickets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_active_org_id),
):
    """
    Importa automaticamente i ticket chiusi con importo non ancora registrati.
    Utilizza riferimento_ticket_id per evitare duplicati.
    """
    _check_contabilita_feature(org_id, db)
    _require_manage(current_user, org_id, db)

    # Mappa ticket_id → registrazione esistente
    reg_esistenti: dict = {
        r.riferimento_ticket_id: r
        for r in db.query(RegistrazioneContabile).filter(
            RegistrazioneContabile.organizzazione_id == org_id,
            RegistrazioneContabile.riferimento_ticket_id.isnot(None),
        ).all()
        if r.riferimento_ticket_id
    }

    # Tutti i ticket chiusi (l'importo viene calcolato dalle prestazioni della chiusura)
    tickets = (
        db.query(Ticket)
        .filter(
            Ticket.organizzazione_id == org_id,
            Ticket.stato == "Chiusa",
        )
        .options(joinedload(Ticket.chiusura))
        .all()
    )

    importate = 0
    skippate = 0
    for t in tickets:

        # 1) Calcola importo dalle prestazioni della chiusura
        importo_cents = 0
        if t.chiusura and t.chiusura.prestazioni_json:
            try:
                import json as _json
                prestazioni = _json.loads(t.chiusura.prestazioni_json)
                for p in prestazioni:
                    prezzo_raw = p.get("prezzo")
                    quantita = float(p.get("quantita") or 1)
                    if isinstance(prezzo_raw, int):
                        # Nuovo formato: già in centesimi
                        importo_cents += int(prezzo_raw * quantita)
                    elif prezzo_raw:
                        # Vecchio formato: stringa euro (es. "50.00")
                        euros = float(str(prezzo_raw).replace(",", ".").replace("€", "").strip())
                        importo_cents += int(euros * 100 * quantita)
            except (ValueError, TypeError, AttributeError):
                importo_cents = 0

        if importo_cents <= 0:
            skippate += 1
            continue

        data = t.chiusura.data_fine if t.chiusura and t.chiusura.data_fine else (t.data_gestione or date.today())
        descrizione = f"Intervento #{t.nr_intervento or t.id}"
        if t.dispositivo:
            descrizione += f" — {t.dispositivo}"

        reg_esistente = reg_esistenti.get(t.id)
        if reg_esistente:
            # Aggiorna importo se è cambiato (ricalcolo dopo modifica chiusura)
            if reg_esistente.importo != importo_cents:
                reg_esistente.importo = importo_cents
                reg_esistente.descrizione = descrizione
                reg_esistente.data_competenza = data
                importate += 1
            else:
                skippate += 1
        else:
            reg = RegistrazioneContabile(
                organizzazione_id=org_id,
                tipo="ticket",
                riferimento_ticket_id=t.id,
                cliente_nome=t.cliente or t.commitente,
                descrizione=descrizione,
                importo=importo_cents,
                data_competenza=data,
                stato="emessa",
            )
            db.add(reg)
            importate += 1

    db.commit()

    # ── Pulizia: annulla registrazioni di ticket eliminati o non più chiusi ───
    annullate = 0

    # 1) Ticket eliminato → FK diventata NULL (ON DELETE SET NULL)
    n1 = db.query(RegistrazioneContabile).filter(
        RegistrazioneContabile.organizzazione_id == org_id,
        RegistrazioneContabile.tipo == "ticket",
        RegistrazioneContabile.riferimento_ticket_id.is_(None),
        RegistrazioneContabile.stato != "annullata",
    ).update({"stato": "annullata"}, synchronize_session=False)
    annullate += n1

    # 2) Ticket eliminato (senza FK cascade) o non più in stato "Chiusa"
    ticket_ids_chiusi = [t.id for t in tickets]
    q2 = db.query(RegistrazioneContabile).filter(
        RegistrazioneContabile.organizzazione_id == org_id,
        RegistrazioneContabile.tipo == "ticket",
        RegistrazioneContabile.riferimento_ticket_id.isnot(None),
        RegistrazioneContabile.stato != "annullata",
    )
    if ticket_ids_chiusi:
        q2 = q2.filter(RegistrazioneContabile.riferimento_ticket_id.notin_(ticket_ids_chiusi))
    n2 = q2.update({"stato": "annullata"}, synchronize_session=False)
    annullate += n2

    db.commit()
    return SyncResult(importate=importate, skippate=skippate, annullate=annullate)


# ── Sync da contratti servizi ─────────────────────────────────────────────────

@router.post("/sync/contratti", response_model=SyncResult)
def sync_from_contratti(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org_id: int = Depends(get_active_org_id),
):
    """
    Importa i contratti servizi attivi con prezzo valorizzato non ancora registrati.
    Utilizza riferimento_contratto_id per evitare duplicati.
    """
    _check_contabilita_feature(org_id, db)
    _require_manage(current_user, org_id, db)

    gia_importati = {
        r.riferimento_contratto_id
        for r in db.query(RegistrazioneContabile.riferimento_contratto_id).filter(
            RegistrazioneContabile.organizzazione_id == org_id,
            RegistrazioneContabile.riferimento_contratto_id.isnot(None),
        ).all()
        if r.riferimento_contratto_id
    }

    contratti = (
        db.query(ContrattoServizio)
        .filter(
            ContrattoServizio.organizzazione_id == org_id,
            ContrattoServizio.stato == "attivo",
        )
        .options(
            joinedload(ContrattoServizio.cliente),
            joinedload(ContrattoServizio.servizio),
        )
        .all()
    )

    importate = 0
    skippate = 0
    for c in contratti:
        if c.id in gia_importati:
            skippate += 1
            continue

        importo = c.prezzo_override if c.prezzo_override is not None else (c.servizio.prezzo if c.servizio else None)
        if not importo or importo <= 0:
            skippate += 1
            continue

        descrizione = f"Contratto: {c.servizio.nome}" if c.servizio else f"Contratto #{c.id}"
        cliente_nome = c.cliente.ragione_sociale if c.cliente else None

        reg = RegistrazioneContabile(
            organizzazione_id=org_id,
            tipo="servizio",
            riferimento_contratto_id=c.id,
            cliente_nome=cliente_nome,
            descrizione=descrizione,
            importo=importo,
            data_competenza=c.data_inizio,
            stato="emessa",
        )
        db.add(reg)
        importate += 1

    db.commit()
    return SyncResult(importate=importate, skippate=skippate)
