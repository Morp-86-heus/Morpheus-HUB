# Ticket Management App — Istruzioni per Claude Code

## Obiettivo
Costruire una web app fullstack dockerizzata per gestire i ticket di assistenza tecnica, in sostituzione del file Excel `Interventi_Tecnici.xlsm`. L'app deve importare i dati storici dall'Excel e permettere di gestire il ciclo di vita dei ticket in modo moderno, rapido e collaborativo.

---

## Stack tecnologico

| Layer | Tecnologia |
|-------|-----------|
| Backend | **FastAPI** (Python 3.12) |
| Database | **PostgreSQL 16** |
| ORM | **SQLAlchemy 2 + Alembic** |
| Frontend | **React 18 + Vite + TailwindCSS** |
| Containerizzazione | **Docker + Docker Compose** |
| Import dati | Script Python con `pandas` + `openpyxl` |

---

## Struttura del progetto

```
ticket-app/
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── main.py                  # FastAPI app entry point
│   ├── database.py              # SQLAlchemy engine + session
│   ├── models.py                # ORM models
│   ├── schemas.py               # Pydantic schemas
│   ├── routers/
│   │   ├── tickets.py           # CRUD tickets
│   │   ├── tecnici.py           # Anagrafica tecnici
│   │   ├── lookup.py            # Commitenti, clienti, stati
│   │   └── stats.py             # Dashboard e statistiche
│   ├── alembic/                 # Migrazioni DB
│   └── scripts/
│       └── import_excel.py      # Script import storico Excel
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── api/
│       │   └── client.js        # Axios client verso FastAPI
│       ├── components/
│       │   ├── TicketTable.jsx
│       │   ├── TicketForm.jsx
│       │   ├── TicketDetail.jsx
│       │   ├── FilterBar.jsx
│       │   ├── Dashboard.jsx
│       │   ├── SLABadge.jsx
│       │   └── Navbar.jsx
│       └── pages/
│           ├── HomePage.jsx
│           ├── TicketsPage.jsx
│           ├── NewTicketPage.jsx
│           └── StatsPage.jsx
└── data/
    └── Interventi_Tecnici.xlsm  # File da importare (copiare qui)
```

---

## Modello dati (Database)

### Tabella `tickets` — Foglio1 dell'Excel

| Colonna Excel | Campo DB | Tipo | Note |
|---|---|---|---|
| COMMITENTE | commitente | VARCHAR(100) | FK lookup |
| CLIENTE | cliente | VARCHAR(100) | |
| NR INT | nr_intervento | VARCHAR(100) | identificativo ticket (può essere numerico o alfanumerico) |
| UTENTE | utente | VARCHAR(200) | nome utente finale |
| CITTA' | citta | VARCHAR(200) | |
| SLA | sla_scadenza | TIMESTAMP | deadline SLA |
| LDV | ldv | TEXT | note spedizione/logistica |
| STATO | stato | VARCHAR(50) | enum: vedi sotto |
| NOTE | note | TEXT | |
| DATA GESTIONE | data_gestione | DATE | data di presa in carico |
| TECNICO | tecnico | VARCHAR(100) | FK lookup |
| REGISTRATA | registrata | BOOLEAN | SI/NO → true/false |
| — | created_at | TIMESTAMP | auto |
| — | updated_at | TIMESTAMP | auto |

**Stati ticket (enum):**
- `In gestione`
- `Attesa parti`
- `Sospesa`
- `Chiusa`
- `Annullata`

### Tabella `lookup_commitenti`
Valori: BPP, FaTi, Intranet, MaintSystem, Pugliamaint, SaciGroup, IROS, EnterpriseElectric, ITech, Erdtech, PCM, Infoservizi, NuoviOrizzonti, NBDServiceSolution

