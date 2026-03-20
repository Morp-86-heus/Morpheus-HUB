"""Listini prezzi per commitente + prestazioni su chiusura

Revision ID: 003
Revises: 002
Create Date: 2026-03-14 00:00:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '003'
down_revision: Union[str, None] = '002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = inspector.get_table_names()
    existing_cols = [c['name'] for c in inspector.get_columns('ticket_chiusure')] if 'ticket_chiusure' in existing_tables else []

    if 'listini' not in existing_tables:
        op.create_table(
            'listini',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('commitente', sa.String(100), nullable=False, index=True),
            sa.Column('nome', sa.String(200), nullable=False),
            sa.Column('note', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now()),
        )
    if 'listino_voci' not in existing_tables:
        op.create_table(
            'listino_voci',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('listino_id', sa.Integer(), sa.ForeignKey('listini.id'), nullable=False, index=True),
            sa.Column('descrizione', sa.String(300), nullable=False),
            sa.Column('prezzo', sa.String(50), nullable=True),
            sa.Column('unita_misura', sa.String(50), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        )
    if 'prestazioni_json' not in existing_cols:
        op.add_column('ticket_chiusure', sa.Column('prestazioni_json', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('ticket_chiusure', 'prestazioni_json')
    op.drop_table('listino_voci')
    op.drop_table('listini')
