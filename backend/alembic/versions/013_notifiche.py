"""013 - crea tabella notifiche"""
revision = '013'
down_revision = '012'

from alembic import op


def upgrade():
    op.execute("""
        CREATE TABLE IF NOT EXISTS notifiche (
            id          SERIAL PRIMARY KEY,
            organizzazione_id INTEGER NOT NULL
                REFERENCES organizzazioni(id) ON DELETE CASCADE,
            user_id     INTEGER NOT NULL
                REFERENCES users(id) ON DELETE CASCADE,
            tipo        VARCHAR(50)  NOT NULL,
            titolo      VARCHAR(255) NOT NULL,
            messaggio   TEXT,
            ticket_id   INTEGER REFERENCES tickets(id) ON DELETE SET NULL,
            letta       BOOLEAN NOT NULL DEFAULT FALSE,
            created_at  TIMESTAMP DEFAULT NOW()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_notifiche_user_id ON notifiche(user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_notifiche_org_id  ON notifiche(organizzazione_id)")


def downgrade():
    op.execute("DROP TABLE IF EXISTS notifiche")
