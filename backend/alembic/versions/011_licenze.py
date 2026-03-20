"""Aggiunge gestione licenze alle organizzazioni

Revision ID: 011
Revises: 010
Create Date: 2026-03-18
"""
from alembic import op
import sqlalchemy as sa

revision = '011'
down_revision = '010'
branch_labels = None
depends_on = None

NEW_COLUMNS = [
    ("piano",            sa.String(50),  True,  None),
    ("licenza_attiva",   sa.Boolean,     False, 'false'),
    ("trial_attivato",   sa.Boolean,     False, 'false'),
    ("trial_scadenza",   sa.DateTime,    True,  None),
    ("licenza_scadenza", sa.DateTime,    True,  None),
    ("note_licenza",     sa.Text,        True,  None),
]


def upgrade():
    conn = op.get_bind()
    for col_name, col_type, nullable, server_default in NEW_COLUMNS:
        exists = conn.execute(sa.text(
            "SELECT 1 FROM information_schema.columns "
            "WHERE table_name='organizzazioni' AND column_name=:c"
        ), {"c": col_name}).fetchone()
        if not exists:
            op.add_column(
                "organizzazioni",
                sa.Column(col_name, col_type, nullable=nullable, server_default=server_default),
            )


def downgrade():
    for col_name, *_ in NEW_COLUMNS:
        op.drop_column("organizzazioni", col_name)
