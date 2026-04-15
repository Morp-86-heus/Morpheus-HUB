"""Sottomagazzini per committente

Revision ID: 033
Revises: 032
Create Date: 2026-04-15
"""
from alembic import op
import sqlalchemy as sa

revision = '033'
down_revision = '032'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'sotto_magazzini',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('nome', sa.String(200), nullable=False),
        sa.Column('descrizione', sa.Text(), nullable=True),
        sa.Column('commitente', sa.String(100), nullable=False),
        sa.Column('organizzazione_id', sa.Integer(), sa.ForeignKey('organizzazioni.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index('ix_sotto_magazzini_commitente', 'sotto_magazzini', ['commitente'])
    op.create_index('ix_sotto_magazzini_org', 'sotto_magazzini', ['organizzazione_id'])

    op.add_column('articoli', sa.Column(
        'sotto_magazzino_id',
        sa.Integer(),
        sa.ForeignKey('sotto_magazzini.id', ondelete='SET NULL'),
        nullable=True,
    ))
    op.create_index('ix_articoli_sotto_magazzino', 'articoli', ['sotto_magazzino_id'])


def downgrade():
    op.drop_index('ix_articoli_sotto_magazzino', 'articoli')
    op.drop_column('articoli', 'sotto_magazzino_id')
    op.drop_table('sotto_magazzini')
