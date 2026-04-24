"""add dispositivo to tickets

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
    op.add_column('tickets', sa.Column('dispositivo', sa.String(200), nullable=True))


def downgrade():
    op.drop_column('tickets', 'dispositivo')
