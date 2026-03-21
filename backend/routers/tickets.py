from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
import io
import json
import os
import base64
import uuid as uuid_lib

from database import get_db
from models import Ticket, TicketChiusura, User, RuoloEnum, Articolo, MovimentoMagazzino
from auth import get_current_user, require_roles, get_active_org_id
from permissions import check_permission
import schemas
import notifications as notif

router = APIRouter(prefix="/api/tickets", tags=["tickets"])

_tutti = require_roles(RuoloEnum.proprietario, RuoloEnum.amministratore, RuoloEnum.commerciale, RuoloEnum.tecnico)
_crea = require_roles(RuoloEnum.proprietario, RuoloEnum.amministratore, RuoloEnum.commerciale)
_elimina = require_roles(RuoloEnum.proprietario, RuoloEnum.amministratore)


def _valida_progressivo(db: Session, org_id: int, tecnico: str, data_gestione, nr_progressivo: int, exclude_id: int = None):
    """Controlla duplicati e buchi nella sequenza giornaliera per tecnico (scoped per org)."""
    if not tecnico or not data_gestione or nr_progressivo is None:
        return
    q = db.query(Ticket.nr_progressivo).filter(
        Ticket.organizzazione_id == org_id,
        Ticket.tecnico == tecnico,
        Ticket.data_gestione == data_gestione,
        Ticket.nr_progressivo.isnot(None),
    )
    if exclude_id:
        q = q.filter(Ticket.id != exclude_id)
    usati = sorted([r[0] for r in q.all()])

    if nr_progressivo in usati:
        raise HTTPException(status_code=400,
            detail=f"Progressivo {nr_progressivo} già usato da {tecnico} in data {data_gestione}.")

    next_ok = (max(usati) + 1) if usati else 1
    if nr_progressivo > next_ok:
        raise HTTPException(status_code=400,
            detail=f"Numero non sequenziale: il prossimo progressivo disponibile per {tecnico} è {next_ok}.")
    if nr_progressivo < 1:
        raise HTTPException(status_code=400, detail="Il progressivo deve essere ≥ 1.")


def build_query(
    db: Session,
    org_id: int,
    stato: Optional[List[str]] = None,
    commitente: Optional[str] = None,
    cliente: Optional[str] = None,
    tecnico: Optional[str] = None,
    data_da: Optional[str] = None,
    data_a: Optional[str] = None,
    sla_scaduta: Optional[bool] = None,
    search: Optional[str] = None,
):
    q = db.query(Ticket).filter(Ticket.organizzazione_id == org_id)
    if stato:
        q = q.filter(Ticket.stato.in_(stato))
    if commitente:
        q = q.filter(Ticket.commitente == commitente)
    if cliente:
        q = q.filter(Ticket.cliente == cliente)
    if tecnico:
        q = q.filter(Ticket.tecnico == tecnico)
    if data_da:
        q = q.filter(Ticket.data_gestione >= data_da)
    if data_a:
        q = q.filter(Ticket.data_gestione <= data_a)
    if sla_scaduta is True:
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        q = q.filter(Ticket.sla_scadenza != None, Ticket.sla_scadenza < now)
    if search:
        pattern = f"%{search}%"
        q = q.filter(or_(
            Ticket.nr_intervento.ilike(pattern),
            Ticket.utente.ilike(pattern),
            Ticket.note.ilike(pattern),
            Ticket.citta.ilike(pattern),
        ))
    return q


@router.get("/next-progressivo")
def next_progressivo(
    tecnico: str,
    data_gestione: str,
    exclude_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(_tutti),
    org_id: int = Depends(get_active_org_id),
):
    q = db.query(Ticket.nr_progressivo).filter(
        Ticket.organizzazione_id == org_id,
        Ticket.tecnico == tecnico,
        Ticket.data_gestione == data_gestione,
        Ticket.nr_progressivo.isnot(None),
    )
    if exclude_id:
        q = q.filter(Ticket.id != exclude_id)
    usati = sorted([r[0] for r in q.all()])
    return {"next": (max(usati) + 1) if usati else 1, "usati": usati}


