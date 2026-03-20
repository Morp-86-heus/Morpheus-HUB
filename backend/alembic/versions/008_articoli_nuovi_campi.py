"""Aggiunge marca, modello, seriale, cespite e rimuove codice da articoli

Revision ID: 008
Revises: 007
Create Date: 2026-03-18
"""
from alembic import op
import sqlalchemy as sa

revision = '008'
down_revision = '007'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('articoli', sa.Column('marca', sa.String(100), nullable=True))
    op.add_column('articoli', sa.Column('modello', sa.String(200), nullable=True))
    op.add_column('articoli', sa.Column('seriale', sa.String(100), nullable=True))
    op.add_column('articoli', sa.Column('cespite', sa.String(100), nullable=True))

    # Indici per ricerca rapida su seriale e cespite
    op.create_index('ix_articoli_seriale', 'articoli', ['seriale'])
    op.create_index('ix_articoli_cespite', 'articoli', ['cespite'])

    # Rende codice nullable (non più obbligatorio)
    op.alter_column('articoli', 'codice', nullable=True)

    # Rimuove il vecchio vincolo univoco su codice (se ancora esiste)
    op.execute("DROP INDEX IF EXISTS ix_articoli_codice")
    op.execute("DROP INDEX IF EXISTS uq_articoli_commitente_cliente_codice")


def downgrade():
    op.drop_index('ix_articoli_cespite', table_name='articoli')
    op.drop_index('ix_articoli_seriale', table_name='articoli')
    op.drop_column('articoli', 'cespite')
    op.drop_column('articoli', 'seriale')
    op.drop_column('articoli', 'modello')
    op.drop_column('articoli', 'marca')
