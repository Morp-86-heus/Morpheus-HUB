"""add servizi e contratti_servizi

Revision ID: 015
Revises: 014
Create Date: 2026-03-19
"""
from alembic import op
import sqlalchemy as sa

revision = '015'
down_revision = '014'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'categoriaservizio') THEN
                CREATE TYPE categoriaservizio AS ENUM ('prodotto', 'servizio');
            END IF;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipofatturazione') THEN
                CREATE TYPE tipofatturazione AS ENUM ('una_tantum', 'mensile', 'trimestrale', 'semestrale', 'annuale');
            END IF;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'statocontratto') THEN
                CREATE TYPE statocontratto AS ENUM ('attivo', 'sospeso', 'scaduto', 'annullato');
            END IF;
        END $$;
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS servizi (
            id                SERIAL PRIMARY KEY,
            nome              VARCHAR(200) NOT NULL,
            descrizione       TEXT,
            categoria         categoriaservizio NOT NULL DEFAULT 'servizio',
            tipo_fatturazione tipofatturazione NOT NULL DEFAULT 'una_tantum',
            prezzo            INTEGER,
            unita             VARCHAR(50),
            attivo            BOOLEAN DEFAULT TRUE,
            organizzazione_id INTEGER REFERENCES organizzazioni(id),
            created_at        TIMESTAMP DEFAULT NOW(),
            updated_at        TIMESTAMP DEFAULT NOW()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_servizi_nome             ON servizi(nome)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_servizi_organizzazione_id ON servizi(organizzazione_id)")

    op.execute("""
        CREATE TABLE IF NOT EXISTS contratti_servizi (
            id                SERIAL PRIMARY KEY,
            cliente_id        INTEGER NOT NULL REFERENCES clienti_diretti(id),
            servizio_id       INTEGER NOT NULL REFERENCES servizi(id),
            data_inizio       DATE NOT NULL,
            data_scadenza     DATE,
            prezzo_override   INTEGER,
            stato             statocontratto NOT NULL DEFAULT 'attivo',
            note              TEXT,
            rinnovo_automatico BOOLEAN DEFAULT FALSE,
            organizzazione_id INTEGER REFERENCES organizzazioni(id),
            created_at        TIMESTAMP DEFAULT NOW(),
            updated_at        TIMESTAMP DEFAULT NOW()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_contratti_servizi_cliente_id        ON contratti_servizi(cliente_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_contratti_servizi_servizio_id       ON contratti_servizi(servizio_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_contratti_servizi_organizzazione_id ON contratti_servizi(organizzazione_id)")


def downgrade():
    op.execute("DROP TABLE IF EXISTS contratti_servizi")
    op.execute("DROP TABLE IF EXISTS servizi")
    op.execute("DROP TYPE IF EXISTS statocontratto")
    op.execute("DROP TYPE IF EXISTS tipofatturazione")
    op.execute("DROP TYPE IF EXISTS categoriaservizio")
