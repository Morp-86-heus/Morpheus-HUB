"""add colore to users

Revision ID: 036
Revises: 035
Create Date: 2026-04-24
"""
from alembic import op
import sqlalchemy as sa

revision = '036'
down_revision = '035'
branch_labels = None
depends_on = None


def upgrade():
    op.execute('ALTER TABLE users ADD COLUMN IF NOT EXISTS colore VARCHAR(7)')


def downgrade():
    op.drop_column('users', 'colore')
