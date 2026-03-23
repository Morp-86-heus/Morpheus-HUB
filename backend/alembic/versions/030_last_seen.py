"""add last_seen to users

Revision ID: 030
Revises: 029
Create Date: 2026-03-23
"""
from alembic import op
import sqlalchemy as sa

revision = '030'
down_revision = '029'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column('last_seen', sa.DateTime(), nullable=True))


def downgrade():
    op.drop_column('users', 'last_seen')
