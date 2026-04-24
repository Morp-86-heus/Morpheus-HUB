"""add tecnico_esterno to tickets

Revision ID: 038
Revises: 037
Create Date: 2026-04-24
"""
from alembic import op

revision = '038'
down_revision = '037'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TABLE tickets ADD COLUMN IF NOT EXISTS tecnico_esterno VARCHAR(200)")


def downgrade():
    op.drop_column('tickets', 'tecnico_esterno')
