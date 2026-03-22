import re
from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, EmailStr, field_validator
from models import RuoloEnum


def _check_password_policy(v: str) -> str:
    errors = []
    if len(v) < 8:
        errors.append("almeno 8 caratteri")
    if not re.search(r"[A-Z]", v):
        errors.append("almeno una lettera maiuscola")
    if not re.search(r"[0-9]", v):
        errors.append("almeno un numero")
    if not re.search(r"[^A-Za-z0-9]", v):
        errors.append("almeno un carattere speciale")
    if errors:
        raise ValueError("La password deve contenere: " + ", ".join(errors))
    return v


# ── Organizzazioni ─────────────────────────────────────────────────────────────
class OrganizzazioneAnagrafica(BaseModel):
    """Campi anagrafica + fatturazione modificabili."""
    nome: Optional[str] = None
    descrizione: Optional[str] = None
    attivo: Optional[bool] = None
    # Dati legali
    ragione_sociale: Optional[str] = None
    forma_giuridica: Optional[str] = None
    partita_iva: Optional[str] = None
    codice_fiscale: Optional[str] = None
    # Sede legale
    via: Optional[str] = None
    civico: Optional[str] = None
    cap: Optional[str] = None
    citta: Optional[str] = None
    provincia: Optional[str] = None
    regione: Optional[str] = None
    # Contatti
    telefono: Optional[str] = None
    email: Optional[str] = None
    pec: Optional[str] = None
    sito_web: Optional[str] = None
    # Referente
    referente_nome: Optional[str] = None
    referente_ruolo: Optional[str] = None
    referente_telefono: Optional[str] = None
    referente_email: Optional[str] = None
    # Fatturazione
    regime_fiscale: Optional[str] = None
    codice_sdi: Optional[str] = None
    pec_fatturazione: Optional[str] = None
    iban: Optional[str] = None
    banca: Optional[str] = None
    intestatario_conto: Optional[str] = None
    note_fatturazione: Optional[str] = None


class OrganizzazioneCreate(BaseModel):
    nome: str
    descrizione: Optional[str] = None


class OrganizzazioneUpdate(OrganizzazioneAnagrafica):
    pass


class TrialPayload(BaseModel):
    durata_giorni: int = 30


class LicenzaPayload(BaseModel):
    piano: Optional[str] = None          # 'base', 'professional', 'enterprise'
    licenza_scadenza: Optional[datetime] = None   # None = perpetua
    note_licenza: Optional[str] = None


class OrganizzazioneOut(OrganizzazioneAnagrafica):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nome: str
    attivo: bool
    # Licenza
    piano: Optional[str] = None
    licenza_attiva: bool = False
    trial_attivato: bool = False
    trial_scadenza: Optional[datetime] = None
    licenza_scadenza: Optional[datetime] = None
    note_licenza: Optional[str] = None
    stato_licenza: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# Ticket Chiusura schemas (defined early so TicketOut can reference TicketChiusuraOut)
class ParteSostituita(BaseModel):
    # Parte guasta (rimossa)
    descrizione: str
    modello: Optional[str] = None
    seriale: Optional[str] = None
    tipo: Optional[str] = None
    difetto: Optional[str] = None
    parte_ritirata: bool = False
    parte_da_riparare: bool = False

    # Ricambio installato
    ricambio_descrizione: Optional[str] = None
    ricambio_modello: Optional[str] = None
    ricambio_seriale: Optional[str] = None
    ricambio_articolo_id: Optional[int] = None


class PrestazioneSelezionata(BaseModel):
    voce_id: Optional[int] = None
    descrizione: str
    prezzo: Optional[str] = None
    unita_misura: Optional[str] = None
    quantita: float = 1.0


class DocumentoAllegato(BaseModel):
    nome: str
    dataUrl: str  # base64 data URL — convertito in file dal backend


class DocumentiSalvaPayload(BaseModel):
    documenti: List[DocumentoAllegato]


