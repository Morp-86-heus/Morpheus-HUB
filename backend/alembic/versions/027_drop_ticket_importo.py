"""Rimuove colonna importo dalla tabella tickets

Revision ID: 027
Revises: 026
Create Date: 2026-03-23
"""
from alembic import op
import sqlalchemy as sa

revision = '027'
down_revision = '026'
branch_labels = None
depends_on = None


def upgrade():
    op.drop_column('tickets', 'importo')


def downgrade():
    op.add_column('tickets', sa.Column('importo', sa.String(50), nullable=True))
