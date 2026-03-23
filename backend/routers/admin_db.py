import os
import subprocess
import tempfile
import gzip
import threading
import uuid
from urllib.parse import urlparse
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db
from auth import require_proprietario

# Stato dei job di import in memoria {job_id: {status, message, started_at, finished_at}}
_import_jobs: dict = {}

router = APIRouter(prefix="/api/admin/db", tags=["admin-db"])


def _parse_db_url():
    """Estrae host, port, user, password, dbname dalla DATABASE_URL."""
    url = os.getenv("DATABASE_URL", "postgresql://tickets:tickets@db:5432/tickets")
    parsed = urlparse(url)
    return {
        "host": parsed.hostname,
        "port": str(parsed.port or 5432),
        "user": parsed.username,
        "password": parsed.password or "",
        "dbname": parsed.path.lstrip("/"),
    }


def _pg_env(params: dict) -> dict:
    """Variabili d'ambiente per pg_dump / psql (include PGPASSWORD)."""
    env = os.environ.copy()
    env["PGPASSWORD"] = params["password"]
    return env


# Parametri SET introdotti in PG17+ che PG16 non riconosce
_PG17_PARAMS = {"transaction_timeout"}

def _strip_incompatible_set(sql_bytes: bytes) -> bytes:
    """Rimuove righe SET <param> = ... non supportate da PostgreSQL 16."""
    lines = sql_bytes.decode("utf-8", errors="replace").splitlines(keepends=True)
    filtered = [
        line for line in lines
        if not any(
            line.strip().lower().startswith(f"set {p}") for p in _PG17_PARAMS
        )
    ]
    return "".join(filtered).encode("utf-8")


# ── Export ────────────────────────────────────────────────────────────────────

@router.get("/export")
def export_database(_=Depends(require_proprietario)):
    """Scarica un dump completo del database in formato .sql.gz"""
    params = _parse_db_url()
    env = _pg_env(params)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"morpheushub_db_{timestamp}.sql.gz"

    cmd = [
        "pg_dump",
        "-h", params["host"],
        "-p", params["port"],
        "-U", params["user"],
        "--clean",
        "--if-exists",
        "--no-owner",
        "--no-privileges",
        params["dbname"],
    ]

    try:
        proc = subprocess.run(cmd, env=env, capture_output=True, timeout=120)
        if proc.returncode != 0:
            raise HTTPException(500, f"pg_dump fallito: {proc.stderr.decode()}")
    except subprocess.TimeoutExpired:
        raise HTTPException(500, "pg_dump: timeout superato (120s)")

    sql_bytes = _strip_incompatible_set(proc.stdout)
    gz_bytes = gzip.compress(sql_bytes, compresslevel=6)

    return StreamingResponse(
        iter([gz_bytes]),
        media_type="application/gzip",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Length": str(len(gz_bytes)),
        },
    )


# ── Import (asincrono) ────────────────────────────────────────────────────────

def _run_import(job_id: str, tmp_path: str, params: dict, env: dict):
    """Eseguito in un thread separato. Aggiorna _import_jobs con lo stato."""
    _import_jobs[job_id]["status"] = "running"
    try:
        cmd = [
            "psql",
            "-h", params["host"],
            "-p", params["port"],
            "-U", params["user"],
            "-d", params["dbname"],
            "-f", tmp_path,
            "--single-transaction",
            "-v", "ON_ERROR_STOP=1",
        ]
        proc = subprocess.run(cmd, env=env, capture_output=True, timeout=1800)
        if proc.returncode != 0:
            error = proc.stderr.decode(errors="replace")[:1000]
            _import_jobs[job_id].update(status="error", message=error)
            return

        # Migrazioni pendenti
        alembic_cmd = ["alembic", "-c", "/app/alembic.ini", "upgrade", "head"]
        subprocess.run(alembic_cmd, capture_output=True, timeout=120)

        _import_jobs[job_id].update(status="done", message="Database ripristinato con successo")

    except subprocess.TimeoutExpired:
        _import_jobs[job_id].update(status="error", message="Timeout superato (30 minuti)")
    except Exception as e:
        _import_jobs[job_id].update(status="error", message=str(e))
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
        _import_jobs[job_id]["finished_at"] = datetime.now().isoformat()


