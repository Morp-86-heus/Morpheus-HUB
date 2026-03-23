"""Crea tabella vendite_prodotti

Revision ID: 029
Revises: 028
Create Date: 2026-03-23
"""
from alembic import op
import sqlalchemy as sa

revision = '029'
down_revision = '028'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'vendite_prodotti',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organizzazione_id', sa.Integer(), nullable=False),
        sa.Column('cliente_id', sa.Integer(), nullable=True),
        sa.Column('cliente_nome', sa.String(200), nullable=True),
        sa.Column('servizio_id', sa.Integer(), nullable=True),
        sa.Column('prodotto_nome', sa.String(200), nullable=False),
        sa.Column('quantita', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('prezzo_unitario', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('sconto_pct', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('totale', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('data_vendita', sa.Date(), nullable=False),
        sa.Column('stato', sa.String(20), nullable=False, server_default='preventivo'),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('registrazione_contabile_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['organizzazione_id'], ['organizzazioni.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['cliente_id'], ['clienti_diretti.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['servizio_id'], ['servizi.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['registrazione_contabile_id'], ['registrazioni_contabili.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_vendite_prodotti_id', 'vendite_prodotti', ['id'])
    op.create_index('ix_vendite_prodotti_org', 'vendite_prodotti', ['organizzazione_id'])
    op.create_index('ix_vendite_prodotti_cliente', 'vendite_prodotti', ['cliente_id'])
    op.create_index('ix_vendite_prodotti_stato', 'vendite_prodotti', ['stato'])


def downgrade():
    op.drop_index('ix_vendite_prodotti_stato', 'vendite_prodotti')
    op.drop_index('ix_vendite_prodotti_cliente', 'vendite_prodotti')
    op.drop_index('ix_vendite_prodotti_org', 'vendite_prodotti')
    op.drop_index('ix_vendite_prodotti_id', 'vendite_prodotti')
    op.drop_table('vendite_prodotti')
