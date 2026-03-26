from datetime import datetime, date
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, Date, DateTime,
    ForeignKey, Index, Enum, UniqueConstraint, JSON
)
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func
import enum

Base = declarative_base()


class RuoloEnum(str, enum.Enum):
    proprietario = "proprietario"
    amministratore = "amministratore"
    commerciale = "commerciale"
    tecnico = "tecnico"


class Organizzazione(Base):
    __tablename__ = "organizzazioni"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(200), nullable=False, unique=True)
    descrizione = Column(Text, nullable=True)
    attivo = Column(Boolean, default=True)

    # Dati legali
    ragione_sociale = Column(String(200), nullable=True)
    forma_giuridica = Column(String(100), nullable=True)   # SRL, SPA, Soc. Coop., ecc.
    partita_iva = Column(String(20), nullable=True)
    codice_fiscale = Column(String(20), nullable=True)

    # Sede legale
    via = Column(String(200), nullable=True)
    civico = Column(String(10), nullable=True)
    cap = Column(String(10), nullable=True)
    citta = Column(String(100), nullable=True)
    provincia = Column(String(5), nullable=True)
    regione = Column(String(100), nullable=True)

    # Contatti
    telefono = Column(String(50), nullable=True)
    email = Column(String(200), nullable=True)
    pec = Column(String(200), nullable=True)
    sito_web = Column(String(200), nullable=True)

    # Referente principale
    referente_nome = Column(String(200), nullable=True)
    referente_ruolo = Column(String(100), nullable=True)
    referente_telefono = Column(String(50), nullable=True)
    referente_email = Column(String(200), nullable=True)

    # Dati fatturazione
    regime_fiscale = Column(String(100), nullable=True)    # Ordinario, Forfettario, Minimi, ecc.
    codice_sdi = Column(String(10), nullable=True)         # Codice destinatario SDI (7 char)
    pec_fatturazione = Column(String(200), nullable=True)  # PEC per fatturazione elettronica
    iban = Column(String(34), nullable=True)
    banca = Column(String(200), nullable=True)
    intestatario_conto = Column(String(200), nullable=True)
    note_fatturazione = Column(Text, nullable=True)

    # Licenza
    piano = Column(String(50), nullable=True)          # 'trial', 'base', 'professional', 'enterprise'
    licenza_attiva = Column(Boolean, nullable=False, default=False, server_default='false')
    trial_attivato = Column(Boolean, nullable=False, default=False, server_default='false')
    trial_scadenza = Column(DateTime, nullable=True)
    licenza_scadenza = Column(DateTime, nullable=True)  # None = nessuna scadenza (perpetua)
    note_licenza = Column(Text, nullable=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    users = relationship("User", back_populates="organizzazione")

    GRACE_DAYS = 7

    @property
    def stato_licenza(self) -> str:
        now = datetime.utcnow()
        if self.licenza_attiva:
            if self.licenza_scadenza and self.licenza_scadenza < now:
                giorni_scaduta = (now - self.licenza_scadenza).days
                return 'in_grazia' if giorni_scaduta <= self.GRACE_DAYS else 'bloccata'
            return 'attiva'
        if self.trial_attivato:
            if self.trial_scadenza and self.trial_scadenza < now:
                giorni_scaduta = (now - self.trial_scadenza).days
                return 'in_grazia' if giorni_scaduta <= self.GRACE_DAYS else 'bloccata'
            return 'trial'
        return 'nessuna'

    @property
    def giorni_grazia_rimanenti(self) -> int | None:
        if self.stato_licenza != 'in_grazia':
            return None
        now = datetime.utcnow()
        ref = self.licenza_scadenza if self.licenza_attiva else self.trial_scadenza
        if not ref:
            return None
        giorni_scaduta = (now - ref).days
        return max(0, self.GRACE_DAYS - giorni_scaduta)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    nome = Column(String(100), nullable=False)
    cognome = Column(String(100), nullable=True, default="")
    telefono = Column(String(50), nullable=True)
    password_hash = Column(String(255), nullable=False)
    ruolo = Column(Enum(RuoloEnum), nullable=False, default=RuoloEnum.tecnico)
    attivo = Column(Boolean, default=True)
    organizzazione_id = Column(Integer, ForeignKey("organizzazioni.id"), nullable=True, index=True)
    created_at = Column(DateTime, server_default=func.now())
    last_seen = Column(DateTime, nullable=True)
    password_reset_token = Column(String(255), nullable=True)
    password_reset_expiry = Column(DateTime, nullable=True)
    licenza_accettata = Column(Boolean, nullable=False, default=False, server_default='false')
    licenza_accettata_at = Column(DateTime, nullable=True)

    organizzazione = relationship("Organizzazione", back_populates="users")

    @property
    def nome_completo(self) -> str:
        return f"{self.nome} {self.cognome or ''}".strip()

    @property
    def username(self) -> str:
        return self.email

    @property
    def organizzazione_nome(self) -> str | None:
        return self.organizzazione.nome if self.organizzazione else None

    @property
    def org_stato_licenza(self) -> str | None:
        return self.organizzazione.stato_licenza if self.organizzazione else None

    @property
    def org_giorni_grazia_rimanenti(self) -> int | None:
        return self.organizzazione.giorni_grazia_rimanenti if self.organizzazione else None

    @property
    def org_piano(self) -> str | None:
        return self.organizzazione.piano if self.organizzazione else None


class LookupCommitente(Base):
    __tablename__ = "lookup_commitenti"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), nullable=False)
    organizzazione_id = Column(Integer, ForeignKey("organizzazioni.id"), nullable=True, index=True)
    # Anagrafica
    partita_iva = Column(String(20), nullable=True)
    codice_fiscale = Column(String(20), nullable=True)
    via = Column(String(200), nullable=True)
    civico = Column(String(10), nullable=True)
    cap = Column(String(10), nullable=True)
    citta = Column(String(100), nullable=True)
    provincia = Column(String(5), nullable=True)
    regione = Column(String(100), nullable=True)
    telefono = Column(String(50), nullable=True)
    email = Column(String(200), nullable=True)
    pec = Column(String(200), nullable=True)
    sito_web = Column(String(200), nullable=True)
    referente_nome = Column(String(200), nullable=True)
    referente_ruolo = Column(String(100), nullable=True)
    referente_telefono = Column(String(50), nullable=True)
    referente_email = Column(String(200), nullable=True)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("nome", "organizzazione_id", name="uq_commitenti_nome_org"),
    )


