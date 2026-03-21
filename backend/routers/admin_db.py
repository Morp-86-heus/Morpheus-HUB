import os
import subprocess
import tempfile
import gzip
import shutil
from urllib.parse import urlparse
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db
from auth import require_proprietario

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

    sql_bytes = proc.stdout
    gz_bytes = gzip.compress(sql_bytes, compresslevel=6)

    return StreamingResponse(
        iter([gz_bytes]),
        media_type="application/gzip",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Length": str(len(gz_bytes)),
        },
    )


# ── Import ────────────────────────────────────────────────────────────────────

@router.post("/import")
async def import_database(
    file: UploadFile = File(...),
    _=Depends(require_proprietario),
):
    """Ripristina il database da un file .sql o .sql.gz caricato."""
    params = _parse_db_url()
    env = _pg_env(params)

    if not (file.filename.endswith(".sql") or file.filename.endswith(".sql.gz")):
        raise HTTPException(400, "Il file deve essere .sql oppure .sql.gz")

    # Salva il file caricato in un temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".sql") as tmp:
        tmp_path = tmp.name
        content = await file.read()
        # Decomprimi se .gz
        if file.filename.endswith(".gz"):
            try:
                content = gzip.decompress(content)
            except Exception as e:
                raise HTTPException(400, f"File .gz non valido: {e}")
        tmp.write(content)

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
        proc = subprocess.run(cmd, env=env, capture_output=True, timeout=300)
        if proc.returncode != 0:
            raise HTTPException(500, f"Import fallito: {proc.stderr.decode()[:500]}")

        # Esegui migrazioni pendenti
        alembic_cmd = ["alembic", "-c", "/app/alembic.ini", "upgrade", "head"]
        subprocess.run(alembic_cmd, capture_output=True, timeout=60)

    finally:
        os.unlink(tmp_path)

    return {"ok": True, "message": "Database ripristinato con successo"}


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
