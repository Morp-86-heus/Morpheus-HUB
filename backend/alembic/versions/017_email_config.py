"""add email smtp config and notification event settings

Revision ID: 017
Revises: 016
Create Date: 2026-03-19
"""
from alembic import op
import sqlalchemy as sa

revision = '017'
down_revision = '016'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'email_smtp_config',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('organizzazione_id', sa.Integer(), sa.ForeignKey('organizzazioni.id', ondelete='CASCADE'), unique=True, nullable=False),
        sa.Column('enabled', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('host', sa.String(200), nullable=True),
        sa.Column('port', sa.Integer(), server_default='587'),
        sa.Column('username', sa.String(200), nullable=True),
        sa.Column('password', sa.String(500), nullable=True),
        sa.Column('from_email', sa.String(200), nullable=True),
        sa.Column('from_name', sa.String(200), nullable=True),
        sa.Column('use_tls', sa.Boolean(), server_default='true'),
        sa.Column('use_ssl', sa.Boolean(), server_default='false'),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()')),
    )

    op.create_table(
        'email_notifica_eventi',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('organizzazione_id', sa.Integer(), sa.ForeignKey('organizzazioni.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('evento', sa.String(100), nullable=False),
        sa.Column('abilitato', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('destinatari', sa.Text(), nullable=True),
        sa.UniqueConstraint('organizzazione_id', 'evento', name='uq_email_evento_org'),
    )


def downgrade():
    op.drop_table('email_notifica_eventi')
    op.drop_table('email_smtp_config')
