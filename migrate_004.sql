-- Migrazione 004: sostituisce registrata con nr_progressivo
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS nr_progressivo INTEGER;
ALTER TABLE tickets DROP COLUMN IF EXISTS registrata;

-- Aggiorna la versione alembic
UPDATE alembic_version SET version_num = '004';
