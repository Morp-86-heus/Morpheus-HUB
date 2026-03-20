#!/bin/bash
# Sincronizza il DB da ZimaOS → Hostinger in un unico comando
# Uso: ./scripts/db_sync_to_hostinger.sh
#
# Configurazione: modifica le variabili qui sotto oppure crea un file
# scripts/.env.sync con le stesse variabili per non toccare questo script.

set -e

SCRIPT_DIR="$(dirname "$0")"

# ── Carica configurazione da file .env.sync se esiste ────────────────────────
if [ -f "$SCRIPT_DIR/.env.sync" ]; then
    source "$SCRIPT_DIR/.env.sync"
fi

# ── Configurazione Hostinger (modifica qui oppure in .env.sync) ──────────────
HOSTINGER_USER="${HOSTINGER_USER:-root}"
HOSTINGER_HOST="${HOSTINGER_HOST:-}"          # es: 185.123.45.67
HOSTINGER_PORT="${HOSTINGER_PORT:-22}"
HOSTINGER_PATH="${HOSTINGER_PATH:-/root/interventi_tecnici}"

# ─────────────────────────────────────────────────────────────────────────────

if [ -z "$HOSTINGER_HOST" ]; then
    echo "Errore: HOSTINGER_HOST non configurato."
    echo "Modifica scripts/.env.sync oppure imposta la variabile:"
    echo "  HOSTINGER_HOST=185.x.x.x ./scripts/db_sync_to_hostinger.sh"
    exit 1
fi

BACKUP_DIR="$SCRIPT_DIR/../backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/db_${TIMESTAMP}.sql.gz"
REMOTE_TMP="/tmp/db_sync_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Sync DB: ZimaOS → Hostinger"
echo "  Destinazione: ${HOSTINGER_USER}@${HOSTINGER_HOST}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. Esporta
echo ""
echo "[1/4] Esporto database da ZimaOS..."
docker compose exec -T db pg_dump -U tickets tickets | gzip > "$BACKUP_FILE"
echo "      Backup: $BACKUP_FILE ($(du -sh "$BACKUP_FILE" | cut -f1))"

# 2. Trasferisci
echo ""
echo "[2/4] Trasferisco il backup su Hostinger..."
scp -P "$HOSTINGER_PORT" "$BACKUP_FILE" "${HOSTINGER_USER}@${HOSTINGER_HOST}:${REMOTE_TMP}"

# 3. Importa su Hostinger
echo ""
echo "[3/4] Importo il backup su Hostinger..."
ssh -p "$HOSTINGER_PORT" "${HOSTINGER_USER}@${HOSTINGER_HOST}" bash << EOF
set -e
cd "$HOSTINGER_PATH"

echo "  → Fermo il backend..."
docker compose stop backend

echo "  → Svuoto il database..."
docker compose exec -T db psql -U tickets -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" tickets

echo "  → Importo..."
gunzip -c "$REMOTE_TMP" | docker compose exec -T db psql -U tickets tickets

echo "  → Riavvio il backend..."
docker compose start backend

sleep 3

echo "  → Migrazioni pendenti..."
docker compose exec -T backend alembic upgrade head

rm -f "$REMOTE_TMP"
EOF

# 4. Pulizia locale (mantieni solo gli ultimi 5 backup)
echo ""
echo "[4/4] Pulizia backup locali (mantengo gli ultimi 5)..."
ls -t "$BACKUP_DIR"/db_*.sql.gz 2>/dev/null | tail -n +6 | xargs -r rm -f

echo ""
echo "✓ Sync completato con successo"
