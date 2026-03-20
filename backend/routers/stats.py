from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, case, and_
from typing import List
from database import get_db
from models import Ticket, User
from auth import get_current_user, get_active_org_id
import schemas

router = APIRouter(prefix="/api/stats", tags=["stats"])

STATI_APERTI = ["In gestione", "Attesa parti", "Sospesa"]


@router.get("/dashboard", response_model=schemas.DashboardStats)
def dashboard(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
    org_id: int = Depends(get_active_org_id),
):
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    domani = now + timedelta(hours=24)

    def count_stato(s):
        return db.query(Ticket).filter(
            Ticket.organizzazione_id == org_id,
            Ticket.stato == s,
        ).count()

    aperti = db.query(Ticket).filter(
        Ticket.organizzazione_id == org_id,
        Ticket.stato.in_(STATI_APERTI),
    ).count()
    in_gestione = count_stato("In gestione")
    attesa_parti = count_stato("Attesa parti")
    sospesi = count_stato("Sospesa")
    chiusi = count_stato("Chiusa")
    annullati = count_stato("Annullata")

    sla_scadute = db.query(Ticket).filter(
        Ticket.organizzazione_id == org_id,
        Ticket.sla_scadenza != None,
        Ticket.sla_scadenza < now,
        Ticket.stato.in_(STATI_APERTI),
    ).count()

    sla_in_scadenza = db.query(Ticket).filter(
        Ticket.organizzazione_id == org_id,
        Ticket.sla_scadenza != None,
        Ticket.sla_scadenza >= now,
        Ticket.sla_scadenza <= domani,
        Ticket.stato.in_(STATI_APERTI),
    ).count()

    return {
        "totale_aperti": aperti,
        "in_gestione": in_gestione,
        "attesa_parti": attesa_parti,
        "sospesi": sospesi,
        "sla_scadute": sla_scadute,
        "sla_in_scadenza_oggi": sla_in_scadenza,
        "chiusi": chiusi,
        "annullati": annullati,
    }


@router.get("/per-tecnico", response_model=List[schemas.StatPerTecnico])
def per_tecnico(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
    org_id: int = Depends(get_active_org_id),
):
    rows = db.query(
        Ticket.tecnico,
        func.count(Ticket.id).label("totale"),
        func.count(case((Ticket.stato.in_(STATI_APERTI), 1))).label("aperti"),
    ).filter(
        Ticket.organizzazione_id == org_id
    ).group_by(Ticket.tecnico).order_by(func.count(Ticket.id).desc()).all()

    return [{"tecnico": r.tecnico, "totale": r.totale, "aperti": r.aperti} for r in rows]


@router.get("/per-stato", response_model=List[schemas.StatPerStato])
def per_stato(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
    org_id: int = Depends(get_active_org_id),
):
    rows = db.query(
        Ticket.stato,
        func.count(Ticket.id).label("totale"),
    ).filter(
        Ticket.organizzazione_id == org_id
    ).group_by(Ticket.stato).order_by(func.count(Ticket.id).desc()).all()

    return [{"stato": r.stato, "totale": r.totale} for r in rows]


@router.get("/sla-compliance", response_model=List[schemas.SlaCompliance])
def sla_compliance(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
    org_id: int = Depends(get_active_org_id),
):
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    rows = db.query(
        Ticket.commitente,
        func.count(Ticket.id).label("totale"),
        func.count(case((
            and_(Ticket.sla_scadenza != None, Ticket.sla_scadenza >= now), 1
        ))).label("rispettati"),
        func.count(case((
            and_(Ticket.sla_scadenza != None, Ticket.sla_scadenza < now), 1
        ))).label("violati"),
    ).filter(
        Ticket.organizzazione_id == org_id,
        Ticket.sla_scadenza != None,
    ).group_by(Ticket.commitente).all()

    result = []
    for r in rows:
        pct = round((r.rispettati / r.totale * 100) if r.totale > 0 else 0, 1)
        result.append({
            "commitente": r.commitente,
            "totale": r.totale,
            "rispettati": r.rispettati,
            "violati": r.violati,
            "compliance_pct": pct,
        })
    return result


@router.get("/trend-mensile", response_model=List[schemas.TrendMensile])
def trend_mensile(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
    org_id: int = Depends(get_active_org_id),
):
    cutoff = (datetime.now() - timedelta(days=365)).date()
    rows = db.query(
        func.to_char(Ticket.data_gestione, "YYYY-MM").label("mese"),
        func.count(Ticket.id).label("totale"),
    ).filter(
        Ticket.organizzazione_id == org_id,
        Ticket.data_gestione != None,
        Ticket.data_gestione >= cutoff,
    ).group_by(
        func.to_char(Ticket.data_gestione, "YYYY-MM")
    ).order_by(
        func.to_char(Ticket.data_gestione, "YYYY-MM")
    ).all()

    return [{"mese": r.mese, "totale": r.totale} for r in rows]