@router.get("/export/excel")
def export_excel(
    stato: Optional[List[str]] = Query(None),
    commitente: Optional[str] = None,
    cliente: Optional[str] = None,
    tecnico: Optional[str] = None,
    data_da: Optional[str] = None,
    data_a: Optional[str] = None,
    sla_scaduta: Optional[bool] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(_crea),
    org_id: int = Depends(get_active_org_id),
):
    import openpyxl

    q = build_query(db, org_id, stato, commitente, cliente, tecnico, data_da, data_a, sla_scaduta, search)
    tickets = q.all()

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Tickets"
    ws.append(["ID", "COMMITENTE", "CLIENTE", "NR INT", "UTENTE", "CITTA",
               "SLA", "LDV", "STATO", "NOTE", "DATA GESTIONE", "TECNICO", "NR PROGRESSIVO"])
    for t in tickets:
        ws.append([t.id, t.commitente, t.cliente, t.nr_intervento, t.utente, t.citta,
                   t.sla_scadenza, t.ldv, t.stato, t.note, t.data_gestione,
                   t.tecnico, t.nr_progressivo])

    stream = io.BytesIO()
    wb.save(stream)
    stream.seek(0)
    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=tickets_export.xlsx"}
    )


@router.get("", response_model=schemas.PaginatedTickets)
def list_tickets(
    stato: Optional[List[str]] = Query(None),
    commitente: Optional[str] = None,
    cliente: Optional[str] = None,
    tecnico: Optional[str] = None,
    data_da: Optional[str] = None,
    data_a: Optional[str] = None,
    sla_scaduta: Optional[bool] = None,
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 50,
    order_by: Optional[str] = "id",
    order_dir: Optional[str] = "desc",
    db: Session = Depends(get_db),
    current_user: User = Depends(_tutti),
    org_id: int = Depends(get_active_org_id),
):
    q = build_query(db, org_id, stato, commitente, cliente, tecnico, data_da, data_a, sla_scaduta, search)

    if current_user.ruolo == RuoloEnum.tecnico:
        if not check_permission("tecnico", "ticket.view_all", org_id, db):
            q = q.filter(Ticket.tecnico == current_user.nome_completo)

    total = q.count()
    col = getattr(Ticket, order_by, Ticket.id)
    if order_dir == "desc":
        col = col.desc()
    items = q.options(joinedload(Ticket.chiusura)).order_by(col).offset((page - 1) * page_size).limit(page_size).all()
    return {"total": total, "page": page, "page_size": page_size, "items": items}


@router.post("", response_model=schemas.TicketOut, status_code=201)
def create_ticket(
    ticket: schemas.TicketCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(_crea),
    org_id: int = Depends(get_active_org_id),
):
    data = ticket.model_dump()
    if data.get("nr_progressivo") is not None:
        _valida_progressivo(db, org_id, data.get("tecnico"), data.get("data_gestione"), data["nr_progressivo"])
    obj = Ticket(**data, organizzazione_id=org_id)
    db.add(obj)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Progressivo già usato da questo tecnico in questa data.")
    db.refresh(obj)
    notif.notifica_nuovo_ticket(db, org_id, obj, current_user)
    db.commit()
    return obj


