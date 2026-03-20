from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from typing import List
from database import get_db
from models import Organizzazione, User, Ticket, RuoloEnum
from auth import require_proprietario
import schemas

router = APIRouter(prefix="/api/organizzazioni", tags=["organizzazioni"])

STATI_APERTI = ["In gestione", "Attesa parti", "Sospesa"]


@router.get("", response_model=List[schemas.OrganizzazioneOut])
def list_organizzazioni(
    db: Session = Depends(get_db),
    _: User = Depends(require_proprietario),
):
    return db.query(Organizzazione).order_by(Organizzazione.nome).all()


@router.post("", response_model=schemas.OrganizzazioneOut, status_code=201)
def create_organizzazione(
    payload: schemas.OrganizzazioneCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_proprietario),
):
    if db.query(Organizzazione).filter_by(nome=payload.nome).first():
        raise HTTPException(status_code=409, detail="Organizzazione già esistente")
    obj = Organizzazione(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/{org_id}", response_model=schemas.OrganizzazioneOut)
def get_organizzazione(
    org_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_proprietario),
):
    obj = db.query(Organizzazione).filter_by(id=org_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Organizzazione non trovata")
    return obj


@router.put("/{org_id}", response_model=schemas.OrganizzazioneOut)
def update_organizzazione(
    org_id: int,
    payload: schemas.OrganizzazioneUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_proprietario),
):
    obj = db.query(Organizzazione).filter_by(id=org_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Organizzazione non trovata")
    data = payload.model_dump(exclude_unset=True)
    if "nome" in data and data["nome"] != obj.nome:
        if db.query(Organizzazione).filter(Organizzazione.nome == data["nome"], Organizzazione.id != org_id).first():
            raise HTTPException(status_code=409, detail="Nome già in uso")
    for k, v in data.items():
        setattr(obj, k, v)
    obj.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{org_id}", status_code=204)
def delete_organizzazione(
    org_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_proprietario),
):
    obj = db.query(Organizzazione).filter_by(id=org_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Organizzazione non trovata")
    user_count = db.query(User).filter(User.organizzazione_id == org_id).count()
    if user_count > 0:
        raise HTTPException(status_code=400, detail=f"Impossibile eliminare: {user_count} utenti associati")
    db.delete(obj)
    db.commit()


@router.get("/{org_id}/stats")
def get_org_stats(
    org_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_proprietario),
):
    """Statistiche rapide per una singola organizzazione (usate nella console proprietario)."""
    org = db.query(Organizzazione).filter_by(id=org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organizzazione non trovata")

    totale_ticket = db.query(Ticket).filter(Ticket.organizzazione_id == org_id).count()
    ticket_aperti = db.query(Ticket).filter(
        Ticket.organizzazione_id == org_id,
        Ticket.stato.in_(STATI_APERTI),
    ).count()
    totale_utenti = db.query(User).filter(User.organizzazione_id == org_id).count()

    return {
        "org_id": org_id,
        "nome": org.nome,
        "totale_ticket": totale_ticket,
        "ticket_aperti": ticket_aperti,
        "totale_utenti": totale_utenti,
        "attivo": org.attivo,
    }


@router.post("/{org_id}/trial", response_model=schemas.OrganizzazioneOut)
def attiva_trial(
    org_id: int,
    payload: schemas.TrialPayload,
    db: Session = Depends(get_db),
    _: User = Depends(require_proprietario),
):
    """Attiva o rinnova il periodo di trial per un'organizzazione."""
    obj = db.query(Organizzazione).filter_by(id=org_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Organizzazione non trovata")
    if obj.licenza_attiva:
        raise HTTPException(status_code=400, detail="L'organizzazione ha già una licenza attiva")
    if payload.durata_giorni < 1 or payload.durata_giorni > 365:
        raise HTTPException(status_code=422, detail="La durata deve essere tra 1 e 365 giorni")

    obj.piano = 'trial'
    obj.trial_attivato = True
    obj.licenza_attiva = False
    obj.trial_scadenza = datetime.utcnow() + timedelta(days=payload.durata_giorni)
    obj.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(obj)
    return obj


@router.post("/{org_id}/licenza/attiva", response_model=schemas.OrganizzazioneOut)
def attiva_licenza(
    org_id: int,
    payload: schemas.LicenzaPayload,
    db: Session = Depends(get_db),
    _: User = Depends(require_proprietario),
):
    """Attiva la licenza completa per un'organizzazione."""
    obj = db.query(Organizzazione).filter_by(id=org_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Organizzazione non trovata")

    obj.licenza_attiva = True
    if payload.piano:
        obj.piano = payload.piano
    elif not obj.piano or obj.piano == 'trial':
        obj.piano = 'base'
    # licenza_scadenza: None = perpetua
    if 'licenza_scadenza' in payload.model_fields_set:
        obj.licenza_scadenza = payload.licenza_scadenza
    if payload.note_licenza is not None:
        obj.note_licenza = payload.note_licenza
    obj.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(obj)
    return obj


@router.post("/{org_id}/licenza/disattiva", response_model=schemas.OrganizzazioneOut)
def disattiva_licenza(
    org_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_proprietario),
):
    """Disattiva la licenza di un'organizzazione."""
    obj = db.query(Organizzazione).filter_by(id=org_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Organizzazione non trovata")
    if not obj.licenza_attiva:
        raise HTTPException(status_code=400, detail="La licenza non è attiva")

    obj.licenza_attiva = False
    obj.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(obj)
    return obj


@router.patch("/{org_id}/licenza", response_model=schemas.OrganizzazioneOut)
def update_licenza(
    org_id: int,
    payload: schemas.LicenzaPayload,
    db: Session = Depends(get_db),
    _: User = Depends(require_proprietario),
):
    """Modifica piano, scadenza e note di una licenza esistente."""
    obj = db.query(Organizzazione).filter_by(id=org_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Organizzazione non trovata")

    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(obj, k, v)
    obj.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/{org_id}/utenti", response_model=List[schemas.UserOut])
def get_org_utenti(
    org_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_proprietario),
):
    """Elenco utenti di una specifica organizzazione."""
    return (
        db.query(User)
        .filter(User.organizzazione_id == org_id)
        .order_by(User.cognome, User.nome)
        .all()
    )
