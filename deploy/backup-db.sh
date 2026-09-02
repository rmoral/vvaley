#!/usr/bin/env bash
# Daily backup: Postgres + las imágenes subidas desde el back-office.
#
# Reads DATABASE_URL from /home/ubuntu/web/vvaley/.env and writes a gzipped
# pg_dump plus a tar de public/uploads/ under /var/backups/vvaley/. Keeps the
# last 14 daily snapshots of each, then prunes.
#
# Las subidas iban fuera de la copia: viven en el disco de la instancia y no
# en la base. Sobreviven a un despliegue (git reset --hard no toca ficheros sin
# seguimiento) pero no a un cambio de máquina, y este proyecto ya tuvo que
# tirar una instancia entera. Un tar diario cuesta segundos.
#
# Install once:
#   sudo install -o root -g root -m 0755 deploy/backup-db.sh /usr/local/sbin/vvaley-db-backup
#   sudo install -o root -g root -m 0644 deploy/vvaley-db-backup.service /etc/systemd/system/
#   sudo install -o root -g root -m 0644 deploy/vvaley-db-backup.timer   /etc/systemd/system/
#   sudo mkdir -p /var/backups/vvaley && sudo chown postgres:postgres /var/backups/vvaley
#   sudo systemctl daemon-reload
#   sudo systemctl enable --now vvaley-db-backup.timer

set -uo pipefail
fallos=0

ENV_FILE="${VVALEY_ENV:-/home/ubuntu/web/vvaley/.env}"
APP_DIR="${VVALEY_APP_DIR:-$(dirname "$ENV_FILE")}"
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
if pg_dump --no-owner --clean --if-exists --quote-all-identifiers "$DATABASE_URL" \
     | gzip -c > "$OUT.tmp"; then
  mv "$OUT.tmp" "$OUT"
  chmod 0640 "$OUT"
else
  echo "backup: pg_dump falló" >&2
  rm -f "$OUT.tmp"
  fallos=1
fi

# ── Imágenes subidas desde el back-office ────────────────────────────────
UPLOADS="$APP_DIR/public/uploads"
if [[ -d "$UPLOADS" ]]; then
  OUT_UP="$BACKUP_DIR/vvaley-uploads-$STAMP.tar.gz"
  echo "backup: archiving $UPLOADS to $OUT_UP"
  # -C para guardar rutas relativas: así se restaura con tar -xzf sin
  # reconstruir /home/ubuntu/web/... a mano.
  if tar -czf "$OUT_UP.tmp" -C "$APP_DIR/public" uploads; then
    mv "$OUT_UP.tmp" "$OUT_UP"
    chmod 0640 "$OUT_UP"
  else
    echo "backup: el tar de uploads falló" >&2
    rm -f "$OUT_UP.tmp"
    fallos=1
  fi
else
  echo "backup: $UPLOADS no existe todavía, se omite"
fi

# Prune anything older than RETAIN_DAYS days.
find "$BACKUP_DIR" -maxdepth 1 -type f \
  \( -name 'vvaley-*.sql.gz' -o -name 'vvaley-uploads-*.tar.gz' \) \
  -mtime "+${RETAIN_DAYS}" -print -delete

if [[ $fallos -ne 0 ]]; then
  echo "backup: terminado CON ERRORES" >&2
  exit 1
fi
echo "backup: done"