@router.post("/import")
async def import_database(
    file: UploadFile = File(...),
    _=Depends(require_proprietario),
):
    """Carica il file e avvia l'import in background. Ritorna subito un job_id."""
    if not (file.filename.endswith(".sql") or file.filename.endswith(".sql.gz")):
        raise HTTPException(400, "Il file deve essere .sql oppure .sql.gz")

    content = await file.read()
    if file.filename.endswith(".gz"):
        try:
            content = gzip.decompress(content)
        except Exception as e:
            raise HTTPException(400, f"File .gz non valido: {e}")
    content = _strip_incompatible_set(content)

    with tempfile.NamedTemporaryFile(delete=False, suffix=".sql") as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    job_id = str(uuid.uuid4())
    _import_jobs[job_id] = {
        "status": "pending",
        "message": "In attesa di avvio...",
        "started_at": datetime.now().isoformat(),
        "finished_at": None,
    }

    params = _parse_db_url()
    env = _pg_env(params)
    thread = threading.Thread(target=_run_import, args=(job_id, tmp_path, params, env), daemon=True)
    thread.start()

    return {"job_id": job_id}


@router.get("/import/status/{job_id}")
def import_status(job_id: str):
    """Restituisce lo stato di un job di import.
    Non richiede autenticazione: il job_id UUID funge da token implicito.
    Necessario perché durante l'import il DB è in lock e le query auth fallirebbero.
    """
    job = _import_jobs.get(job_id)
    if not job:
        raise HTTPException(404, "Job non trovato")
    return job


# ── Info DB ───────────────────────────────────────────────────────────────────

@router.get("/info")
def db_info(db: Session = Depends(get_db), _=Depends(require_proprietario)):
    """Restituisce informazioni sul database: dimensione, versione alembic, conteggi."""

    # Dimensione totale DB
    size_row = db.execute(text(
        "SELECT pg_size_pretty(pg_database_size(current_database())) AS size"
    )).fetchone()

    # Versione alembic corrente
    try:
        alembic_row = db.execute(text(
            "SELECT version_num FROM alembic_version LIMIT 1"
        )).fetchone()
        alembic_version = alembic_row[0] if alembic_row else "N/A"
    except Exception:
        alembic_version = "N/A"

    # Conteggio righe delle tabelle principali
    tables = [
        "tickets", "users", "organizzazioni", "articoli",
        "fatture", "clienti_diretti", "servizi", "opportunita",
    ]
    counts = {}
    for table in tables:
        try:
            row = db.execute(text(f"SELECT COUNT(*) FROM {table}")).fetchone()
            counts[table] = row[0]
        except Exception:
            counts[table] = None

    return {
        "db_size": size_row[0] if size_row else "N/A",
        "alembic_version": alembic_version,
        "table_counts": counts,
    }


# ── System Stats (dashboard proprietario) ────────────────────────────────────

