"""add parent_ticket_id e numero_intervento a tickets

Revision ID: 035
Revises: 034
Create Date: 2026-04-24
"""
from alembic import op
import sqlalchemy as sa

revision = '035'
down_revision = '034'
branch_labels = None
depends_on = None


def upgrade():
    op.execute('ALTER TABLE tickets ADD COLUMN IF NOT EXISTS parent_ticket_id INTEGER REFERENCES tickets(id)')
    op.execute('ALTER TABLE tickets ADD COLUMN IF NOT EXISTS numero_intervento INTEGER NOT NULL DEFAULT 1')


def downgrade():
    op.drop_column('tickets', 'numero_intervento')
    op.drop_column('tickets', 'parent_ticket_id')
