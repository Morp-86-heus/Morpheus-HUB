# QUICK START — Come usare questi file con Claude Code

## 1. Apri VS Code nella cartella `ticket-app/`

```bash
code ticket-app/
```

## 2. Avvia Claude Code nel terminale

```bash
claude
```

## 3. Copia il file Excel nella cartella data/

```bash
mkdir -p data
cp /percorso/al/tuo/Interventi_Tecnici.xlsm data/
```

## 4. Prompt iniziale da dare a Claude Code

Incolla questo messaggio a Claude Code:

---

> Leggi il file `CLAUDE.md` e `DATA_REFERENCE.md` in questa cartella. Devi costruire l'intera applicazione descritta, seguendo esattamente la struttura, il modello dati e le API indicate. Procedi in ordine dalla sequenza di build nel CLAUDE.md. Crea tutti i file necessari. Alla fine deve essere possibile lanciare `docker compose up --build` e avere l'app funzionante su http://morpheusrmm.tplinkdns.com/:13000 con il backend su http://localhost:18000.

---

## 5. Dopo che Claude Code ha generato tutto

```bash
# Lancia i container
docker compose up --build -d

# Aspetta che il DB sia pronto (~10 secondi), poi importa i dati storici
docker compose exec backend python scripts/import_excel.py

# Apri il browser
open http://localhost:3000
```

## 6. Comandi utili durante lo sviluppo

```bash
# Vedere i log in tempo reale
docker compose logs -f

# Riavviare solo il backend dopo modifiche
docker compose restart backend

# Accedere al DB
docker compose exec db psql -U tickets -d tickets

# Fermare tutto
docker compose down

# Fermare e cancellare anche i dati
docker compose down -v
```

## 7. Struttura finale attesa

```
ticket-app/
├── CLAUDE.md              ← hai già questo
├── DATA_REFERENCE.md      ← hai già questo
├── QUICKSTART.md          ← hai già questo
├── docker-compose.yml     ← generato da Claude Code
├── .env.example           ← generato da Claude Code
├── backend/               ← generato da Claude Code
├── frontend/              ← generato da Claude Code
└── data/
    └── Interventi_Tecnici.xlsm  ← copiato da te
```
