"""crea tabella audit_logs

Revision ID: 031
Revises: 030
Create Date: 2026-03-24
"""
from alembic import op
import sqlalchemy as sa

revision = '031'
down_revision = '030'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'audit_logs',
        sa.Column('id',                  sa.Integer(),     primary_key=True),
        sa.Column('timestamp',           sa.DateTime(),    server_default=sa.func.now(), nullable=False),
        sa.Column('user_id',             sa.Integer(),     sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('user_nome',           sa.String(200),   nullable=True),
        sa.Column('user_ruolo',          sa.String(50),    nullable=True),
        sa.Column('organizzazione_id',   sa.Integer(),     sa.ForeignKey('organizzazioni.id', ondelete='SET NULL'), nullable=True),
        sa.Column('organizzazione_nome', sa.String(200),   nullable=True),
        sa.Column('azione',              sa.String(100),   nullable=False),
        sa.Column('risorsa_tipo',        sa.String(50),    nullable=True),
        sa.Column('risorsa_id',          sa.String(100),   nullable=True),
        sa.Column('dettagli',            sa.JSON(),        nullable=True),
        sa.Column('ip_address',          sa.String(45),    nullable=True),
    )
    op.create_index('ix_audit_logs_timestamp',       'audit_logs', ['timestamp'])
    op.create_index('ix_audit_logs_azione',          'audit_logs', ['azione'])
    op.create_index('ix_audit_logs_user_id',         'audit_logs', ['user_id'])
    op.create_index('ix_audit_logs_organizzazione',  'audit_logs', ['organizzazione_id'])


def downgrade():
    op.drop_table('audit_logs')
