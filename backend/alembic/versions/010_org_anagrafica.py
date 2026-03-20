"""Aggiunge campi anagrafica e fatturazione alla tabella organizzazioni

Revision ID: 010
Revises: 009
Create Date: 2026-03-18
"""
from alembic import op
import sqlalchemy as sa

revision = '010'
down_revision = '009'
branch_labels = None
depends_on = None

NEW_COLUMNS = [
    # Dati legali
    ("ragione_sociale",      sa.String(200)),
    ("forma_giuridica",      sa.String(100)),
    ("partita_iva",          sa.String(20)),
    ("codice_fiscale",       sa.String(20)),
    # Sede legale
    ("via",                  sa.String(200)),
    ("civico",               sa.String(10)),
    ("cap",                  sa.String(10)),
    ("citta",                sa.String(100)),
    ("provincia",            sa.String(5)),
    ("regione",              sa.String(100)),
    # Contatti
    ("telefono",             sa.String(50)),
    ("email",                sa.String(200)),
    ("pec",                  sa.String(200)),
    ("sito_web",             sa.String(200)),
    # Referente
    ("referente_nome",       sa.String(200)),
    ("referente_ruolo",      sa.String(100)),
    ("referente_telefono",   sa.String(50)),
    ("referente_email",      sa.String(200)),
    # Fatturazione
    ("regime_fiscale",       sa.String(100)),
    ("codice_sdi",           sa.String(10)),
    ("pec_fatturazione",     sa.String(200)),
    ("iban",                 sa.String(34)),
    ("banca",                sa.String(200)),
    ("intestatario_conto",   sa.String(200)),
    ("note_fatturazione",    sa.Text),
]


def upgrade():
    conn = op.get_bind()
    for col_name, col_type in NEW_COLUMNS:
        exists = conn.execute(sa.text(
            "SELECT 1 FROM information_schema.columns "
            "WHERE table_name='organizzazioni' AND column_name=:c"
        ), {"c": col_name}).fetchone()
        if not exists:
            op.add_column("organizzazioni", sa.Column(col_name, col_type, nullable=True))


def downgrade():
    for col_name, _ in NEW_COLUMNS:
        op.drop_column("organizzazioni", col_name)
