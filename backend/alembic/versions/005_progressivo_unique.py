"""Unique constraint su (tecnico, data_gestione, nr_progressivo)

Revision ID: 005
Revises: 004
Create Date: 2026-03-18
"""
from alembic import op

revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None


def upgrade():
    # Il constraint esclude le righe con nr_progressivo NULL
    # (PostgreSQL considera i NULL come distinti in un unique constraint)
    op.create_index(
        'uq_tickets_tecnico_data_progressivo',
        'tickets',
        ['tecnico', 'data_gestione', 'nr_progressivo'],
        unique=True,
        postgresql_where='nr_progressivo IS NOT NULL',
    )


def downgrade():
    op.drop_index('uq_tickets_tecnico_data_progressivo', table_name='tickets')