@router.get("/{ticket_id}", response_model=schemas.TicketOut)
def get_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(_tutti),
    org_id: int = Depends(get_active_org_id),
):
    obj = db.query(Ticket).filter(Ticket.id == ticket_id, Ticket.organizzazione_id == org_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Ticket non trovato")
    return obj


@router.put("/{ticket_id}", response_model=schemas.TicketOut)
def update_ticket(
    ticket_id: int,
    ticket: schemas.TicketUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(_tutti),
    org_id: int = Depends(get_active_org_id),
):
    obj = db.query(Ticket).filter(Ticket.id == ticket_id, Ticket.organizzazione_id == org_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Ticket non trovato")

    data = ticket.model_dump(exclude_unset=True)

    if current_user.ruolo == RuoloEnum.tecnico:
        if obj.tecnico != current_user.nome_completo:
            raise HTTPException(status_code=403, detail="Puoi modificare solo i tuoi ticket")
        data = {k: v for k, v in data.items() if k == "stato"}

    if data.get("nr_progressivo") is not None:
        tecnico = data.get("tecnico", obj.tecnico)
        data_gest = data.get("data_gestione", obj.data_gestione)
        _valida_progressivo(db, org_id, tecnico, data_gest, data["nr_progressivo"], exclude_id=ticket_id)

    vecchio_stato = obj.stato
    vecchio_tecnico = obj.tecnico

    for k, v in data.items():
        setattr(obj, k, v)
    obj.updated_at = datetime.utcnow()
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Progressivo già usato da questo tecnico in questa data.")
    db.refresh(obj)

    # Notifiche post-aggiornamento
    if "stato" in data and obj.stato != vecchio_stato:
        notif.notifica_stato_cambiato(db, org_id, obj, current_user, vecchio_stato)
    if "tecnico" in data and obj.tecnico != vecchio_tecnico:
        notif.notifica_tecnico_assegnato(db, org_id, obj, current_user)
    db.commit()

    return obj


@router.delete("/{ticket_id}", status_code=204)
def delete_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(_elimina),
    org_id: int = Depends(get_active_org_id),
):
    obj = db.query(Ticket).filter(Ticket.id == ticket_id, Ticket.organizzazione_id == org_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Ticket non trovato")
    db.delete(obj)
    db.commit()


@router.post("/{ticket_id}/chiudi", response_model=schemas.TicketOutWithChiusura)
def chiudi_ticket(
    ticket_id: int,
    payload: schemas.TicketChiusuraCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(_tutti),
    org_id: int = Depends(get_active_org_id),
):
    obj = db.query(Ticket).filter(Ticket.id == ticket_id, Ticket.organizzazione_id == org_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Ticket non trovato")

    if current_user.ruolo == RuoloEnum.tecnico and obj.tecnico != current_user.nome_completo:
        raise HTTPException(status_code=403, detail="Puoi chiudere solo i tuoi ticket")

    chiusura = db.query(TicketChiusura).filter(TicketChiusura.ticket_id == ticket_id).first()
    parti_json = json.dumps([p.model_dump() for p in payload.parti], ensure_ascii=False) if payload.parti else None
    prestazioni_json = json.dumps([p.model_dump() for p in payload.prestazioni], ensure_ascii=False) if payload.prestazioni else None

    # Salva nuove immagini su disco
    existing_docs = json.loads(chiusura.documenti_json) if chiusura and chiusura.documenti_json else []
    if payload.documenti:
        upload_dir = f"/app/uploads/chiusure/{ticket_id}"
        os.makedirs(upload_dir, exist_ok=True)
        for doc in payload.documenti:
            try:
                header, b64data = doc.dataUrl.split(",", 1)
                ext = "jpg" if "jpeg" in header or "jpg" in header else "png"
                filename = f"{uuid_lib.uuid4().hex}.{ext}"
                filepath = os.path.join(upload_dir, filename)
                with open(filepath, "wb") as f:
                    f.write(base64.b64decode(b64data))
                existing_docs.append({"nome": doc.nome, "path": f"chiusure/{ticket_id}/{filename}"})
            except Exception:
                pass
    documenti_json = json.dumps(existing_docs, ensure_ascii=False) if existing_docs else None

    if chiusura:
        chiusura.data_inizio = payload.data_inizio
        chiusura.ora_inizio = payload.ora_inizio
        chiusura.data_fine = payload.data_fine
        chiusura.ora_fine = payload.ora_fine
        chiusura.esito = payload.esito
        chiusura.tecnico_nome = payload.tecnico_nome
        chiusura.note_chiusura = payload.note_chiusura
        chiusura.parti_json = parti_json
        chiusura.prestazioni_json = prestazioni_json
        chiusura.documenti_json = documenti_json
        chiusura.updated_at = datetime.utcnow()
    else:
        chiusura = TicketChiusura(
            ticket_id=ticket_id,
            data_inizio=payload.data_inizio,
            ora_inizio=payload.ora_inizio,
            data_fine=payload.data_fine,
            ora_fine=payload.ora_fine,
            esito=payload.esito,
            tecnico_nome=payload.tecnico_nome,
            note_chiusura=payload.note_chiusura,
            parti_json=parti_json,
            prestazioni_json=prestazioni_json,
            documenti_json=documenti_json,
        )
        db.add(chiusura)

    obj.stato = "Chiusa"
    obj.updated_at = datetime.utcnow()
    db.commit()

    if payload.parti:
        for parte in payload.parti:
            if parte.ricambio_articolo_id:
                articolo = db.query(Articolo).filter_by(
                    id=parte.ricambio_articolo_id,
                    organizzazione_id=org_id,
                ).first()
                if articolo:
                    is_serialized = bool(articolo.seriale or articolo.cespite)
                    articolo.quantita_disponibile = max(articolo.quantita_disponibile - 1, 0)
                    articolo.updated_at = datetime.utcnow()
                    db.add(MovimentoMagazzino(
                        articolo_id=articolo.id,
                        tipo="scarico",
                        quantita=1,
                        riferimento_ticket_id=ticket_id,
                        note=f"Scarico automatico — Ticket #{ticket_id} · {parte.ricambio_descrizione or ''}".strip(" ·"),
                        creato_da=current_user.id,
                    ))
                    if is_serialized and articolo.quantita_disponibile <= 0:
                        db.flush()
                        db.delete(articolo)

            if parte.parte_da_riparare and parte.descrizione:
                commitente_r = obj.commitente or "—"
                cliente_r = obj.cliente or "—"
                art_riparato = None
                if parte.seriale:
                    art_riparato = db.query(Articolo).filter(
                        Articolo.organizzazione_id == org_id,
                        Articolo.seriale == parte.seriale,
                        Articolo.categoria != "Gestione Guasti",
                    ).first()
                if not art_riparato:
                    art_riparato = db.query(Articolo).filter(
                        Articolo.organizzazione_id == org_id,
                        Articolo.descrizione == parte.descrizione,
                        Articolo.categoria != "Gestione Guasti",
                        Articolo.commitente == commitente_r,
                        Articolo.cliente == cliente_r,
                    ).first()
                if not art_riparato:
                    art_riparato = Articolo(
                        commitente=commitente_r,
                        cliente=cliente_r,
                        categoria=None,
                        marca=None,
                        modello=parte.modello,
                        seriale=parte.seriale,
                        cespite=None,
                        descrizione=parte.descrizione,
                        unita_misura="pz",
                        quantita_disponibile=0,
                        quantita_minima=0,
                        organizzazione_id=org_id,
                    )
                    db.add(art_riparato)
                    db.flush()
                art_riparato.quantita_disponibile += 1
                art_riparato.updated_at = datetime.utcnow()
                db.add(MovimentoMagazzino(
                    articolo_id=art_riparato.id,
                    tipo="carico",
                    quantita=1,
                    riferimento_ticket_id=ticket_id,
                    note=f"Carico riparato — Ticket #{ticket_id}" + (f" · {parte.difetto}" if parte.difetto else ""),
                    creato_da=current_user.id,
                ))

            if parte.parte_ritirata and parte.descrizione:
                commitente_g = obj.commitente or "—"
                cliente_g = obj.cliente or "—"
                art_guasto = None
                if parte.seriale:
                    art_guasto = db.query(Articolo).filter(
                        Articolo.organizzazione_id == org_id,
                        Articolo.seriale == parte.seriale,
                        Articolo.categoria == "Gestione Guasti",
                    ).first()
                if not art_guasto:
                    art_guasto = Articolo(
                        commitente=commitente_g,
                        cliente=cliente_g,
                        categoria="Gestione Guasti",
                        marca=None,
                        modello=parte.modello,
                        seriale=parte.seriale,
                        cespite=None,
                        descrizione=parte.descrizione,
                        unita_misura="pz",
                        quantita_disponibile=0,
                        quantita_minima=0,
                        organizzazione_id=org_id,
                    )
                    db.add(art_guasto)
                    db.flush()
                art_guasto.quantita_disponibile += 1
                art_guasto.updated_at = datetime.utcnow()
                note_g = f"Carico guasto — Ticket #{ticket_id}"
                if parte.tipo:
                    note_g += f" · {parte.tipo}"
                if parte.difetto:
                    note_g += f" · {parte.difetto}"
                db.add(MovimentoMagazzino(
                    articolo_id=art_guasto.id,
                    tipo="carico",
                    quantita=1,
                    riferimento_ticket_id=ticket_id,
                    note=note_g,
                    creato_da=current_user.id,
                ))

        db.commit()

    db.refresh(obj)
    notif.notifica_ticket_chiuso(db, org_id, obj, current_user)
    db.commit()
    return obj


@router.get("/{ticket_id}/chiusura", response_model=schemas.TicketChiusuraOut)
def get_chiusura(
    ticket_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(_tutti),
    org_id: int = Depends(get_active_org_id),
):
    # Verifica che il ticket appartenga all'org
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id, Ticket.organizzazione_id == org_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket non trovato")
    chiusura = db.query(TicketChiusura).filter(TicketChiusura.ticket_id == ticket_id).first()
    if not chiusura:
        raise HTTPException(status_code=404, detail="Dati di chiusura non trovati")
    return chiusura


@router.get("/{ticket_id}/documenti/{filename}")
def get_documento(
    ticket_id: int,
    filename: str,
    db: Session = Depends(get_db),
    _: User = Depends(_tutti),
    org_id: int = Depends(get_active_org_id),
):
    # Verifica che il ticket appartenga all'org dell'utente
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id, Ticket.organizzazione_id == org_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket non trovato")

    # Costruisci il path assoluto e verifica che sia dentro la directory attesa
    base_dir = f"/app/uploads/chiusure/{ticket_id}"
    filepath = os.path.realpath(os.path.join(base_dir, filename))
    expected_prefix = os.path.realpath(base_dir)
    if not filepath.startswith(expected_prefix + os.sep) and filepath != expected_prefix:
        raise HTTPException(status_code=400, detail="Path non valido")

    if not os.path.isfile(filepath):
        raise HTTPException(status_code=404, detail="File non trovato")

    ext = filename.rsplit(".", 1)[-1].lower()
    media_type = "image/jpeg" if ext in ("jpg", "jpeg") else "image/png"
    return FileResponse(filepath, media_type=media_type)
