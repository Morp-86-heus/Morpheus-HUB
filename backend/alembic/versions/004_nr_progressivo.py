"""Sostituisce registrata con nr_progressivo in tickets

Revision ID: 004
Revises: 003
Create Date: 2026-03-18
"""
from alembic import op
import sqlalchemy as sa

revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('tickets', sa.Column('nr_progressivo', sa.Integer(), nullable=True))
    op.drop_column('tickets', 'registrata')


def downgrade():
    op.add_column('tickets', sa.Column('registrata', sa.Boolean(), nullable=True))
    op.drop_column('tickets', 'nr_progressivo')