class LookupCliente(Base):
    __tablename__ = "lookup_clienti"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), nullable=False)
    commitente = Column(String(100), nullable=True)
    organizzazione_id = Column(Integer, ForeignKey("organizzazioni.id"), nullable=True, index=True)

    __table_args__ = (
        UniqueConstraint("nome", "organizzazione_id", name="uq_clienti_nome_org"),
    )


class LookupTecnico(Base):
    __tablename__ = "lookup_tecnici"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), unique=True, nullable=False)


class ClienteDiretto(Base):
    __tablename__ = "clienti_diretti"

    id = Column(Integer, primary_key=True, index=True)
    ragione_sociale = Column(String(200), nullable=False, index=True)
    partita_iva = Column(String(20), nullable=True)
    codice_fiscale = Column(String(20), nullable=True)
    # Sede legale
    via = Column(String(200), nullable=True)
    civico = Column(String(10), nullable=True)
    cap = Column(String(10), nullable=True)
    citta = Column(String(100), nullable=True)
    provincia = Column(String(5), nullable=True)
    regione = Column(String(100), nullable=True)
    # Contatti aziendali
    telefono = Column(String(50), nullable=True)
    email = Column(String(200), nullable=True)
    pec = Column(String(200), nullable=True)
    sito_web = Column(String(200), nullable=True)
    # Referente principale
    referente_nome = Column(String(200), nullable=True)
    referente_ruolo = Column(String(100), nullable=True)
    referente_telefono = Column(String(50), nullable=True)
    referente_email = Column(String(200), nullable=True)
    # Altro
    note = Column(Text, nullable=True)
    organizzazione_id = Column(Integer, ForeignKey("organizzazioni.id"), nullable=True, index=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    contratti = relationship("ContrattoServizio", back_populates="cliente")
    sedi = relationship("SedeClienteDiretto", back_populates="cliente",
                        cascade="all, delete-orphan", order_by="SedeClienteDiretto.id")


class SedeClienteDiretto(Base):
    __tablename__ = "clienti_diretti_sedi"

    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("clienti_diretti.id", ondelete="CASCADE"), nullable=False, index=True)
    organizzazione_id = Column(Integer, ForeignKey("organizzazioni.id"), nullable=True, index=True)
    nome = Column(String(200), nullable=True)          # es. "Sede Roma", "Magazzino"
    via = Column(String(200), nullable=True)
    civico = Column(String(10), nullable=True)
    cap = Column(String(10), nullable=True)
    citta = Column(String(100), nullable=True)
    provincia = Column(String(5), nullable=True)
    telefono = Column(String(50), nullable=True)
    referente_nome = Column(String(200), nullable=True)
    referente_telefono = Column(String(50), nullable=True)
    referente_email = Column(String(200), nullable=True)
    note = Column(Text, nullable=True)

    cliente = relationship("ClienteDiretto", back_populates="sedi")


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    commitente = Column(String(100), nullable=True)
    cliente = Column(String(100), nullable=True)
    nr_intervento = Column(String(100), nullable=True)
    utente = Column(String(200), nullable=True)
    citta = Column(String(200), nullable=True)
    sla_scadenza = Column(DateTime, nullable=True)
    ldv = Column(Text, nullable=True)
    stato = Column(String(50), nullable=True, default="In gestione")
    note = Column(Text, nullable=True)
    data_gestione = Column(Date, nullable=True)
    tecnico = Column(String(100), nullable=True)
    nr_progressivo = Column(Integer, nullable=True)
    dispositivo = Column(String(200), nullable=True)
    note_intervento = Column(Text, nullable=True)
    organizzazione_id = Column(Integer, ForeignKey("organizzazioni.id"), nullable=True, index=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    chiusura = relationship("TicketChiusura", back_populates="ticket", uselist=False, cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_tickets_stato", "stato"),
        Index("ix_tickets_tecnico", "tecnico"),
        Index("ix_tickets_commitente", "commitente"),
        Index("ix_tickets_data_gestione", "data_gestione"),
        Index("ix_tickets_sla_scadenza", "sla_scadenza"),
    )


class Listino(Base):
    __tablename__ = "listini"

    id = Column(Integer, primary_key=True, index=True)
    commitente = Column(String(100), nullable=False, index=True)
    nome = Column(String(200), nullable=False)
    note = Column(Text, nullable=True)
    organizzazione_id = Column(Integer, ForeignKey("organizzazioni.id"), nullable=True, index=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    voci = relationship("ListinoVoce", back_populates="listino",
                        cascade="all, delete-orphan", order_by="ListinoVoce.id")


class ListinoVoce(Base):
    __tablename__ = "listino_voci"

    id = Column(Integer, primary_key=True, index=True)
    listino_id = Column(Integer, ForeignKey("listini.id"), nullable=False, index=True)
    descrizione = Column(String(300), nullable=False)
    prezzo = Column(Integer, nullable=True)   # centesimi, es. 5000 = €50,00
    unita_misura = Column(String(50), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    listino = relationship("Listino", back_populates="voci")


class Articolo(Base):
    __tablename__ = "articoli"

    id = Column(Integer, primary_key=True, index=True)
    commitente = Column(String(100), nullable=True)
    cliente = Column(String(100), nullable=True)
    categoria = Column(String(100), nullable=True)
    marca = Column(String(100), nullable=True)
    modello = Column(String(200), nullable=True)
    seriale = Column(String(100), nullable=True, index=True)
    cespite = Column(String(100), nullable=True, index=True)
    descrizione = Column(String(300), nullable=False)
    unita_misura = Column(String(50), nullable=True, default="pz")
    quantita_disponibile = Column(Integer, nullable=False, default=0)
    quantita_minima = Column(Integer, nullable=True, default=0)
    fornitore = Column(String(200), nullable=True)
    note = Column(Text, nullable=True)
    organizzazione_id = Column(Integer, ForeignKey("organizzazioni.id"), nullable=True, index=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    movimenti = relationship("MovimentoMagazzino", back_populates="articolo",
                             cascade="all, delete-orphan")


class PermessoRuolo(Base):
    """Matrice permessi per ruolo, per organizzazione. Sovrascrive i default."""
    __tablename__ = "permessi_ruolo"

    id = Column(Integer, primary_key=True, index=True)
    organizzazione_id = Column(Integer, ForeignKey("organizzazioni.id"), nullable=False, index=True)
    ruolo = Column(String(50), nullable=False)
    permesso = Column(String(100), nullable=False)
    abilitato = Column(Boolean, nullable=False, default=True, server_default='true')

    __table_args__ = (
        UniqueConstraint("organizzazione_id", "ruolo", "permesso", name="uq_permessi_org_ruolo_permesso"),
    )


class MovimentoMagazzino(Base):
    __tablename__ = "movimenti_magazzino"

    id = Column(Integer, primary_key=True, index=True)
    articolo_id = Column(Integer, ForeignKey("articoli.id"), nullable=False, index=True)
    tipo = Column(String(20), nullable=False)
    quantita = Column(Integer, nullable=False)
    riferimento_ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=True)
    note = Column(Text, nullable=True)
    creato_da = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    articolo = relationship("Articolo", back_populates="movimenti")


class TicketChiusura(Base):
    __tablename__ = "ticket_chiusure"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), unique=True, nullable=False, index=True)
    data_inizio = Column(Date, nullable=True)
    ora_inizio = Column(String(10), nullable=True)
    data_fine = Column(Date, nullable=True)
    ora_fine = Column(String(10), nullable=True)
    esito = Column(String(50), nullable=True)
    tecnico_nome = Column(String(200), nullable=True)
    note_chiusura = Column(Text, nullable=True)
    parti_json = Column(Text, nullable=True)
    prestazioni_json = Column(Text, nullable=True)
    documenti_json = Column(Text, nullable=True)  # JSON: [{nome, path}, ...]
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    ticket = relationship("Ticket", back_populates="chiusura")


class Evento(Base):
    __tablename__ = "eventi"

    id = Column(Integer, primary_key=True, index=True)
    titolo = Column(String(200), nullable=False)
    descrizione = Column(Text, nullable=True)
    data_inizio = Column(Date, nullable=False)
    ora_inizio = Column(String(5), nullable=True)
    data_fine = Column(Date, nullable=False)
    ora_fine = Column(String(5), nullable=True)
    tutto_il_giorno = Column(Boolean, nullable=False, default=False)
    condiviso = Column(Boolean, nullable=False, default=False)
    colore = Column(String(20), nullable=True, default='#4285f4')
    organizzazione_id = Column(Integer, ForeignKey("organizzazioni.id", ondelete="CASCADE"), nullable=False, index=True)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    creator = relationship("User", foreign_keys=[created_by])


class EmailSmtpConfig(Base):
    __tablename__ = "email_smtp_config"

    id = Column(Integer, primary_key=True, index=True)
    organizzazione_id = Column(Integer, ForeignKey("organizzazioni.id", ondelete="CASCADE"), unique=True, nullable=True)
    enabled = Column(Boolean, default=False, nullable=False)
    host = Column(String(200), nullable=True)
    port = Column(Integer, default=587)
    username = Column(String(200), nullable=True)
    password = Column(String(500), nullable=True)
    from_email = Column(String(200), nullable=True)
    from_name = Column(String(200), nullable=True)
    use_tls = Column(Boolean, default=True)
    use_ssl = Column(Boolean, default=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class EmailNotificaEvento(Base):
    __tablename__ = "email_notifica_eventi"

    id = Column(Integer, primary_key=True, index=True)
    organizzazione_id = Column(Integer, ForeignKey("organizzazioni.id", ondelete="CASCADE"), nullable=False, index=True)
    evento = Column(String(100), nullable=False)
    abilitato = Column(Boolean, default=False, nullable=False)
    destinatari = Column(Text, nullable=True)   # email separate da virgola

    __table_args__ = (
        UniqueConstraint("organizzazione_id", "evento", name="uq_email_evento_org"),
    )


class Notifica(Base):
    __tablename__ = "notifiche"

    id = Column(Integer, primary_key=True, index=True)
    organizzazione_id = Column(Integer, ForeignKey("organizzazioni.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    tipo = Column(String(50), nullable=False)           # nuovo_ticket, stato_cambiato, assegnazione, ticket_chiuso
    titolo = Column(String(255), nullable=False)
    messaggio = Column(Text, nullable=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id", ondelete="SET NULL"), nullable=True)
    letta = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, server_default=func.now())


# ── Contabilità ───────────────────────────────────────────────────────────────

class Fattura(Base):
    __tablename__ = "fatture"

    id                = Column(Integer, primary_key=True, index=True)
    numero            = Column(String(20), nullable=False, unique=True)
    organizzazione_id = Column(Integer, ForeignKey("organizzazioni.id", ondelete="SET NULL"), nullable=True, index=True)
    data_emissione    = Column(Date, nullable=False)
    data_scadenza     = Column(Date, nullable=True)
    stato             = Column(String(20), nullable=False, default="bozza")
    importo_totale    = Column(Integer, nullable=False, default=0)   # centesimi
    note              = Column(Text, nullable=True)
    created_at        = Column(DateTime, server_default=func.now())
    updated_at        = Column(DateTime, server_default=func.now(), onupdate=func.now())

    organizzazione = relationship("Organizzazione")
    voci           = relationship("FatturaVoce", back_populates="fattura",
                                  cascade="all, delete-orphan", order_by="FatturaVoce.id")
    pagamenti      = relationship("Pagamento", back_populates="fattura",
                                  cascade="all, delete-orphan", order_by="Pagamento.data_pagamento")


class FatturaVoce(Base):
    __tablename__ = "fattura_voci"

    id              = Column(Integer, primary_key=True, index=True)
    fattura_id      = Column(Integer, ForeignKey("fatture.id", ondelete="CASCADE"), nullable=False, index=True)
    descrizione     = Column(String(300), nullable=False)
    quantita        = Column(Integer, nullable=False, default=1)
    prezzo_unitario = Column(Integer, nullable=False, default=0)   # centesimi
    importo         = Column(Integer, nullable=False, default=0)   # quantita * prezzo_unitario
    created_at      = Column(DateTime, server_default=func.now())

    fattura = relationship("Fattura", back_populates="voci")


class Pagamento(Base):
    __tablename__ = "pagamenti"

    id             = Column(Integer, primary_key=True, index=True)
    fattura_id     = Column(Integer, ForeignKey("fatture.id", ondelete="CASCADE"), nullable=False, index=True)
    data_pagamento = Column(Date, nullable=False)
    importo        = Column(Integer, nullable=False)   # centesimi
    metodo         = Column(String(20), nullable=False, default="bonifico")
    note           = Column(Text, nullable=True)
    created_at     = Column(DateTime, server_default=func.now())

    fattura = relationship("Fattura", back_populates="pagamenti")


# ── Modulo Commerciale ─────────────────────────────────────────────────────────

class CategoriaServizio(str, enum.Enum):
    prodotto = "prodotto"
    servizio = "servizio"

class TipoFatturazione(str, enum.Enum):
    una_tantum = "una_tantum"
    mensile = "mensile"
    trimestrale = "trimestrale"
    semestrale = "semestrale"
    annuale = "annuale"

class StatoContratto(str, enum.Enum):
    attivo = "attivo"
    sospeso = "sospeso"
    scaduto = "scaduto"
    annullato = "annullato"

class Servizio(Base):
    __tablename__ = "servizi"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(200), nullable=False, index=True)
    descrizione = Column(Text, nullable=True)
    categoria = Column(Enum(CategoriaServizio), nullable=False, default=CategoriaServizio.servizio)
    tipo_fatturazione = Column(Enum(TipoFatturazione), nullable=False, default=TipoFatturazione.una_tantum)
    prezzo = Column(Integer, nullable=True)  # in centesimi
    unita = Column(String(50), nullable=True)  # es: "licenze", "utenti", "GB"
    attivo = Column(Boolean, default=True)
    # Identificazione prodotto
    codice_sku = Column(String(100), nullable=True)
    marca = Column(String(100), nullable=True)
    modello = Column(String(200), nullable=True)
    numero_seriale = Column(String(200), nullable=True)
    numero_licenza = Column(String(200), nullable=True)
    # Acquisto e garanzia
    fornitore = Column(String(200), nullable=True)
    data_acquisto = Column(Date, nullable=True)
    garanzia_scadenza = Column(Date, nullable=True)
    # Extra
    url_documentazione = Column(String(500), nullable=True)
    note_tecniche = Column(Text, nullable=True)
    organizzazione_id = Column(Integer, ForeignKey("organizzazioni.id"), nullable=True, index=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    contratti = relationship("ContrattoServizio", back_populates="servizio")

class ContrattoServizio(Base):
    __tablename__ = "contratti_servizi"
    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("clienti_diretti.id"), nullable=False, index=True)
    servizio_id = Column(Integer, ForeignKey("servizi.id"), nullable=False, index=True)
    data_inizio = Column(Date, nullable=False)
    data_scadenza = Column(Date, nullable=True)
    prezzo_override = Column(Integer, nullable=True)  # in centesimi
    stato = Column(Enum(StatoContratto), nullable=False, default=StatoContratto.attivo)
    note = Column(Text, nullable=True)
    rinnovo_automatico = Column(Boolean, default=False)
    organizzazione_id = Column(Integer, ForeignKey("organizzazioni.id"), nullable=True, index=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    cliente = relationship("ClienteDiretto", back_populates="contratti")
    servizio = relationship("Servizio", back_populates="contratti")


class RegistrazioneContabile(Base):
    """Registrazioni contabili per organizzazione — alimentate da ticket e contratti."""
    __tablename__ = "registrazioni_contabili"

    id                       = Column(Integer, primary_key=True, index=True)
    organizzazione_id        = Column(Integer, ForeignKey("organizzazioni.id", ondelete="CASCADE"), nullable=False, index=True)
    tipo                     = Column(String(20), nullable=False, default="manuale")  # ticket | servizio | manuale
    riferimento_ticket_id    = Column(Integer, ForeignKey("tickets.id", ondelete="SET NULL"), nullable=True, index=True)
    riferimento_contratto_id = Column(Integer, ForeignKey("contratti_servizi.id", ondelete="SET NULL"), nullable=True, index=True)
    cliente_nome             = Column(String(200), nullable=True)
    descrizione              = Column(String(300), nullable=False)
    importo                  = Column(Integer, nullable=False, default=0)   # centesimi
    data_competenza          = Column(Date, nullable=False)
    stato                    = Column(String(20), nullable=False, default="emessa")  # emessa | incassata | annullata
    note                     = Column(Text, nullable=True)
    created_at               = Column(DateTime, server_default=func.now())
    updated_at               = Column(DateTime, server_default=func.now(), onupdate=func.now())

    ticket   = relationship("Ticket",           foreign_keys=[riferimento_ticket_id])
    contratto = relationship("ContrattoServizio", foreign_keys=[riferimento_contratto_id])

    __table_args__ = (
        Index("ix_reg_contabili_org_data", "organizzazione_id", "data_competenza"),
    )


class StatoVendita(str, enum.Enum):
    preventivo = "preventivo"
    confermata = "confermata"
    consegnata = "consegnata"
    annullata  = "annullata"


class VenditaProdotto(Base):
    """Vendita di un prodotto/servizio una-tantum a un cliente diretto."""
    __tablename__ = "vendite_prodotti"

    id                       = Column(Integer, primary_key=True, index=True)
    organizzazione_id        = Column(Integer, ForeignKey("organizzazioni.id", ondelete="CASCADE"), nullable=False, index=True)
    cliente_id               = Column(Integer, ForeignKey("clienti_diretti.id", ondelete="SET NULL"), nullable=True, index=True)
    cliente_nome             = Column(String(200), nullable=True)          # snapshot al momento della vendita
    servizio_id              = Column(Integer, ForeignKey("servizi.id", ondelete="SET NULL"), nullable=True)
    prodotto_nome            = Column(String(200), nullable=False)         # snapshot nome prodotto
    quantita                 = Column(Integer, nullable=False, default=1)
    prezzo_unitario          = Column(Integer, nullable=False, default=0)  # centesimi
    sconto_pct               = Column(Integer, nullable=True, default=0)   # 0-100
    totale                   = Column(Integer, nullable=False, default=0)  # centesimi
    data_vendita             = Column(Date, nullable=False)
    stato                    = Column(Enum(StatoVendita), nullable=False, default=StatoVendita.preventivo, index=True)
    note                     = Column(Text, nullable=True)
    registrazione_contabile_id = Column(Integer, ForeignKey("registrazioni_contabili.id", ondelete="SET NULL"), nullable=True)
    created_at               = Column(DateTime, server_default=func.now())
    updated_at               = Column(DateTime, server_default=func.now(), onupdate=func.now())

    cliente       = relationship("ClienteDiretto", foreign_keys=[cliente_id])
    servizio      = relationship("Servizio", foreign_keys=[servizio_id])
    registrazione = relationship("RegistrazioneContabile", foreign_keys=[registrazione_contabile_id])


class FaseOpportunita(str, enum.Enum):
    lead = "lead"
    qualifica = "qualifica"
    proposta = "proposta"
    negoziazione = "negoziazione"
    vinto = "vinto"
    perso = "perso"


class Opportunita(Base):
    __tablename__ = "opportunita"

    id = Column(Integer, primary_key=True, index=True)
    titolo = Column(String(200), nullable=False, index=True)
    cliente_id = Column(Integer, ForeignKey("clienti_diretti.id"), nullable=True, index=True)
    cliente_nome_libero = Column(String(200), nullable=True)  # testo libero se non è un cliente diretto
    valore = Column(Integer, nullable=True)          # in centesimi
    fase = Column(Enum(FaseOpportunita), nullable=False, default=FaseOpportunita.lead, index=True)
    probabilita = Column(Integer, nullable=True)     # 0–100
    data_chiusura_prevista = Column(Date, nullable=True)
    assegnato_a = Column(Integer, ForeignKey("users.id"), nullable=True)
    note = Column(Text, nullable=True)
    motivo_perdita = Column(Text, nullable=True)
    organizzazione_id = Column(Integer, ForeignKey("organizzazioni.id"), nullable=True, index=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    cliente = relationship("ClienteDiretto")
    assegnato = relationship("User", foreign_keys=[assegnato_a])


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id            = Column(Integer, primary_key=True, index=True)
    timestamp     = Column(DateTime, server_default=func.now(), nullable=False, index=True)
    user_id       = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    user_nome     = Column(String(200), nullable=True)
    user_ruolo    = Column(String(50),  nullable=True)
    organizzazione_id   = Column(Integer, ForeignKey("organizzazioni.id", ondelete="SET NULL"), nullable=True, index=True)
    organizzazione_nome = Column(String(200), nullable=True)
    azione        = Column(String(100), nullable=False, index=True)
    risorsa_tipo  = Column(String(50),  nullable=True)
    risorsa_id    = Column(String(100), nullable=True)
    dettagli      = Column(JSON, nullable=True)
    ip_address    = Column(String(45),  nullable=True)
