"""Fix policy RLS: NULLIF per gestire stringa vuota da current_setting

current_setting('app.current_org_id', true) restituisce '' (stringa vuota)
quando la variabile non è impostata, NON NULL. COALESCE('', '0') = '' != '0',
quindi la policy precedente bloccava tutte le query quando il contesto
non era impostato (es. durante il login).

Revision ID: 021
Revises: 020
Create Date: 2026-03-21
"""
from alembic import op
import sqlalchemy as sa

revision = '021'
down_revision = '020'
branch_labels = None
depends_on = None

RLS_TABLES = [
    'tickets', 'lookup_commitenti', 'lookup_clienti', 'articoli', 'listini',
    'clienti_diretti', 'users', 'permessi_ruolo', 'notifiche', 'fatture',
    'servizi', 'contratti_servizi', 'opportunita', 'email_smtp_config',
    'email_notifica_eventi',
]

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
        conn.execute(sa.text(f"DROP POLICY IF EXISTS rls_org_isolation ON {table}"))
        conn.execute(sa.text(f"""
            CREATE POLICY rls_org_isolation ON {table}
            AS PERMISSIVE FOR ALL
            USING ({POLICY_USING})
            WITH CHECK ({POLICY_CHECK})
        """))
        # Riabilita FORCE RLS nel caso fosse stato disabilitato per emergenza
        conn.execute(sa.text(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY"))
        conn.execute(sa.text(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY"))
    print(f"✓ Policy RLS corrette su {len(RLS_TABLES)} tabelle")


def downgrade():
    pass  # Non esiste un downgrade sensato: tornare alla policy rotta
