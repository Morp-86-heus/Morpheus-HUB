"""Tabelle magazzino: articoli (per committente/cliente) e movimenti

Revision ID: 006
Revises: 005
Create Date: 2026-03-18
"""
from alembic import op
import sqlalchemy as sa

revision = '006'
down_revision = '005'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'articoli',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('commitente', sa.String(100), nullable=False),
        sa.Column('cliente', sa.String(100), nullable=False),
        sa.Column('codice', sa.String(100), nullable=False),
        sa.Column('descrizione', sa.String(300), nullable=False),
        sa.Column('categoria', sa.String(100), nullable=True),
        sa.Column('unita_misura', sa.String(50), nullable=True, server_default='pz'),
        sa.Column('quantita_disponibile', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('quantita_minima', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('fornitore', sa.String(200), nullable=True),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index('ix_articoli_commitente', 'articoli', ['commitente'])
    op.create_index('ix_articoli_cliente', 'articoli', ['cliente'])
    op.create_index('ix_articoli_categoria', 'articoli', ['categoria'])
    op.create_index(
        'uq_articoli_commitente_cliente_codice',
        'articoli',
        ['commitente', 'cliente', 'codice'],
        unique=True,
    )

    op.create_table(
        'movimenti_magazzino',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('articolo_id', sa.Integer(), sa.ForeignKey('articoli.id'), nullable=False),
        sa.Column('tipo', sa.String(20), nullable=False),
        sa.Column('quantita', sa.Integer(), nullable=False),
        sa.Column('riferimento_ticket_id', sa.Integer(), sa.ForeignKey('tickets.id'), nullable=True),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('creato_da', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index('ix_movimenti_articolo_id', 'movimenti_magazzino', ['articolo_id'])
    op.create_index('ix_movimenti_ticket_id', 'movimenti_magazzino', ['riferimento_ticket_id'])


def downgrade():
    op.drop_table('movimenti_magazzino')
    op.drop_table('articoli')
