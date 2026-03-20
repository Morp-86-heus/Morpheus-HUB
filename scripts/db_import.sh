#!/bin/bash
# Importa un backup .sql.gz nel database locale (da eseguire su Hostinger)
# Uso: ./scripts/db_import.sh <file.sql.gz>

set -e

BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
    echo "Uso: $0 <file.sql.gz>"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Errore: file '$BACKUP_FILE' non trovato"
    exit 1
fi

echo "⚠️  Questo sovrascriverà il database corrente su questo server."
read -p "Sei sicuro? (scrivi 'si' per confermare): " CONFIRM
if [ "$CONFIRM" != "si" ]; then
    echo "Operazione annullata."
    exit 0
fi

echo "→ Fermo il backend per evitare scritture durante l'import..."
docker compose stop backend

echo "→ Svuoto il database corrente..."
docker compose exec -T db psql -U tickets -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" tickets

echo "→ Importo il backup..."
gunzip -c "$BACKUP_FILE" | docker compose exec -T db psql -U tickets tickets

echo "→ Riavvio il backend..."
docker compose start backend

echo "→ Eseguo migrazioni pendenti..."
sleep 3
docker compose exec -T backend alembic upgrade head

echo "✓ Import completato"
