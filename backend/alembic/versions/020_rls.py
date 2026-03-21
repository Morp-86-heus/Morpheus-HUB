"""Abilita Row Level Security su tutte le tabelle multi-tenant

Revision ID: 020
Revises: 019
Create Date: 2026-03-20
"""
from alembic import op
import sqlalchemy as sa

revision = '020'
down_revision = '019'
branch_labels = None
depends_on = None

# Tabelle con organizzazione_id diretta
RLS_TABLES = [
    'tickets',
    'lookup_commitenti',
    'lookup_clienti',
    'articoli',
    'listini',
    'clienti_diretti',
    'users',
    'permessi_ruolo',
    'notifiche',
    'fatture',
    'servizi',
    'contratti_servizi',
    'opportunita',
    'email_smtp_config',
    'email_notifica_eventi',
]

# NULLIF converte stringa vuota in NULL (current_setting restituisce '' quando
# la variabile non è impostata, NON NULL — quindi COALESCE da solo non basta)
POLICY_USING = """
    COALESCE(NULLIF(current_setting('app.current_org_id', true), ''), '0') = '0'
    OR organizzazione_id::text = current_setting('app.current_org_id', true)
"""

POLICY_CHECK = """
    COALESCE(NULLIF(current_setting('app.current_org_id', true), ''), '0') = '0'
    OR organizzazione_id::text = current_setting('app.current_org_id', true)
"""


def upgrade():
    conn = op.get_bind()

    for table in RLS_TABLES:
        # 1. Abilita RLS sulla tabella
        conn.execute(sa.text(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY"))

        # 2. Forza RLS anche per il proprietario della tabella (utente tickets)
        conn.execute(sa.text(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY"))

        # 3. Elimina policy precedente se esiste (idempotente)
        conn.execute(sa.text(
            f"DROP POLICY IF EXISTS rls_org_isolation ON {table}"
        ))

        # 4. Crea policy permissiva per tutte le operazioni
        conn.execute(sa.text(f"""
            CREATE POLICY rls_org_isolation ON {table}
            AS PERMISSIVE
            FOR ALL
            USING ({POLICY_USING})
            WITH CHECK ({POLICY_CHECK})
        """))

    print(f"✓ RLS abilitato su {len(RLS_TABLES)} tabelle")


def downgrade():
    conn = op.get_bind()

    for table in RLS_TABLES:
        conn.execute(sa.text(f"DROP POLICY IF EXISTS rls_org_isolation ON {table}"))
        conn.execute(sa.text(f"ALTER TABLE {table} NO FORCE ROW LEVEL SECURITY"))
        conn.execute(sa.text(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY"))

    print(f"✓ RLS disabilitato su {len(RLS_TABLES)} tabelle")
