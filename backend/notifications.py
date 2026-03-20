"""Funzioni helper per la creazione di notifiche in-app."""
from sqlalchemy.orm import Session
from models import Notifica, User, RuoloEnum


def _utenti(db: Session, org_id: int, ruoli=None, escludi_ids=None):
    q = db.query(User).filter(
        User.organizzazione_id == org_id,
        User.attivo == True,
    )
    if ruoli:
        q = q.filter(User.ruolo.in_(ruoli))
    escludi = set(escludi_ids or [])
    return [u for u in q.all() if u.id not in escludi]


def _scrivi(db: Session, org_id: int, tipo: str, titolo: str,
            messaggio: str | None, ticket_id: int | None, destinatari: list):
    for u in destinatari:
        db.add(Notifica(
            organizzazione_id=org_id,
            user_id=u.id,
            tipo=tipo,
            titolo=titolo,
            messaggio=messaggio,
            ticket_id=ticket_id,
        ))


def _tecnico_utente(db: Session, org_id: int, nome_completo: str, escludi_id: int | None = None):
    """Restituisce l'oggetto User del tecnico cercandolo per nome_completo."""
    candidati = _utenti(db, org_id, ruoli=[RuoloEnum.tecnico])
    return next(
        (u for u in candidati if u.nome_completo == nome_completo and u.id != escludi_id),
        None,
    )


# ── Evento: nuovo ticket ──────────────────────────────────────────────────────

def notifica_nuovo_ticket(db: Session, org_id: int, ticket, autore: User):
    admins = _utenti(db, org_id,
                     ruoli=[RuoloEnum.amministratore, RuoloEnum.proprietario],
                     escludi_ids=[autore.id])
    destinatari = list(admins)

    if ticket.tecnico:
        t = _tecnico_utente(db, org_id, ticket.tecnico, escludi_id=autore.id)
        if t and t not in destinatari:
            destinatari.append(t)

    if not destinatari:
        return

    cliente = f" — {ticket.cliente}" if ticket.cliente else ""
    _scrivi(db, org_id, "nuovo_ticket",
            f"Nuovo ticket #{ticket.id}{cliente}",
            f"Aperto da {autore.nome_completo}",
            ticket.id, destinatari)


# ── Evento: stato cambiato ────────────────────────────────────────────────────

def notifica_stato_cambiato(db: Session, org_id: int, ticket, autore: User, vecchio_stato: str):
    admins = _utenti(db, org_id,
                     ruoli=[RuoloEnum.amministratore, RuoloEnum.proprietario],
                     escludi_ids=[autore.id])
    destinatari = list(admins)

    if ticket.tecnico:
        t = _tecnico_utente(db, org_id, ticket.tecnico, escludi_id=autore.id)
        if t and t not in destinatari:
            destinatari.append(t)

    if not destinatari:
        return

    _scrivi(db, org_id, "stato_cambiato",
            f"Ticket #{ticket.id}: {vecchio_stato} → {ticket.stato}",
            ticket.cliente or None,
            ticket.id, destinatari)


# ── Evento: tecnico assegnato ─────────────────────────────────────────────────

def notifica_tecnico_assegnato(db: Session, org_id: int, ticket, autore: User):
    if not ticket.tecnico:
        return
    t = _tecnico_utente(db, org_id, ticket.tecnico, escludi_id=autore.id)
    if not t:
        return
    _scrivi(db, org_id, "assegnazione",
            f"Ticket #{ticket.id} assegnato a te",
            f"Cliente: {ticket.cliente or '—'}",
            ticket.id, [t])


# ── Evento: ticket chiuso ─────────────────────────────────────────────────────

def notifica_ticket_chiuso(db: Session, org_id: int, ticket, autore: User):
    admins = _utenti(db, org_id,
                     ruoli=[RuoloEnum.amministratore, RuoloEnum.proprietario],
                     escludi_ids=[autore.id])
    if not admins:
        return
    _scrivi(db, org_id, "ticket_chiuso",
            f"Ticket #{ticket.id} chiuso",
            f"Da {autore.nome_completo} — Cliente: {ticket.cliente or '—'}",
            ticket.id, admins)
