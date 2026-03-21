"""Aggiunge tabella eventi per il calendario

Revision ID: 023
Revises: 022
Create Date: 2026-03-21
"""
from alembic import op
import sqlalchemy as sa

revision = '023'
down_revision = '022'
branch_labels = None
depends_on = None

POLICY = """
    COALESCE(NULLIF(current_setting('app.current_org_id', true), ''), '0') = '0'
    OR organizzazione_id::text = current_setting('app.current_org_id', true)
"""


def upgrade():
    conn = op.get_bind()
    table_exists = conn.execute(sa.text(
        "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'eventi')"
    )).scalar()

    if not table_exists:
        op.create_table(
            'eventi',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('titolo', sa.String(200), nullable=False),
            sa.Column('descrizione', sa.Text(), nullable=True),
            sa.Column('data_inizio', sa.Date(), nullable=False),
            sa.Column('ora_inizio', sa.String(5), nullable=True),
            sa.Column('data_fine', sa.Date(), nullable=False),
            sa.Column('ora_fine', sa.String(5), nullable=True),
            sa.Column('tutto_il_giorno', sa.Boolean(), nullable=False, server_default='false'),
            sa.Column('condiviso', sa.Boolean(), nullable=False, server_default='false'),
            sa.Column('colore', sa.String(20), nullable=True),
            sa.Column('organizzazione_id', sa.Integer(), nullable=False),
            sa.Column('created_by', sa.Integer(), nullable=False),
            sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()')),
            sa.PrimaryKeyConstraint('id'),
            sa.ForeignKeyConstraint(['organizzazione_id'], ['organizzazioni.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='CASCADE'),
        )

    # Indici (idempotenti)
    for idx, cols in [
        ('ix_eventi_organizzazione_id', ['organizzazione_id']),
        ('ix_eventi_created_by', ['created_by']),
        ('ix_eventi_data_inizio', ['data_inizio']),
    ]:
        idx_exists = conn.execute(sa.text(
            f"SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = '{idx}')"
        )).scalar()
        if not idx_exists:
            op.create_index(idx, 'eventi', cols)

    # RLS (idempotente)
    conn.execute(sa.text('ALTER TABLE eventi ENABLE ROW LEVEL SECURITY'))
    conn.execute(sa.text('ALTER TABLE eventi FORCE ROW LEVEL SECURITY'))
    policy_exists = conn.execute(sa.text(
        "SELECT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='eventi' AND policyname='eventi_org_policy')"
    )).scalar()
    if not policy_exists:
        conn.execute(sa.text(f'CREATE POLICY eventi_org_policy ON eventi USING ({POLICY})'))


def downgrade():
    op.execute('DROP POLICY IF EXISTS eventi_org_policy ON eventi')
    op.drop_table('eventi')
