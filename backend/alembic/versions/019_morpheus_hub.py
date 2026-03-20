"""Crea organizzazione Morpheus Hub e sposta admin@admin.local e Germano

Revision ID: 019
Revises: 018
Create Date: 2026-03-20
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text

revision = '019'
down_revision = '018'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()

    # 1. Crea Morpheus Hub se non esiste
    existing = conn.execute(
        text("SELECT id FROM organizzazioni WHERE nome = 'Morpheus Hub'")
    ).fetchone()

    if existing is None:
        conn.execute(
            text("""
                INSERT INTO organizzazioni (nome, attivo, licenza_attiva, created_at, updated_at)
                VALUES ('Morpheus Hub', TRUE, TRUE, NOW(), NOW())
            """)
        )

    # 2. Recupera l'id di Morpheus Hub
    org_row = conn.execute(
        text("SELECT id FROM organizzazioni WHERE nome = 'Morpheus Hub'")
    ).fetchone()
    morpheus_id = org_row[0]

    # 3. Sposta admin@admin.local a Morpheus Hub
    conn.execute(
        text("""
            UPDATE users
            SET organizzazione_id = :org_id
            WHERE email = 'admin@admin.local'
        """),
        {"org_id": morpheus_id}
    )

    # 4. Sposta l'utente con nome 'Germano' a Morpheus Hub
    conn.execute(
        text("""
            UPDATE users
            SET organizzazione_id = :org_id
            WHERE nome = 'Germano' OR LOWER(nome) = 'germano'
        """),
        {"org_id": morpheus_id}
    )

    print(f"✓ Organizzazione 'Morpheus Hub' (id={morpheus_id}) creata/confermata")
    print("✓ Utenti admin@admin.local e Germano spostati in Morpheus Hub")


def downgrade():
    conn = op.get_bind()

    # Rimuovi l'assegnazione org degli utenti spostati
    conn.execute(
        text("""
            UPDATE users
            SET organizzazione_id = NULL
            WHERE email = 'admin@admin.local'
        """)
    )

    # Sposta Germano all'org di default (id=1) se esiste
    conn.execute(
        text("""
            UPDATE users
            SET organizzazione_id = 1
            WHERE nome = 'Germano' OR LOWER(nome) = 'germano'
        """)
    )

    # Elimina Morpheus Hub
    conn.execute(
        text("DELETE FROM organizzazioni WHERE nome = 'Morpheus Hub'")
    )
