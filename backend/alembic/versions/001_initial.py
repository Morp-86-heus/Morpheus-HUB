"""Initial schema

Revision ID: 001
Revises:
Create Date: 2025-01-01 00:00:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'lookup_commitenti',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('nome', sa.String(100), nullable=False, unique=True),
    )
    op.create_table(
        'lookup_clienti',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('nome', sa.String(100), nullable=False, unique=True),
        sa.Column('commitente', sa.String(100), nullable=True),
    )
    op.create_table(
        'lookup_tecnici',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('nome', sa.String(100), nullable=False, unique=True),
    )
    op.create_table(
        'tickets',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('commitente', sa.String(100), nullable=True),
        sa.Column('cliente', sa.String(100), nullable=True),
        sa.Column('nr_intervento', sa.String(100), nullable=True),
        sa.Column('utente', sa.String(200), nullable=True),
        sa.Column('citta', sa.String(200), nullable=True),
        sa.Column('sla_scadenza', sa.DateTime(), nullable=True),
        sa.Column('ldv', sa.Text(), nullable=True),
        sa.Column('stato', sa.String(50), nullable=True),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('data_gestione', sa.Date(), nullable=True),
        sa.Column('tecnico', sa.String(100), nullable=True),
        sa.Column('registrata', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()')),
    )
    op.create_index('ix_tickets_stato', 'tickets', ['stato'])
    op.create_index('ix_tickets_tecnico', 'tickets', ['tecnico'])
    op.create_index('ix_tickets_commitente', 'tickets', ['commitente'])
    op.create_index('ix_tickets_data_gestione', 'tickets', ['data_gestione'])
    op.create_index('ix_tickets_sla_scadenza', 'tickets', ['sla_scadenza'])


def downgrade() -> None:
    op.drop_table('tickets')
    op.drop_table('lookup_tecnici')
    op.drop_table('lookup_clienti')
    op.drop_table('lookup_commitenti')
