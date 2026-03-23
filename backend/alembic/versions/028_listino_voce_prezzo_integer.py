"""Converte listino_voci.prezzo da VARCHAR a INTEGER (centesimi)

Revision ID: 028
Revises: 027
Create Date: 2026-03-23
"""
from alembic import op
import sqlalchemy as sa

revision = '028'
down_revision = '027'
branch_labels = None
depends_on = None


def upgrade():
    # Aggiunge colonna temporanea intera
    op.add_column('listino_voci', sa.Column('prezzo_int', sa.Integer(), nullable=True))

    # Converte i valori stringa esistenti in centesimi
    op.execute(
        r"""
        UPDATE listino_voci
        SET prezzo_int = ROUND(
            CAST(NULLIF(TRIM(prezzo), '') AS NUMERIC) * 100
        )
        WHERE prezzo IS NOT NULL AND prezzo != ''
          AND prezzo ~ '^[0-9]+(\.[0-9]+)?$'
        """
    )

    # Rimuove la vecchia colonna stringa e rinomina quella nuova
    op.drop_column('listino_voci', 'prezzo')
    op.alter_column('listino_voci', 'prezzo_int', new_column_name='prezzo')


def downgrade():
    op.add_column('listino_voci', sa.Column('prezzo_str', sa.String(50), nullable=True))
    op.execute("""
        UPDATE listino_voci
        SET prezzo_str = CAST(prezzo::numeric / 100 AS TEXT)
        WHERE prezzo IS NOT NULL
    """)
    op.drop_column('listino_voci', 'prezzo')
    op.alter_column('listino_voci', 'prezzo_str', new_column_name='prezzo')
