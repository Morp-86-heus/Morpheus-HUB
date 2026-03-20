"""Aggiunge tabella organizzazioni e organizzazione_id a tutte le tabelle dati

Revision ID: 009
Revises: 008
Create Date: 2026-03-18
"""
from alembic import op
import sqlalchemy as sa

revision = '009'
down_revision = '008'
branch_labels = None
depends_on = None

TABLES_WITH_ORG = [
    'users',
    'tickets',
    'lookup_commitenti',
    'lookup_clienti',
    'articoli',
    'listini',
    'clienti_diretti',
]


def _column_exists(conn, table, column):
    result = conn.execute(sa.text(
        "SELECT 1 FROM information_schema.columns "
        "WHERE table_name=:t AND column_name=:c"
    ), {"t": table, "c": column})
    return result.fetchone() is not None


def _index_exists(conn, index_name):
    result = conn.execute(sa.text(
        "SELECT 1 FROM pg_indexes WHERE indexname=:i"
    ), {"i": index_name})
    return result.fetchone() is not None


def _constraint_exists(conn, constraint_name):
    result = conn.execute(sa.text(
        "SELECT 1 FROM information_schema.table_constraints "
        "WHERE constraint_name=:c"
    ), {"c": constraint_name})
    return result.fetchone() is not None


def upgrade():
    conn = op.get_bind()

    # 1. Crea tabella organizzazioni solo se non esiste
    op.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS organizzazioni (
            id SERIAL PRIMARY KEY,
            nome VARCHAR(200) NOT NULL UNIQUE,
            descrizione TEXT,
            attivo BOOLEAN NOT NULL DEFAULT true,
            created_at TIMESTAMP DEFAULT now(),
            updated_at TIMESTAMP DEFAULT now()
        )
    """))

    # 2. Inserisce organizzazione di default solo se non esiste
    op.execute(sa.text(
        "INSERT INTO organizzazioni (nome, attivo) "
        "SELECT 'Infoservizi soc coop', true "
        "WHERE NOT EXISTS (SELECT 1 FROM organizzazioni WHERE nome='Infoservizi soc coop')"
    ))

    # 3. Aggiunge colonna organizzazione_id a tutte le tabelle (se non esiste già)
    for table in TABLES_WITH_ORG:
        if not _column_exists(conn, table, 'organizzazione_id'):
            op.add_column(
                table,
                sa.Column('organizzazione_id', sa.Integer,
                          sa.ForeignKey('organizzazioni.id'), nullable=True)
            )
        idx = f'ix_{table}_organizzazione_id'
        if not _index_exists(conn, idx):
            op.create_index(idx, table, ['organizzazione_id'])

    # 4. Assegna tutti i dati esistenti all'organizzazione di default (id=1)
    for table in TABLES_WITH_ORG:
        if table == 'users':
            op.execute(sa.text(
                "UPDATE users SET organizzazione_id = 1 "
                "WHERE ruolo != 'proprietario' AND organizzazione_id IS NULL"
            ))
        else:
            op.execute(sa.text(
                f"UPDATE {table} SET organizzazione_id = 1 WHERE organizzazione_id IS NULL"
            ))

    # 5. Vincolo composito su lookup_commitenti (nome, organizzazione_id)
    op.execute(sa.text(
        "ALTER TABLE lookup_commitenti DROP CONSTRAINT IF EXISTS lookup_commitenti_nome_key"
    ))
    if not _constraint_exists(conn, 'uq_commitenti_nome_org'):
        op.create_unique_constraint(
            'uq_commitenti_nome_org',
            'lookup_commitenti',
            ['nome', 'organizzazione_id']
        )

    # 6. Vincolo composito su lookup_clienti (nome, organizzazione_id)
    op.execute(sa.text(
        "ALTER TABLE lookup_clienti DROP CONSTRAINT IF EXISTS lookup_clienti_nome_key"
    ))
    if not _constraint_exists(conn, 'uq_clienti_nome_org'):
        op.create_unique_constraint(
            'uq_clienti_nome_org',
            'lookup_clienti',
            ['nome', 'organizzazione_id']
        )


def downgrade():
    # Rimuovi vincoli compositi
    op.drop_constraint('uq_clienti_nome_org', 'lookup_clienti', type_='unique')
    op.drop_constraint('uq_commitenti_nome_org', 'lookup_commitenti', type_='unique')

    # Ripristina vecchi vincoli unique semplici
    op.create_unique_constraint('lookup_commitenti_nome_key', 'lookup_commitenti', ['nome'])
    op.create_unique_constraint('lookup_clienti_nome_key', 'lookup_clienti', ['nome'])

    # Rimuovi colonne organizzazione_id
    for table in TABLES_WITH_ORG:
        op.drop_index(f'ix_{table}_organizzazione_id', table_name=table)
        op.drop_column(table, 'organizzazione_id')

    # Elimina tabella organizzazioni
    op.drop_table('organizzazioni')