class TicketChiusuraCreate(BaseModel):
    data_inizio: Optional[date] = None
    ora_inizio: Optional[str] = None
    data_fine: Optional[date] = None
    ora_fine: Optional[str] = None
    esito: Optional[str] = None
    tecnico_nome: Optional[str] = None
    note_chiusura: Optional[str] = None
    parti: Optional[List[ParteSostituita]] = None
    prestazioni: Optional[List[PrestazioneSelezionata]] = None
    documenti: Optional[List[DocumentoAllegato]] = None


class TicketChiusuraOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ticket_id: int
    data_inizio: Optional[date] = None
    ora_inizio: Optional[str] = None
    data_fine: Optional[date] = None
    ora_fine: Optional[str] = None
    esito: Optional[str] = None
    tecnico_nome: Optional[str] = None
    note_chiusura: Optional[str] = None
    parti_json: Optional[str] = None
    prestazioni_json: Optional[str] = None
    documenti_json: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class TicketBase(BaseModel):
    commitente: Optional[str] = None
    cliente: Optional[str] = None
    nr_intervento: Optional[str] = None
    utente: Optional[str] = None
    citta: Optional[str] = None
    sla_scadenza: Optional[datetime] = None
    ldv: Optional[str] = None
    stato: Optional[str] = "In gestione"
    note: Optional[str] = None
    data_gestione: Optional[date] = None
    tecnico: Optional[str] = None
    nr_progressivo: Optional[int] = None
    dispositivo: Optional[str] = None
    note_intervento: Optional[str] = None
    importo: Optional[str] = None


class TicketCreate(TicketBase):
    pass


class TicketUpdate(TicketBase):
    pass