### Tabella `lookup_clienti`
Valori da Foglio2: SOGEI, VARGroup, Generali, Global Starnet, Romagna Giochi, 4Infinity, Brother, Konica, Lexmark, Toshiba, GBR Rossetto, Massinelli, Moro Informatica, Copying, Land, Brevi, Prink, Sapi, Pace, MPF, Proced, InRete, Kratos, FastRent, Xerox, Altinia, ComputerGross, Myo, Giustacchini, Npo Sistemi, Coop, Iliad, Intesa, Canon, BPM, BDF, Fastweb, Goldbet, HBG, Lottomatica, Westpole, Novomatic, Orange, MaticMind, Cegeka, Fenice, Asus, Banca Sella, SMI, Pia Fondazione, CSC, Enterprise, RFI, Infordata, Italware, Solari, Nolecom, Ingram_Micro, Bassilichi, MPS, GEKO, DieboldNixdorf, NCR

### Tabella `lookup_tecnici`
Valori: Antonio Sp, Germano, Mauro, Riccardo, I-Tech, Cripezzi, Paolo, Pierluigi, Carlo, Fabio, Stefano, Antonio Si, Pugliamaint, Nino, Francesco, Montagna

---

## API REST (FastAPI)

### Tickets — `/api/tickets`

```
GET    /api/tickets              # Lista con filtri e paginazione
POST   /api/tickets              # Crea nuovo ticket
GET    /api/tickets/{id}         # Dettaglio singolo ticket
PUT    /api/tickets/{id}         # Aggiorna ticket
DELETE /api/tickets/{id}         # Elimina ticket
GET    /api/tickets/export/excel # Esporta filtro corrente in Excel
```

**Query params per GET /api/tickets:**
- `stato` (multiplo)
- `commitente`
- `cliente`
- `tecnico`
- `data_da` / `data_a` (range DATA GESTIONE)
- `sla_scaduta` (bool — mostra solo ticket con SLA scaduta)
- `search` (full-text su nr_intervento, utente, note, citta)
- `page` / `page_size` (default 50)
- `order_by` / `order_dir`

### Stats — `/api/stats`

```
GET /api/stats/dashboard         # KPI principali
GET /api/stats/per-tecnico       # Ticket per tecnico
GET /api/stats/per-stato         # Ticket per stato
GET /api/stats/sla-compliance    # % rispetto SLA
GET /api/stats/trend-mensile     # Ticket per mese
```

### Lookup — `/api/lookup`

```
GET /api/lookup/commitenti
GET /api/lookup/clienti
GET /api/lookup/tecnici
GET /api/lookup/stati
```

---

## Frontend — Funzionalità

### Pagina principale / Dashboard
- KPI cards: Ticket aperti, In gestione, Attesa parti, Sospesi
- Grafico trend mensile (ultimi 12 mesi)
- Ticket con SLA in scadenza oggi / già scaduta (alert rosso)
- Top tecnici per ticket aperti

### Pagina Tickets
- Tabella con tutte le colonne dell'Excel
- Colonna SLA con semaforo colorato:
  - 🔴 Rosso: SLA scaduta
  - 🟡 Giallo: SLA entro 24h
  - 🟢 Verde: SLA ok
  - ⚪ Grigio: SLA non impostata
- Filtri rapidi per stato (bottoni toggle)
- Barra ricerca full-text
- Filtri avanzati (commitente, cliente, tecnico, range date)
- Click su riga → apre pannello laterale con dettaglio
- Pulsante "Nuovo Ticket"
- Pulsante "Esporta Excel"

### Form Nuovo / Modifica Ticket
- Tutti i campi dell'Excel come form
- Dropdown con valori dai lookup (commitente → filtra clienti relativi)
- Campo NR INT libero (può essere numerico o alfanumerico)
- Campo SLA con datetime picker
- Campo STATO con dropdown colorato
- Tasto salva con validazione

### Pagina Statistiche
- Grafico a barre: ticket per tecnico
- Grafico a torta: distribuzione stati
- Grafico linee: trend mensile
- Tabella compliance SLA per commitente

