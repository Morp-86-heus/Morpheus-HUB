import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://tickets:tickets@localhost:5432/tickets")

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def set_rls_org(db: Session, org_id: int | None) -> None:
    """
    Imposta il contesto RLS per la sessione corrente.
    - org_id = None o 0 → nessun filtro (proprietario / migrazioni)
    - org_id = N       → filtra tutte le tabelle multi-tenant all'organizzazione N
    Il SET LOCAL è valido solo per la transazione corrente, quindi è sicuro
    con il connection pooling: si azzera automaticamente a fine richiesta.
    """
    val = int(org_id) if org_id else 0  # sempre intero, nessun rischio injection
    db.execute(text(f"SET LOCAL app.current_org_id = {val}"))


def init_db():
    import subprocess, sys
    # Esegue tutte le migrazioni Alembic pendenti prima di avviare l'app
    result = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        print("Alembic upgrade FAILED:\n", result.stderr, flush=True)
    else:
        print("Alembic upgrade OK:\n", result.stdout or "(no output)", flush=True)
    # Fallback: crea tabelle non ancora gestite da migrazioni
    from models import Base
    Base.metadata.create_all(bind=engine)
