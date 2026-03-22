from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from typing import List, Optional
from datetime import date, timedelta
from calendar import monthrange
from database import get_db
from models import ContrattoServizio, ClienteDiretto, Organizzazione, Servizio, User, RuoloEnum, StatoContratto, TipoFatturazione
from auth import get_current_user, require_roles, get_active_org_id
from utils.plan import check_feature
import schemas

router = APIRouter(prefix="/api/contratti-servizi", tags=["contratti-servizi"])
_comm = require_roles(RuoloEnum.proprietario, RuoloEnum.amministratore, RuoloEnum.commerciale)


def _enrich(c: ContrattoServizio) -> dict:
    return {
        "id": c.id,
        "cliente_id": c.cliente_id,
        "servizio_id": c.servizio_id,
        "data_inizio": c.data_inizio,
        "data_scadenza": c.data_scadenza,
        "prezzo_override": c.prezzo_override,
        "stato": c.stato,
        "note": c.note,
        "rinnovo_automatico": c.rinnovo_automatico,
        "organizzazione_id": c.organizzazione_id,
        "created_at": c.created_at,
        "cliente_ragione_sociale": c.cliente.ragione_sociale if c.cliente else None,
        "servizio_nome": c.servizio.nome if c.servizio else None,
        "servizio_categoria": c.servizio.categoria if c.servizio else None,
        "servizio_tipo_fatturazione": c.servizio.tipo_fatturazione if c.servizio else None,
        "prezzo_effettivo": c.prezzo_override if c.prezzo_override is not None else (c.servizio.prezzo if c.servizio else None),
    }


@router.get("/scadenze", response_model=dict)
def scadenze_dashboard(
    giorni: int = 30,
    db: Session = Depends(get_db),
    _: User = Depends(_comm),
    org_id: int = Depends(get_active_org_id),
):
    """Dashboard scadenze: scaduti, in scadenza entro N giorni, attivi"""
    oggi = date.today()
    soglia = oggi + timedelta(days=giorni)

    base = (db.query(ContrattoServizio)
            .options(joinedload(ContrattoServizio.cliente), joinedload(ContrattoServizio.servizio))
            .filter(
                ContrattoServizio.organizzazione_id == org_id,
                ContrattoServizio.data_scadenza.isnot(None),
                ContrattoServizio.stato == StatoContratto.attivo,
            ))

    scaduti = base.filter(ContrattoServizio.data_scadenza < oggi).order_by(ContrattoServizio.data_scadenza).all()
    in_scadenza = base.filter(
        ContrattoServizio.data_scadenza >= oggi,
        ContrattoServizio.data_scadenza <= soglia,
    ).order_by(ContrattoServizio.data_scadenza).all()

    return {
        "scaduti": [schemas.ContrattoServizioOut(**_enrich(c)) for c in scaduti],
        "in_scadenza": [schemas.ContrattoServizioOut(**_enrich(c)) for c in in_scadenza],
        "giorni_soglia": giorni,
        "oggi": oggi.isoformat(),
    }


@router.get("/ricavi-mensili", response_model=List[dict])
def ricavi_mensili(
    mesi: int = 12,
    db: Session = Depends(get_db),
    _: User = Depends(_comm),
    org_id: int = Depends(get_active_org_id),
):
    """
    Per ciascuno degli ultimi N mesi restituisce:
    - mrr:   valore mensile normalizzato di tutti i contratti attivi (abbonamenti ricorrenti)
    - nuovi: valore dei contratti iniziati in quel mese (una_tantum + prima quota abbonamenti)
    """
    # Coefficiente di normalizzazione mensile per tipo fatturazione
    COEFF = {
        TipoFatturazione.una_tantum:   None,   # gestito a parte
        TipoFatturazione.mensile:      1,
        TipoFatturazione.trimestrale:  1 / 3,
        TipoFatturazione.semestrale:   1 / 6,
        TipoFatturazione.annuale:      1 / 12,
    }

    oggi = date.today()
    # Primo giorno del mese corrente
    primo_mese_corrente = oggi.replace(day=1)

    # Genera lista dei mesi (dal più vecchio al più recente)
    mesi_lista = []
    for i in range(mesi - 1, -1, -1):
        # sottrae i mesi
        m = primo_mese_corrente.month - i
        y = primo_mese_corrente.year
        while m <= 0:
            m += 12
            y -= 1
        mesi_lista.append(date(y, m, 1))

    # Carica tutti i contratti dell'org (attivi o scaduti, esclude solo annullati)
    contratti = (
        db.query(ContrattoServizio)
        .options(joinedload(ContrattoServizio.servizio))
        .filter(
            ContrattoServizio.organizzazione_id == org_id,
            ContrattoServizio.stato != StatoContratto.annullato,
        )
        .all()
    )

    risultati = []
    for primo in mesi_lista:
        ultimo = primo.replace(day=monthrange(primo.year, primo.month)[1])
        mrr = 0
        nuovi = 0

        for c in contratti:
            prezzo = c.prezzo_override if c.prezzo_override is not None else (c.servizio.prezzo if c.servizio else None)
            if not prezzo:
                continue
            tipo = c.servizio.tipo_fatturazione if c.servizio else TipoFatturazione.una_tantum
            inizio = c.data_inizio
            scad = c.data_scadenza

            # Il contratto era attivo in questo mese?
            attivo_nel_mese = (
                inizio <= ultimo and (scad is None or scad >= primo)
            )
            if not attivo_nel_mese:
                continue

            if tipo == TipoFatturazione.una_tantum:
                # Una tantum: conta solo nel mese di inizio
                if inizio.year == primo.year and inizio.month == primo.month:
                    nuovi += prezzo
            else:
                coeff = COEFF.get(tipo, 1)
                valore_mensile = round(prezzo * coeff)
                mrr += valore_mensile
                # Anche nuovo se il contratto è iniziato questo mese
                if inizio.year == primo.year and inizio.month == primo.month:
                    nuovi += valore_mensile

        risultati.append({
            "mese": primo.strftime("%Y-%m"),
            "mrr": mrr,
            "nuovi": nuovi,
            "totale": mrr + nuovi,
        })

    return risultati