---

## Script import Excel (`backend/scripts/import_excel.py`)

Lo script deve:
1. Leggere `data/Interventi_Tecnici.xlsm` con pandas
2. Popolare le tabelle lookup (commitenti, clienti, tecnici, stati)
3. Importare tutti i 4640 ticket del Foglio1
4. Gestire i tipi misti di NR INT (numeri interi, stringhe alfanumeriche)
5. Convertire il campo REGISTRATA da "SI"/None a boolean
6. Gestire le date None/NaT senza errori
7. Loggarsi con progress bar (tqdm)
8. Essere idempotente (non duplica se rieseguito)

**Mappatura Foglio2 → lookup:**
Il Foglio2 ha righe dove:
- Colonne A–U = clienti del commitente (riga)
- Colonna W = tecnico principale
- Colonna X = stati

La struttura reale è:
```
Row 1: BPP → [nessun cliente specifico] | Tecnico: Antonio Sp | Stato: Attesa parti
Row 2: FaTi → SOGEI, VARGroup, Generali | Tecnico: Germano | Stato: In gestione
Row 3: Intranet → Global Starnet, Romagna Giochi, 4Infinity | Tecnico: Mauro | Stato: Sospesa
Row 4: MaintSystem → Brother, Konica, Lexmark, Toshiba, ... | Tecnico: Riccardo | Stato: Chiusa
Row 5: Pugliamaint → Coop, Iliad, Intesa, Canon, BPM | Tecnico: I-Tech | Stato: Annullata
Row 6: SaciGroup → BDF, Fastweb, Goldbet, HBG, Lottomatica, ... | Tecnico: Cripezzi
Row 7: IROS → Pia Fondazione | Tecnico: Paolo
Row 8: EnterpriseElectric → CSC | Tecnico: Pierluigi
Row 9: ITech → Enterprise | Tecnico: Pugliamaint
Row 10: Erdtech → RFI | Tecnico: Carlo
Row 11: PCM → Infordata, Italware, Solari, Nolecom, ... | Tecnico: Fabio
Row 12: Infoservizi → [nessuno] | Tecnico: Montagna
Row 13: NuoviOrizzonti → DieboldNixdorf
Row 14: NBDServiceSolution → NCR
```

---

## Docker Compose

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: tickets
      POSTGRES_USER: tickets
      POSTGRES_PASSWORD: tickets
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql://tickets:tickets@db:5432/tickets
    depends_on:
      - db
    volumes:
      - ./data:/app/data  # per accesso al file Excel

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  postgres_data:
```

---

## Sequenza di build

Claude Code deve procedere in questo ordine:

1. **Creare la struttura cartelle**
2. **`docker-compose.yml`** e **`.env.example`**
3. **`backend/models.py`** — definizione ORM
4. **`backend/database.py`** — engine SQLAlchemy
5. **`backend/schemas.py`** — Pydantic v2
6. **`backend/routers/`** — tutti i router FastAPI
7. **`backend/main.py`** — app FastAPI con CORS
8. **`backend/scripts/import_excel.py`** — import storico
9. **`backend/Dockerfile`** e **`backend/requirements.txt`**
10. **`frontend/src/`** — tutti i componenti React
11. **`frontend/Dockerfile`** e **`frontend/package.json`**
12. **Alembic**: inizializzare e creare prima migrazione

---

## Requisiti non funzionali

- CORS configurato per `http://localhost:3000`
- Tutti gli endpoint paginati con `total`, `page`, `page_size`, `items` nella risposta
- Gestione errori con HTTPException appropriati (404, 422, 500)
- Indici PostgreSQL su: `stato`, `tecnico`, `commitente`, `data_gestione`, `sla_scadenza`
- Backend in modalità `--reload` in sviluppo
- Frontend con proxy Vite verso `http://backend:8000`
