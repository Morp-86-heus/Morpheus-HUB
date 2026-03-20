"""014 - crea tabelle contabilità (fatture, fattura_voci, pagamenti)"""
revision = '014'
down_revision = '013'

from alembic import op


def upgrade():
    op.execute("""
        CREATE TABLE IF NOT EXISTS fatture (
            id                SERIAL PRIMARY KEY,
            numero            VARCHAR(20) NOT NULL UNIQUE,
            organizzazione_id INTEGER REFERENCES organizzazioni(id) ON DELETE SET NULL,
            data_emissione    DATE NOT NULL,
            data_scadenza     DATE,
            stato             VARCHAR(20) NOT NULL DEFAULT 'bozza',
            importo_totale    INTEGER NOT NULL DEFAULT 0,
            note              TEXT,
            created_at        TIMESTAMP DEFAULT NOW(),
            updated_at        TIMESTAMP DEFAULT NOW()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_fatture_stato             ON fatture(stato)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_fatture_data_emissione    ON fatture(data_emissione)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_fatture_organizzazione_id ON fatture(organizzazione_id)")

    op.execute("""
        CREATE TABLE IF NOT EXISTS fattura_voci (
            id              SERIAL PRIMARY KEY,
            fattura_id      INTEGER NOT NULL REFERENCES fatture(id) ON DELETE CASCADE,
            descrizione     VARCHAR(300) NOT NULL,
            quantita        INTEGER NOT NULL DEFAULT 1,
            prezzo_unitario INTEGER NOT NULL DEFAULT 0,
            importo         INTEGER NOT NULL DEFAULT 0,
            created_at      TIMESTAMP DEFAULT NOW()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_fattura_voci_fattura_id ON fattura_voci(fattura_id)")

    op.execute("""
        CREATE TABLE IF NOT EXISTS pagamenti (
            id             SERIAL PRIMARY KEY,
            fattura_id     INTEGER NOT NULL REFERENCES fatture(id) ON DELETE CASCADE,
            data_pagamento DATE NOT NULL,
            importo        INTEGER NOT NULL,
            metodo         VARCHAR(20) NOT NULL DEFAULT 'bonifico',
            note           TEXT,
            created_at     TIMESTAMP DEFAULT NOW()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_pagamenti_fattura_id ON pagamenti(fattura_id)")


def downgrade():
    op.execute("DROP TABLE IF EXISTS pagamenti")
    op.execute("DROP TABLE IF EXISTS fattura_voci")
    op.execute("DROP TABLE IF EXISTS fatture")