class TicketOut(TicketBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organizzazione_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    chiusura: Optional[TicketChiusuraOut] = None


class PaginatedTickets(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[TicketOut]


class LookupCommitente(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nome: str


class CommitenteFull(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nome: str
    partita_iva: Optional[str] = None
    codice_fiscale: Optional[str] = None
    via: Optional[str] = None
    civico: Optional[str] = None
    cap: Optional[str] = None
    citta: Optional[str] = None
    provincia: Optional[str] = None
    regione: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    pec: Optional[str] = None
    sito_web: Optional[str] = None
    referente_nome: Optional[str] = None
    referente_ruolo: Optional[str] = None
    referente_telefono: Optional[str] = None
    referente_email: Optional[str] = None
    note: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class CommitentePatch(BaseModel):
    nome: Optional[str] = None
    partita_iva: Optional[str] = None
    codice_fiscale: Optional[str] = None
    via: Optional[str] = None
    civico: Optional[str] = None
    cap: Optional[str] = None
    citta: Optional[str] = None
    provincia: Optional[str] = None
    regione: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    pec: Optional[str] = None
    sito_web: Optional[str] = None
    referente_nome: Optional[str] = None
    referente_ruolo: Optional[str] = None
    referente_telefono: Optional[str] = None
    referente_email: Optional[str] = None
    note: Optional[str] = None


class LookupCliente(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nome: str
    commitente: Optional[str] = None


class LookupTecnico(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nome: str


class DashboardStats(BaseModel):
    totale_aperti: int
    in_gestione: int
    attesa_parti: int
    sospesi: int
    sla_scadute: int
    sla_in_scadenza_oggi: int
    chiusi: int
    annullati: int


class StatPerTecnico(BaseModel):
    tecnico: Optional[str]
    totale: int
    aperti: int


class StatPerStato(BaseModel):
    stato: Optional[str]
    totale: int


class SlaCompliance(BaseModel):
    commitente: Optional[str]
    totale: int
    rispettati: int
    violati: int
    compliance_pct: float


class TrendMensile(BaseModel):
    mese: str
    totale: int


# SedeClienteDiretto schemas
class SedeClienteDirettoBase(BaseModel):
    nome: Optional[str] = None
    via: Optional[str] = None
    civico: Optional[str] = None
    cap: Optional[str] = None
    citta: Optional[str] = None
    provincia: Optional[str] = None
    telefono: Optional[str] = None
    referente_nome: Optional[str] = None
    referente_telefono: Optional[str] = None
    referente_email: Optional[str] = None
    note: Optional[str] = None

class SedeClienteDirettoCreate(SedeClienteDirettoBase):
    pass

class SedeClienteDirettoUpdate(SedeClienteDirettoBase):
    pass

class SedeClienteDirettoOut(SedeClienteDirettoBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


# ClienteDiretto schemas
class ClienteDirettoBase(BaseModel):
    ragione_sociale: str
    partita_iva: Optional[str] = None
    codice_fiscale: Optional[str] = None
    via: Optional[str] = None
    civico: Optional[str] = None
    cap: Optional[str] = None
    citta: Optional[str] = None
    provincia: Optional[str] = None
    regione: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    pec: Optional[str] = None
    sito_web: Optional[str] = None
    referente_nome: Optional[str] = None
    referente_ruolo: Optional[str] = None
    referente_telefono: Optional[str] = None
    referente_email: Optional[str] = None
    note: Optional[str] = None


class ClienteDirettoCreate(ClienteDirettoBase):
    pass


class ClienteDirettoUpdate(ClienteDirettoBase):
    ragione_sociale: Optional[str] = None


class ClienteDirettoOut(ClienteDirettoBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    sedi: List['SedeClienteDirettoOut'] = []


class TicketOutWithChiusura(TicketOut):
    pass


# ── Listini prezzi ────────────────────────────────────────────────────────────
class ListinoVoceCreate(BaseModel):
    descrizione: str
    prezzo: Optional[str] = None
    unita_misura: Optional[str] = None


class ListinoVoceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    listino_id: int
    descrizione: str
    prezzo: Optional[str] = None
    unita_misura: Optional[str] = None


class ListinoCreate(BaseModel):
    commitente: str
    nome: str
    note: Optional[str] = None


class ListinoUpdate(BaseModel):
    nome: Optional[str] = None
    note: Optional[str] = None


class ListinoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    commitente: str
    nome: str
    note: Optional[str] = None
    voci: List[ListinoVoceOut] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ── Magazzino ─────────────────────────────────────────────────────────────────
class MovimentoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    articolo_id: int
    tipo: str
    quantita: int
    riferimento_ticket_id: Optional[int] = None
    note: Optional[str] = None
    creato_da: Optional[int] = None
    created_at: Optional[datetime] = None


class MovimentoCreate(BaseModel):
    tipo: str
    quantita: int
    riferimento_ticket_id: Optional[int] = None
    note: Optional[str] = None


class MovimentoLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    tipo: str
    quantita: int
    note: Optional[str] = None
    riferimento_ticket_id: Optional[int] = None
    created_at: Optional[datetime] = None
    articolo_id: int
    articolo_descrizione: str
    articolo_marca: Optional[str] = None
    articolo_modello: Optional[str] = None
    articolo_seriale: Optional[str] = None
    articolo_categoria: Optional[str] = None
    articolo_commitente: Optional[str] = None
    articolo_cliente: Optional[str] = None
    creato_da_nome: Optional[str] = None


class PaginatedMovimenti(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[MovimentoLogOut]


class ArticoloCreate(BaseModel):
    commitente: str
    cliente: str
    categoria: Optional[str] = None
    marca: Optional[str] = None
    modello: Optional[str] = None
    seriale: Optional[str] = None
    cespite: Optional[str] = None
    descrizione: str
    unita_misura: Optional[str] = "pz"
    quantita_disponibile: int = 0
    quantita_minima: Optional[int] = 0
    fornitore: Optional[str] = None
    note: Optional[str] = None


class ArticoloUpdate(BaseModel):
    categoria: Optional[str] = None
    marca: Optional[str] = None
    modello: Optional[str] = None
    seriale: Optional[str] = None
    cespite: Optional[str] = None
    descrizione: Optional[str] = None
    unita_misura: Optional[str] = None
    quantita_minima: Optional[int] = None
    fornitore: Optional[str] = None
    note: Optional[str] = None


class ArticoloOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    commitente: Optional[str] = None
    cliente: Optional[str] = None
    categoria: Optional[str] = None
    marca: Optional[str] = None
    modello: Optional[str] = None
    seriale: Optional[str] = None
    cespite: Optional[str] = None
    descrizione: str
    unita_misura: Optional[str] = None
    quantita_disponibile: int
    quantita_minima: Optional[int] = None
    fornitore: Optional[str] = None
    note: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    movimenti: List[MovimentoOut] = []


# ── Auth / Utenti ──────────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    email: str
    nome: str
    cognome: Optional[str] = ""
    telefono: Optional[str] = None
    password: str
    ruolo: RuoloEnum = RuoloEnum.tecnico
    organizzazione_id: Optional[int] = None

    @field_validator("password")
    @classmethod
    def password_policy(cls, v: str) -> str:
        return _check_password_policy(v)


class UserUpdate(BaseModel):
    email: Optional[str] = None
    nome: Optional[str] = None
    cognome: Optional[str] = None
    telefono: Optional[str] = None
    password: Optional[str] = None
    ruolo: Optional[RuoloEnum] = None
    attivo: Optional[bool] = None
    organizzazione_id: Optional[int] = None

    @field_validator("password")
    @classmethod
    def password_policy(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            return _check_password_policy(v)
        return v


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    nome: str
    cognome: Optional[str] = ""
    telefono: Optional[str] = None
    nome_completo: str
    ruolo: RuoloEnum
    attivo: bool
    organizzazione_id: Optional[int] = None
    organizzazione_nome: Optional[str] = None
    org_stato_licenza: Optional[str] = None
    org_giorni_grazia_rimanenti: Optional[int] = None
    org_piano: Optional[str] = None
    created_at: Optional[datetime] = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class LoginRequest(BaseModel):
    email: str
    password: str
    remember_me: bool = False


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    password: str


# ── Servizi ────────────────────────────────────────────────────────────────────
from models import CategoriaServizio, TipoFatturazione, StatoContratto

class ServizioCreate(BaseModel):
    nome: str
    descrizione: Optional[str] = None
    categoria: CategoriaServizio = CategoriaServizio.servizio
    tipo_fatturazione: TipoFatturazione = TipoFatturazione.una_tantum
    prezzo: Optional[int] = None
    unita: Optional[str] = None
    attivo: bool = True
    # Identificazione prodotto
    codice_sku: Optional[str] = None
    marca: Optional[str] = None
    modello: Optional[str] = None
    numero_seriale: Optional[str] = None
    numero_licenza: Optional[str] = None
    # Acquisto e garanzia
    fornitore: Optional[str] = None
    data_acquisto: Optional[date] = None
    garanzia_scadenza: Optional[date] = None
    # Extra
    url_documentazione: Optional[str] = None
    note_tecniche: Optional[str] = None

class ServizioUpdate(BaseModel):
    nome: Optional[str] = None
    descrizione: Optional[str] = None
    categoria: Optional[CategoriaServizio] = None
    tipo_fatturazione: Optional[TipoFatturazione] = None
    prezzo: Optional[int] = None
    unita: Optional[str] = None
    attivo: Optional[bool] = None
    codice_sku: Optional[str] = None
    marca: Optional[str] = None
    modello: Optional[str] = None
    numero_seriale: Optional[str] = None
    numero_licenza: Optional[str] = None
    fornitore: Optional[str] = None
    data_acquisto: Optional[date] = None
    garanzia_scadenza: Optional[date] = None
    url_documentazione: Optional[str] = None
    note_tecniche: Optional[str] = None

class ServizioOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nome: str
    descrizione: Optional[str] = None
    categoria: CategoriaServizio
    tipo_fatturazione: TipoFatturazione
    prezzo: Optional[int] = None
    unita: Optional[str] = None
    attivo: bool
    codice_sku: Optional[str] = None
    marca: Optional[str] = None
    modello: Optional[str] = None
    numero_seriale: Optional[str] = None
    numero_licenza: Optional[str] = None
    fornitore: Optional[str] = None
    data_acquisto: Optional[date] = None
    garanzia_scadenza: Optional[date] = None
    url_documentazione: Optional[str] = None
    note_tecniche: Optional[str] = None
    organizzazione_id: Optional[int] = None
    created_at: Optional[datetime] = None

# ── Contratti Servizi ──────────────────────────────────────────────────────────
class ContrattoServizioCreate(BaseModel):
    cliente_id: int
    servizio_id: int
    data_inizio: date
    data_scadenza: Optional[date] = None
    prezzo_override: Optional[int] = None
    stato: StatoContratto = StatoContratto.attivo
    note: Optional[str] = None
    rinnovo_automatico: bool = False

class ContrattoServizioUpdate(BaseModel):
    data_inizio: Optional[date] = None
    data_scadenza: Optional[date] = None
    prezzo_override: Optional[int] = None
    stato: Optional[StatoContratto] = None
    note: Optional[str] = None
    rinnovo_automatico: Optional[bool] = None

class ContrattoServizioOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    cliente_id: int
    servizio_id: int
    data_inizio: date
    data_scadenza: Optional[date] = None
    prezzo_override: Optional[int] = None
    stato: StatoContratto
    note: Optional[str] = None
    rinnovo_automatico: bool
    organizzazione_id: Optional[int] = None
    created_at: Optional[datetime] = None
    # nested
    cliente_ragione_sociale: Optional[str] = None
    servizio_nome: Optional[str] = None
    servizio_categoria: Optional[CategoriaServizio] = None
    servizio_tipo_fatturazione: Optional[TipoFatturazione] = None
    prezzo_effettivo: Optional[int] = None  # prezzo_override ?? servizio.prezzo


# ── Opportunità / Funnel ───────────────────────────────────────────────────────
from models import FaseOpportunita

class OpportunitaCreate(BaseModel):
    titolo: str
    cliente_id: Optional[int] = None
    cliente_nome_libero: Optional[str] = None
    valore: Optional[int] = None          # centesimi
    fase: FaseOpportunita = FaseOpportunita.lead
    probabilita: Optional[int] = None
    data_chiusura_prevista: Optional[date] = None
    assegnato_a: Optional[int] = None
    note: Optional[str] = None
    motivo_perdita: Optional[str] = None

class OpportunitaUpdate(BaseModel):
    titolo: Optional[str] = None
    cliente_id: Optional[int] = None
    cliente_nome_libero: Optional[str] = None
    valore: Optional[int] = None
    fase: Optional[FaseOpportunita] = None
    probabilita: Optional[int] = None
    data_chiusura_prevista: Optional[date] = None
    assegnato_a: Optional[int] = None
    note: Optional[str] = None
    motivo_perdita: Optional[str] = None

class OpportunitaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    titolo: str
    cliente_id: Optional[int] = None
    cliente_nome_libero: Optional[str] = None
    cliente_nome: Optional[str] = None        # popolato dal router
    valore: Optional[int] = None
    fase: FaseOpportunita
    probabilita: Optional[int] = None
    data_chiusura_prevista: Optional[date] = None
    assegnato_a: Optional[int] = None
    assegnato_nome: Optional[str] = None      # popolato dal router
    note: Optional[str] = None
    motivo_perdita: Optional[str] = None
    organizzazione_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ── Calendario ────────────────────────────────────────────────────────────────

class EventoCreate(BaseModel):
    titolo: str
    descrizione: Optional[str] = None
    data_inizio: date
    ora_inizio: Optional[str] = None
    data_fine: date
    ora_fine: Optional[str] = None
    tutto_il_giorno: bool = False
    condiviso: bool = False
    colore: Optional[str] = '#4285f4'


class EventoUpdate(BaseModel):
    titolo: Optional[str] = None
    descrizione: Optional[str] = None
    data_inizio: Optional[date] = None
    ora_inizio: Optional[str] = None
    data_fine: Optional[date] = None
    ora_fine: Optional[str] = None
    tutto_il_giorno: Optional[bool] = None
    condiviso: Optional[bool] = None
    colore: Optional[str] = None


class EventoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    titolo: str
    descrizione: Optional[str] = None
    data_inizio: date
    ora_inizio: Optional[str] = None
    data_fine: date
    ora_fine: Optional[str] = None
    tutto_il_giorno: bool
    condiviso: bool
    colore: Optional[str] = None
    organizzazione_id: int
    created_by: int
    created_at: Optional[datetime] = None
