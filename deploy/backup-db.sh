#!/usr/bin/env bash
# Daily Postgres backup. Reads DATABASE_URL from /home/ubuntu/web/vvaley/.env
# and writes a gzipped pg_dump under /var/backups/vvaley/. Keeps the last
# 14 daily snapshots, then prunes.
#
# Install once:
#   sudo install -o root -g root -m 0755 deploy/backup-db.sh /usr/local/sbin/vvaley-db-backup
#   sudo install -o root -g root -m 0644 deploy/vvaley-db-backup.service /etc/systemd/system/
#   sudo install -o root -g root -m 0644 deploy/vvaley-db-backup.timer   /etc/systemd/system/
#   sudo mkdir -p /var/backups/vvaley && sudo chown postgres:postgres /var/backups/vvaley
#   sudo systemctl daemon-reload
#   sudo systemctl enable --now vvaley-db-backup.timer

set -euo pipefail

ENV_FILE="${VVALEY_ENV:-/home/ubuntu/web/vvaley/.env}"
BACKUP_DIR="${VVALEY_BACKUP_DIR:-/var/backups/vvaley}"
RETAIN_DAYS="${VVALEY_BACKUP_RETAIN_DAYS:-14}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "backup: $ENV_FILE not found" >&2
  exit 1
fi

# Source DATABASE_URL only — avoid evaluating arbitrary entries in .env.
DATABASE_URL="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -n1 | cut -d= -f2- | tr -d '"' | tr -d "'")"
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "backup: DATABASE_URL missing from $ENV_FILE" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="$BACKUP_DIR/vvaley-$STAMP.sql.gz"

echo "backup: dumping to $OUT"
pg_dump --no-owner --clean --if-exists --quote-all-identifiers "$DATABASE_URL" \
  | gzip -c > "$OUT.tmp"
mv "$OUT.tmp" "$OUT"
chmod 0640 "$OUT"

# Prune anything older than RETAIN_DAYS days.
find "$BACKUP_DIR" -maxdepth 1 -type f -name 'vvaley-*.sql.gz' -mtime "+${RETAIN_DAYS}" -print -delete

echo "backup: done"
