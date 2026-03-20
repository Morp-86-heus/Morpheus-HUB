"""Aggiunge tabella permessi per ruolo

Revision ID: 012
Revises: 011
Create Date: 2026-03-18
"""
from alembic import op
import sqlalchemy as sa

revision = '012'
down_revision = '011'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    exists = conn.execute(sa.text(
        "SELECT 1 FROM information_schema.tables "
        "WHERE table_schema='public' AND table_name='permessi_ruolo'"
    )).fetchone()
    if not exists:
        op.create_table(
            'permessi_ruolo',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('organizzazione_id', sa.Integer(),
                      sa.ForeignKey('organizzazioni.id'), nullable=False),
            sa.Column('ruolo', sa.String(50), nullable=False),
            sa.Column('permesso', sa.String(100), nullable=False),
            sa.Column('abilitato', sa.Boolean(), nullable=False, server_default='true'),
        )
        op.create_index('ix_permessi_ruolo_org_id', 'permessi_ruolo', ['organizzazione_id'])
        op.create_unique_constraint(
            'uq_permessi_org_ruolo_permesso',
            'permessi_ruolo',
            ['organizzazione_id', 'ruolo', 'permesso'],
        )


def downgrade():
    op.drop_table('permessi_ruolo')
