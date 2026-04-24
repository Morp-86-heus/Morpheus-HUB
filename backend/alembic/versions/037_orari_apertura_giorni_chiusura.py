"""add orari_apertura and giorni_chiusura to tickets

Revision ID: 037
Revises: 036
Create Date: 2026-04-24
"""
from alembic import op
import sqlalchemy as sa

revision = '037'
down_revision = '036'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TABLE tickets ADD COLUMN IF NOT EXISTS orari_apertura JSON")
    op.execute("ALTER TABLE tickets ADD COLUMN IF NOT EXISTS giorni_chiusura JSON")


def downgrade():
    op.drop_column('tickets', 'orari_apertura')
    op.drop_column('tickets', 'giorni_chiusura')
