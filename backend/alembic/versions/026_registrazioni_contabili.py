"""Aggiunge tabella registrazioni_contabili per contabilità organizzazioni

Revision ID: 026
Revises: 025
Create Date: 2026-03-23
"""
from alembic import op
import sqlalchemy as sa

revision = '026'
down_revision = '025'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'registrazioni_contabili',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('organizzazione_id', sa.Integer(),
                  sa.ForeignKey('organizzazioni.id', ondelete='CASCADE'),
                  nullable=False, index=True),
        sa.Column('tipo', sa.String(20), nullable=False, server_default='manuale'),
        sa.Column('riferimento_ticket_id', sa.Integer(),
                  sa.ForeignKey('tickets.id', ondelete='SET NULL'),
                  nullable=True, index=True),
        sa.Column('riferimento_contratto_id', sa.Integer(),
                  sa.ForeignKey('contratti_servizi.id', ondelete='SET NULL'),
                  nullable=True, index=True),
        sa.Column('cliente_nome', sa.String(200), nullable=True),
        sa.Column('descrizione', sa.String(300), nullable=False),
        sa.Column('importo', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('data_competenza', sa.Date(), nullable=False),
        sa.Column('stato', sa.String(20), nullable=False, server_default='emessa'),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(),
                  onupdate=sa.func.now()),
    )
    op.create_index(
        'ix_reg_contabili_org_data',
        'registrazioni_contabili',
        ['organizzazione_id', 'data_competenza'],
    )


def downgrade():
    op.drop_index('ix_reg_contabili_org_data', table_name='registrazioni_contabili')
    op.drop_table('registrazioni_contabili')
