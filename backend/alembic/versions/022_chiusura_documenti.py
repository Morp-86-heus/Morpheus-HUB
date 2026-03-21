"""Aggiunge documenti_json a ticket_chiusure per salvare immagini allegate

Revision ID: 022
Revises: 021
Create Date: 2026-03-21
"""
from alembic import op
import sqlalchemy as sa

revision = '022'
down_revision = '021'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('ticket_chiusure',
        sa.Column('documenti_json', sa.Text(), nullable=True)
    )


def downgrade():
    op.drop_column('ticket_chiusure', 'documenti_json')
