#!/bin/bash
# Esporta il database da ZimaOS in un file .sql.gz
# Uso: ./scripts/db_export.sh
# Output: backups/db_YYYYMMDD_HHMMSS.sql.gz

set -e

BACKUP_DIR="$(dirname "$0")/../backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/db_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "→ Esporto database da ZimaOS..."
docker compose exec -T db pg_dump -U tickets tickets | gzip > "$BACKUP_FILE"

echo "✓ Backup salvato in: $BACKUP_FILE"
echo "  Dimensione: $(du -sh "$BACKUP_FILE" | cut -f1)"
