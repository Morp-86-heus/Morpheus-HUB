"""aggiungi licenza_accettata agli utenti

Revision ID: 032
Revises: 031
Create Date: 2026-03-26
"""
from alembic import op
import sqlalchemy as sa

revision = '032'
down_revision = '031'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column(
        'licenza_accettata',
        sa.Boolean(),
        nullable=False,
        server_default='false',
    ))
    op.add_column('users', sa.Column(
        'licenza_accettata_at',
        sa.DateTime(),
        nullable=True,
    ))


def downgrade():
    op.drop_column('users', 'licenza_accettata_at')
    op.drop_column('users', 'licenza_accettata')