@router.get("/system-stats")
def system_stats(db: Session = Depends(get_db), _=Depends(require_proprietario)):
    """KPI di sistema per la dashboard del proprietario."""

    # ── Organizzazioni ────────────────────────────────────────────────────────
    org_rows = db.execute(text("""
        SELECT
            o.id,
            o.nome,
            o.piano,
            o.licenza_attiva,
            o.trial_attivato,
            o.trial_scadenza,
            o.licenza_scadenza,
            COUNT(DISTINCT u.id) FILTER (WHERE u.attivo = true) AS utenti_attivi,
            COUNT(DISTINCT t.id) AS ticket_totali,
            COUNT(DISTINCT t.id) FILTER (WHERE t.stato NOT IN ('Chiusa','Annullata')) AS ticket_aperti
        FROM organizzazioni o
        LEFT JOIN users u ON u.organizzazione_id = o.id
        LEFT JOIN tickets t ON t.organizzazione_id = o.id
        GROUP BY o.id
        ORDER BY o.nome
    """)).fetchall()

    now = datetime.utcnow()

    orgs = []
    piani_count = {"base": 0, "professional": 0, "enterprise": 0, "trial": 0, "nessuna": 0}
    licenze_attive = 0
    licenze_trial = 0
    licenze_scadenza_presto = []   # scadono entro 30 giorni
    licenze_scadute = []

    for r in org_rows:
        piano = r.piano or "nessuna"

        # stato licenza
        if r.licenza_attiva:
            stato = "attiva"
            licenze_attive += 1
            piani_count[piano if piano in piani_count else "nessuna"] += 1
            if r.licenza_scadenza:
                days = (r.licenza_scadenza - now).days
                if days < 0:
                    stato = "scaduta"
                    licenze_scadute.append({"id": r.id, "nome": r.nome, "giorni": days})
                elif days <= 30:
                    licenze_scadenza_presto.append({"id": r.id, "nome": r.nome, "giorni": days})
        elif r.trial_attivato and r.trial_scadenza:
            if r.trial_scadenza < now:
                stato = "trial_scaduto"
            else:
                stato = "trial"
                licenze_trial += 1
                piani_count["trial"] += 1
        else:
            stato = "nessuna"
            piani_count["nessuna"] += 1

        orgs.append({
            "id": r.id,
            "nome": r.nome,
            "piano": piano,
            "stato": stato,
            "utenti_attivi": r.utenti_attivi or 0,
            "ticket_totali": r.ticket_totali or 0,
            "ticket_aperti": r.ticket_aperti or 0,
            "licenza_scadenza": r.licenza_scadenza.isoformat() if r.licenza_scadenza else None,
        })

    # ── Utenti totali nel sistema ─────────────────────────────────────────────
    utenti_row = db.execute(text(
        "SELECT COUNT(*) FROM users WHERE attivo = true AND ruolo != 'proprietario'"
    )).fetchone()
    utenti_totali = utenti_row[0] if utenti_row else 0

    # ── Utenti online (last_seen negli ultimi 5 minuti) ───────────────────────
    online_rows = db.execute(text("""
        SELECT u.id, u.nome, u.cognome, u.ruolo, u.organizzazione_id, u.last_seen,
               o.nome AS org_nome
        FROM users u
        LEFT JOIN organizzazioni o ON o.id = u.organizzazione_id
        WHERE u.attivo = true
          AND u.ruolo != 'proprietario'
          AND u.last_seen >= NOW() - INTERVAL '5 minutes'
        ORDER BY u.last_seen DESC
    """)).fetchall()

    utenti_online = [
        {
            "id": r.id,
            "nome": f"{r.nome} {r.cognome or ''}".strip(),
            "ruolo": r.ruolo,
            "org_nome": r.org_nome or "—",
            "organizzazione_id": r.organizzazione_id,
            "last_seen": r.last_seen.isoformat() if r.last_seen else None,
        }
        for r in online_rows
    ]

    # ── Ticket totali nel sistema ─────────────────────────────────────────────
    ticket_row = db.execute(text("SELECT COUNT(*) FROM tickets")).fetchone()
    ticket_totali = ticket_row[0] if ticket_row else 0

    ticket_aperti_row = db.execute(text(
        "SELECT COUNT(*) FROM tickets WHERE stato NOT IN ('Chiusa','Annullata')"
    )).fetchone()
    ticket_aperti = ticket_aperti_row[0] if ticket_aperti_row else 0

    # ── DB info ───────────────────────────────────────────────────────────────
    size_row = db.execute(text(
        "SELECT pg_size_pretty(pg_database_size(current_database()))"
    )).fetchone()

    try:
        alembic_row = db.execute(text("SELECT version_num FROM alembic_version LIMIT 1")).fetchone()
        alembic_version = alembic_row[0] if alembic_row else "N/A"
    except Exception:
        alembic_version = "N/A"

    # Uptime postgres (approssimato da pg_postmaster_start_time)
    try:
        uptime_row = db.execute(text(
            "SELECT now() - pg_postmaster_start_time()"
        )).fetchone()
        uptime_str = str(uptime_row[0]).split(".")[0] if uptime_row else "N/A"
    except Exception:
        uptime_str = "N/A"

    return {
        "organizzazioni": {
            "totale": len(orgs),
            "licenze_attive": licenze_attive,
            "licenze_trial": licenze_trial,
            "scadenza_presto": licenze_scadenza_presto,
            "scadute": licenze_scadute,
            "per_piano": piani_count,
        },
        "utenti": {
            "totale_attivi": utenti_totali,
            "online": utenti_online,
        },
        "tickets": {
            "totale": ticket_totali,
            "aperti": ticket_aperti,
        },
        "database": {
            "size": size_row[0] if size_row else "N/A",
            "alembic_version": alembic_version,
            "uptime": uptime_str,
        },
        "orgs_detail": orgs,
    }
