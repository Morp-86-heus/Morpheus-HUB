"""add opportunita (funnel vendita)

Revision ID: 016
Revises: 015
Create Date: 2026-03-19
"""
from alembic import op
import sqlalchemy as sa

revision = '016'
down_revision = '015'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'faseopportunita') THEN
                CREATE TYPE faseopportunita AS ENUM ('lead','qualifica','proposta','negoziazione','vinto','perso');
            END IF;
        END $$;
    """)
    op.execute("""
        CREATE TABLE IF NOT EXISTS opportunita (
            id SERIAL PRIMARY KEY,
            titolo VARCHAR(200) NOT NULL,
            cliente_id INTEGER REFERENCES clienti_diretti(id),
            cliente_nome_libero VARCHAR(200),
            valore INTEGER,
            fase faseopportunita NOT NULL DEFAULT 'lead',
            probabilita INTEGER,
            data_chiusura_prevista DATE,
            assegnato_a INTEGER REFERENCES users(id),
            note TEXT,
            motivo_perdita TEXT,
            organizzazione_id INTEGER REFERENCES organizzazioni(id),
            created_at TIMESTAMP DEFAULT now(),
            updated_at TIMESTAMP DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS ix_opportunita_id ON opportunita(id);
        CREATE INDEX IF NOT EXISTS ix_opportunita_titolo ON opportunita(titolo);
        CREATE INDEX IF NOT EXISTS ix_opportunita_cliente_id ON opportunita(cliente_id);
        CREATE INDEX IF NOT EXISTS ix_opportunita_fase ON opportunita(fase);
        CREATE INDEX IF NOT EXISTS ix_opportunita_organizzazione_id ON opportunita(organizzazione_id);
    """)


def downgrade():
    op.drop_table('opportunita')
    op.execute("DROP TYPE IF EXISTS faseopportunita")
