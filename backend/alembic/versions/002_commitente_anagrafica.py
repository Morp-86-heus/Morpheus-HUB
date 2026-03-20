"""Commitente anagrafica fields

Revision ID: 002
Revises: 001
Create Date: 2026-03-14 00:00:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '002'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('lookup_commitenti', sa.Column('partita_iva', sa.String(20), nullable=True))
    op.add_column('lookup_commitenti', sa.Column('codice_fiscale', sa.String(20), nullable=True))
    op.add_column('lookup_commitenti', sa.Column('via', sa.String(200), nullable=True))
    op.add_column('lookup_commitenti', sa.Column('civico', sa.String(10), nullable=True))
    op.add_column('lookup_commitenti', sa.Column('cap', sa.String(10), nullable=True))
    op.add_column('lookup_commitenti', sa.Column('citta', sa.String(100), nullable=True))
    op.add_column('lookup_commitenti', sa.Column('provincia', sa.String(5), nullable=True))
    op.add_column('lookup_commitenti', sa.Column('regione', sa.String(100), nullable=True))
    op.add_column('lookup_commitenti', sa.Column('telefono', sa.String(50), nullable=True))
    op.add_column('lookup_commitenti', sa.Column('email', sa.String(200), nullable=True))
    op.add_column('lookup_commitenti', sa.Column('pec', sa.String(200), nullable=True))
    op.add_column('lookup_commitenti', sa.Column('sito_web', sa.String(200), nullable=True))
    op.add_column('lookup_commitenti', sa.Column('referente_nome', sa.String(200), nullable=True))
    op.add_column('lookup_commitenti', sa.Column('referente_ruolo', sa.String(100), nullable=True))
    op.add_column('lookup_commitenti', sa.Column('referente_telefono', sa.String(50), nullable=True))
    op.add_column('lookup_commitenti', sa.Column('referente_email', sa.String(200), nullable=True))
    op.add_column('lookup_commitenti', sa.Column('note', sa.Text(), nullable=True))
    op.add_column('lookup_commitenti', sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=True))
    op.add_column('lookup_commitenti', sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=True))


def downgrade() -> None:
    for col in ['updated_at', 'created_at', 'note', 'referente_email', 'referente_telefono',
                'referente_ruolo', 'referente_nome', 'sito_web', 'pec', 'email', 'telefono',
                'regione', 'provincia', 'citta', 'cap', 'civico', 'via', 'codice_fiscale', 'partita_iva']:
        op.drop_column('lookup_commitenti', col)
