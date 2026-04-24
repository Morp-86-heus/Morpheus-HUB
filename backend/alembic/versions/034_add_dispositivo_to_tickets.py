"""add dispositivo e note_intervento to tickets

Revision ID: 034
Revises: 033
Create Date: 2026-04-24
"""
from alembic import op
import sqlalchemy as sa

revision = '034'
down_revision = '033'
branch_labels = None
depends_on = None


def upgrade():
    op.execute('ALTER TABLE tickets ADD COLUMN IF NOT EXISTS dispositivo VARCHAR(200)')
    op.execute('ALTER TABLE tickets ADD COLUMN IF NOT EXISTS note_intervento TEXT')


def downgrade():
    op.drop_column('tickets', 'note_intervento')
    op.drop_column('tickets', 'dispositivo')
