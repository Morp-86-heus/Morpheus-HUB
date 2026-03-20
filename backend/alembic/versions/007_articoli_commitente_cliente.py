"""Aggiunge commitente e cliente alla tabella articoli

Revision ID: 007
Revises: 006
Create Date: 2026-03-18
"""
from alembic import op
import sqlalchemy as sa

revision = '007'
down_revision = '006'
branch_labels = None
depends_on = None


def upgrade():
    # Aggiunge le colonne (nullable inizialmente per non rompere le righe esistenti)
    op.add_column('articoli', sa.Column('commitente', sa.String(100), nullable=True))
    op.add_column('articoli', sa.Column('cliente', sa.String(100), nullable=True))

    # Rimuove il vecchio indice univoco solo su codice (se esiste)
    op.execute("DROP INDEX IF EXISTS ix_articoli_codice")

    # Crea i nuovi indici
    op.create_index('ix_articoli_commitente', 'articoli', ['commitente'])
    op.create_index('ix_articoli_cliente', 'articoli', ['cliente'])
    op.create_index(
        'uq_articoli_commitente_cliente_codice',
        'articoli',
        ['commitente', 'cliente', 'codice'],
        unique=True,
        postgresql_where='commitente IS NOT NULL AND cliente IS NOT NULL',
    )


def downgrade():
    op.drop_index('uq_articoli_commitente_cliente_codice', table_name='articoli')
    op.drop_index('ix_articoli_cliente', table_name='articoli')
    op.drop_index('ix_articoli_commitente', table_name='articoli')
    op.drop_column('articoli', 'cliente')
    op.drop_column('articoli', 'commitente')
