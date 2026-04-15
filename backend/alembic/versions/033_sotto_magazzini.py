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
    from alembic import op as _op
    from sqlalchemy import inspect
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_tables = inspector.get_table_names()
    existing_cols = [c['name'] for c in inspector.get_columns('articoli')]

    if 'sotto_magazzini' not in existing_tables:
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

    existing_indexes = [i['name'] for i in inspector.get_indexes('sotto_magazzini')]
    if 'ix_sotto_magazzini_commitente' not in existing_indexes:
        op.create_index('ix_sotto_magazzini_commitente', 'sotto_magazzini', ['commitente'])
    if 'ix_sotto_magazzini_org' not in existing_indexes:
        op.create_index('ix_sotto_magazzini_org', 'sotto_magazzini', ['organizzazione_id'])

    if 'sotto_magazzino_id' not in existing_cols:
        op.add_column('articoli', sa.Column(
            'sotto_magazzino_id',
            sa.Integer(),
            sa.ForeignKey('sotto_magazzini.id', ondelete='SET NULL'),
            nullable=True,
        ))

    articoli_indexes = [i['name'] for i in inspector.get_indexes('articoli')]
    if 'ix_articoli_sotto_magazzino' not in articoli_indexes:
        op.create_index('ix_articoli_sotto_magazzino', 'articoli', ['sotto_magazzino_id'])


def downgrade():
    op.drop_index('ix_articoli_sotto_magazzino', 'articoli')
    op.drop_column('articoli', 'sotto_magazzino_id')
    op.drop_table('sotto_magazzini')