@router.get("", response_model=List[schemas.ContrattoServizioOut])
def list_contratti(
    cliente_id: Optional[int] = None,
    stato: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(_comm),
    org_id: int = Depends(get_active_org_id),
):
    q = (db.query(ContrattoServizio)
         .options(joinedload(ContrattoServizio.cliente), joinedload(ContrattoServizio.servizio))
         .filter(ContrattoServizio.organizzazione_id == org_id))
    if cliente_id:
        q = q.filter(ContrattoServizio.cliente_id == cliente_id)
    if stato:
        q = q.filter(ContrattoServizio.stato == stato)
    if search:
        p = f"%{search}%"
        q = q.join(ClienteDiretto).join(Servizio).filter(
            or_(ClienteDiretto.ragione_sociale.ilike(p), Servizio.nome.ilike(p))
        )
    results = q.order_by(ContrattoServizio.data_scadenza.asc().nulls_last()).all()
    return [schemas.ContrattoServizioOut(**_enrich(c)) for c in results]


@router.post("", response_model=schemas.ContrattoServizioOut, status_code=201)
def create_contratto(
    body: schemas.ContrattoServizioCreate,
    db: Session = Depends(get_db),
    _: User = Depends(_comm),
    org_id: int = Depends(get_active_org_id),
):
    org = db.query(Organizzazione).filter_by(id=org_id).first()
    check_feature(org, 'servizi')
    cliente = db.query(ClienteDiretto).filter_by(id=body.cliente_id, organizzazione_id=org_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    servizio = db.query(Servizio).filter_by(id=body.servizio_id, organizzazione_id=org_id).first()
    if not servizio:
        raise HTTPException(status_code=404, detail="Servizio non trovato")
    obj = ContrattoServizio(**body.model_dump(), organizzazione_id=org_id)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    obj = (db.query(ContrattoServizio)
           .options(joinedload(ContrattoServizio.cliente), joinedload(ContrattoServizio.servizio))
           .filter_by(id=obj.id).first())
    return schemas.ContrattoServizioOut(**_enrich(obj))


@router.get("/{cid}", response_model=schemas.ContrattoServizioOut)
def get_contratto(
    cid: int,
    db: Session = Depends(get_db),
    _: User = Depends(_comm),
    org_id: int = Depends(get_active_org_id),
):
    obj = (db.query(ContrattoServizio)
           .options(joinedload(ContrattoServizio.cliente), joinedload(ContrattoServizio.servizio))
           .filter(ContrattoServizio.id == cid, ContrattoServizio.organizzazione_id == org_id).first())
    if not obj:
        raise HTTPException(status_code=404, detail="Contratto non trovato")
    return schemas.ContrattoServizioOut(**_enrich(obj))


@router.put("/{cid}", response_model=schemas.ContrattoServizioOut)
def update_contratto(
    cid: int,
    body: schemas.ContrattoServizioUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(_comm),
    org_id: int = Depends(get_active_org_id),
):
    org = db.query(Organizzazione).filter_by(id=org_id).first()
    check_feature(org, 'servizi')
    obj = db.query(ContrattoServizio).filter_by(id=cid, organizzazione_id=org_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Contratto non trovato")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit()
    obj = (db.query(ContrattoServizio)
           .options(joinedload(ContrattoServizio.cliente), joinedload(ContrattoServizio.servizio))
           .filter_by(id=obj.id).first())
    return schemas.ContrattoServizioOut(**_enrich(obj))


@router.delete("/{cid}", status_code=204)
def delete_contratto(
    cid: int,
    db: Session = Depends(get_db),
    _: User = Depends(_comm),
    org_id: int = Depends(get_active_org_id),
):
    org = db.query(Organizzazione).filter_by(id=org_id).first()
    check_feature(org, 'servizi')
    obj = db.query(ContrattoServizio).filter_by(id=cid, organizzazione_id=org_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Contratto non trovato")
    db.delete(obj)
    db.commit()
