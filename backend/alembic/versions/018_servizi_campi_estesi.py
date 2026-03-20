"""servizi: aggiungi campi estesi (seriale, marca, modello, licenza, garanzia, ecc.)

Revision ID: 018
Revises: 017
Create Date: 2026-03-19
"""
from alembic import op
import sqlalchemy as sa

revision = '018'
down_revision = '017'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('servizi', sa.Column('codice_sku', sa.String(100), nullable=True))
    op.add_column('servizi', sa.Column('marca', sa.String(100), nullable=True))
    op.add_column('servizi', sa.Column('modello', sa.String(200), nullable=True))
    op.add_column('servizi', sa.Column('numero_seriale', sa.String(200), nullable=True))
    op.add_column('servizi', sa.Column('numero_licenza', sa.String(200), nullable=True))
    op.add_column('servizi', sa.Column('fornitore', sa.String(200), nullable=True))
    op.add_column('servizi', sa.Column('data_acquisto', sa.Date(), nullable=True))
    op.add_column('servizi', sa.Column('garanzia_scadenza', sa.Date(), nullable=True))
    op.add_column('servizi', sa.Column('url_documentazione', sa.String(500), nullable=True))
    op.add_column('servizi', sa.Column('note_tecniche', sa.Text(), nullable=True))


def downgrade():
    op.drop_column('servizi', 'note_tecniche')
    op.drop_column('servizi', 'url_documentazione')
    op.drop_column('servizi', 'garanzia_scadenza')
    op.drop_column('servizi', 'data_acquisto')
    op.drop_column('servizi', 'fornitore')
    op.drop_column('servizi', 'numero_licenza')
    op.drop_column('servizi', 'numero_seriale')
    op.drop_column('servizi', 'modello')
    op.drop_column('servizi', 'marca')
    op.drop_column('servizi', 'codice_sku')
