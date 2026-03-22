"""Aggiunge recupero password e SMTP di sistema

Revision ID: 024
Revises: 023
Create Date: 2026-03-22
"""
from alembic import op
import sqlalchemy as sa

revision = '024'
down_revision = '023'
branch_labels = None
depends_on = None


def upgrade():
    # Campi reset password sull'utente
    op.add_column('users', sa.Column('password_reset_token', sa.String(255), nullable=True))
    op.add_column('users', sa.Column('password_reset_expiry', sa.DateTime(), nullable=True))

    # email_smtp_config: consenti organizzazione_id NULL per la config di sistema (proprietario)
    op.alter_column('email_smtp_config', 'organizzazione_id', nullable=True)


def downgrade():
    op.drop_column('users', 'password_reset_token')
    op.drop_column('users', 'password_reset_expiry')
    op.alter_column('email_smtp_config', 'organizzazione_id', nullable=False)
