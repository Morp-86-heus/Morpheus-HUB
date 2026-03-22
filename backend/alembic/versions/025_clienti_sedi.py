"""Aggiunge tabella sedi per i clienti diretti

Revision ID: 025
Revises: 024
Create Date: 2026-03-22
"""
from alembic import op
import sqlalchemy as sa

revision = '025'
down_revision = '024'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'clienti_diretti_sedi',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('cliente_id', sa.Integer(), sa.ForeignKey('clienti_diretti.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('organizzazione_id', sa.Integer(), sa.ForeignKey('organizzazioni.id'), nullable=True, index=True),
        sa.Column('nome', sa.String(200), nullable=True),
        sa.Column('via', sa.String(200), nullable=True),
        sa.Column('civico', sa.String(10), nullable=True),
        sa.Column('cap', sa.String(10), nullable=True),
        sa.Column('citta', sa.String(100), nullable=True),
        sa.Column('provincia', sa.String(5), nullable=True),
        sa.Column('telefono', sa.String(50), nullable=True),
        sa.Column('referente_nome', sa.String(200), nullable=True),
        sa.Column('referente_telefono', sa.String(50), nullable=True),
        sa.Column('referente_email', sa.String(200), nullable=True),
        sa.Column('note', sa.Text(), nullable=True),
    )


def downgrade():
    op.drop_table('clienti_diretti_sedi')
