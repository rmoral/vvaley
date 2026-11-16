#!/usr/bin/env bash
# Copia diaria: base de datos (Amazon RDS) + imágenes subidas desde el admin.
#
# Qué hace, en este orden:
#   1. pg_dump de la base a la que apunta DATABASE_URL (la instancia RDS
#      vvaley-prod) → /var/backups/vvaley/vvaley-<fecha>.sql.gz
#   2. tar de public/uploads/ → /var/backups/vvaley/vvaley-uploads-<fecha>.tar.gz
#   3. Opcional: sube ambos ficheros a S3 (VVALEY_BACKUP_S3_URI).
#   4. Borra las copias locales con más de 14 días.
# Si un paso falla, los demás se intentan igualmente y el script acaba con
# código 1 para que systemd lo marque como fallido (journalctl lo muestra).
#
# Por qué cada cosa:
# - Las imágenes viven solo en el disco de la instancia, no en la base ni en
#   el repo. Sobreviven a un despliegue, pero no a perder la máquina.
# - RDS tiene sus propias copias automáticas (snapshots). El dump es una
#   segunda red, portátil y restaurable fuera de AWS. Se puede desactivar con
#   VVALEY_BACKUP_DB=0 si basta con las de RDS.
# - Una copia en el mismo disco no protege de perder la instancia: para eso
#   está la subida a S3.
#
# Configuración (en el .env de la web; solo se leen estas claves, nunca se
# evalúa el fichero):
#   DATABASE_URL            obligatoria si se copia la base
#   VVALEY_BACKUP_DB        "0" para no hacer pg_dump (por defecto se hace)
#   VVALEY_BACKUP_S3_URI    p. ej. s3://mi-bucket/vvaley — vacío = sin S3.
#                           Necesita la CLI `aws` y que la instancia tenga
#                           permiso s3:PutObject sobre ese prefijo (rol IAM).
#
# Instalación (una vez; como ubuntu con sudo):
#   sudo install -o root -g root -m 0755 deploy/backup-db.sh /usr/local/sbin/vvaley-db-backup
#   sudo install -o root -g root -m 0644 deploy/vvaley-db-backup.service /etc/systemd/system/
#   sudo install -o root -g root -m 0644 deploy/vvaley-db-backup.timer   /etc/systemd/system/
#   sudo mkdir -p /var/backups/vvaley && sudo chown ubuntu:ubuntu /var/backups/vvaley
#   sudo systemctl daemon-reload
#   sudo systemctl enable --now vvaley-db-backup.timer
#   sudo systemctl start vvaley-db-backup.service   # primera copia ya
#   journalctl -u vvaley-db-backup -n 30

set -uo pipefail
fallos=0

ENV_FILE="${VVALEY_ENV:-/home/ubuntu/web/vvaley/.env}"
APP_DIR="${VVALEY_APP_DIR:-$(dirname "$ENV_FILE")}"
BACKUP_DIR="${VVALEY_BACKUP_DIR:-/var/backups/vvaley}"
RETAIN_DAYS="${VVALEY_BACKUP_RETAIN_DAYS:-14}"

if [[ ! -r "$ENV_FILE" ]]; then
  echo "backup: no se puede leer $ENV_FILE (¿el servicio corre como el dueño del .env?)" >&2
  exit 1
fi

# Lee una clave del .env sin evaluarlo: quita comillas y espacios finales.
env_value() {
  grep -E "^$1=" "$ENV_FILE" | head -n1 | cut -d= -f2- | tr -d '"' | tr -d "'" | sed 's/[[:space:]]*$//'
}

DATABASE_URL="$(env_value DATABASE_URL)"
BACKUP_DB="${VVALEY_BACKUP_DB:-$(env_value VVALEY_BACKUP_DB)}"
S3_URI="${VVALEY_BACKUP_S3_URI:-$(env_value VVALEY_BACKUP_S3_URI)}"

mkdir -p "$BACKUP_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
creados=()

# ── 1. Base de datos (RDS) ───────────────────────────────────────────────

# Prisma admite parámetros en la URL que libpq rechaza ("invalid URI query
# parameter"), como schema, connection_limit o pgbouncer. Se conservan solo
# los que entiende libpq y afectan a la conexión (sobre todo sslmode).
libpq_url() {
  local url="$1" base query kept="" pair key
  base="${url%%\?*}"
  [[ "$url" == *\?* ]] || { echo "$base"; return; }
  query="${url#*\?}"
  IFS='&' read -ra pairs <<< "$query"
  for pair in "${pairs[@]}"; do
    key="${pair%%=*}"
    case "$key" in
      sslmode|sslrootcert|sslcert|sslkey|connect_timeout|application_name|options)
        kept+="${kept:+&}$pair" ;;
    esac
  done
  if [[ -n "$kept" ]]; then echo "$base?$kept"; else echo "$base"; fi
}

# El pg_dump más moderno instalado. Ubuntu deja cada versión en
# /usr/lib/postgresql/<n>/bin; el de PATH puede ser uno viejo.
pick_pg_dump() {
  local best="" best_ver=0 bin ver
  for bin in /usr/lib/postgresql/*/bin/pg_dump "$(command -v pg_dump 2>/dev/null)"; do
    [[ -x "$bin" ]] || continue
    ver="$("$bin" --version | grep -oE '[0-9]+' | head -n1)"
    if [[ -n "$ver" && "$ver" -gt "$best_ver" ]]; then best="$bin"; best_ver="$ver"; fi
  done
  echo "$best"
}

if [[ "$BACKUP_DB" == "0" ]]; then
  echo "backup: base de datos omitida (VVALEY_BACKUP_DB=0); se confía en las copias de RDS"
elif [[ -z "$DATABASE_URL" ]]; then
  echo "backup: falta DATABASE_URL en $ENV_FILE" >&2
  fallos=1
else
  DB_URL="$(libpq_url "$DATABASE_URL")"
  PG_DUMP="${VVALEY_PG_DUMP:-$(pick_pg_dump)}"
  PSQL="$(dirname "${PG_DUMP:-/usr/bin/pg_dump}")/psql"
  [[ -x "$PSQL" ]] || PSQL="$(command -v psql 2>/dev/null || true)"

  if [[ -z "$PG_DUMP" ]]; then
    echo "backup: no hay pg_dump instalado (sudo apt install postgresql-client)" >&2
    fallos=1
  else
    client_major="$("$PG_DUMP" --version | grep -oE '[0-9]+' | head -n1)"
    server_major=""
    if [[ -n "$PSQL" ]]; then
      server_num="$("$PSQL" "$DB_URL" -Atqc 'SHOW server_version_num' 2>/dev/null || true)"
      [[ "$server_num" =~ ^[0-9]+$ ]] && server_major=$((server_num / 10000))
    fi

    if [[ -n "$server_major" && "$client_major" -lt "$server_major" ]]; then
      # pg_dump se niega a volcar un servidor más nuevo que él.
      echo "backup: pg_dump $client_major es más antiguo que RDS ($server_major)." >&2
      echo "backup: instala el cliente $server_major (repositorio PGDG: postgresql-client-$server_major)" >&2
      fallos=1
    else
      OUT="$BACKUP_DIR/vvaley-$STAMP.sql.gz"
      echo "backup: volcando la base (pg_dump $client_major, servidor ${server_major:-?}) a $OUT"
      if "$PG_DUMP" --no-owner --no-privileges --clean --if-exists --quote-all-identifiers "$DB_URL" \
           | gzip -c > "$OUT.tmp"; then
        mv "$OUT.tmp" "$OUT"
        chmod 0640 "$OUT"
        creados+=("$OUT")
      else
        echo "backup: pg_dump falló" >&2
        rm -f "$OUT.tmp"
        fallos=1
      fi
    fi
  fi
fi

# ── 2. Imágenes subidas desde el back-office ─────────────────────────────

UPLOADS="$APP_DIR/public/uploads"
if [[ -d "$UPLOADS" ]]; then
  OUT_UP="$BACKUP_DIR/vvaley-uploads-$STAMP.tar.gz"
  echo "backup: archivando $UPLOADS en $OUT_UP"
  # -C para guardar rutas relativas: se restaura con
  #   tar -xzf <fichero> -C /home/ubuntu/web/vvaley/public
  if tar -czf "$OUT_UP.tmp" -C "$APP_DIR/public" uploads; then
    mv "$OUT_UP.tmp" "$OUT_UP"
    chmod 0640 "$OUT_UP"
    creados+=("$OUT_UP")
  else
    echo "backup: el tar de uploads falló" >&2
    rm -f "$OUT_UP.tmp"
    fallos=1
  fi
else
  echo "backup: $UPLOADS no existe todavía, se omite"
fi

# ── 3. Copia fuera de la instancia (opcional) ────────────────────────────

if [[ -n "$S3_URI" ]]; then
  if ! command -v aws >/dev/null 2>&1; then
    echo "backup: VVALEY_BACKUP_S3_URI está definido pero no hay CLI aws instalada" >&2
    fallos=1
  else
    for f in "${creados[@]}"; do
      if aws s3 cp --only-show-errors "$f" "${S3_URI%/}/$(basename "$f")"; then
        echo "backup: subido a ${S3_URI%/}/$(basename "$f")"
      else
        echo "backup: falló la subida a S3 de $(basename "$f")" >&2
        fallos=1
      fi
    done
  fi
else
  echo "backup: sin VVALEY_BACKUP_S3_URI, las copias quedan solo en este disco"
fi

# ── 4. Limpieza local ────────────────────────────────────────────────────

find "$BACKUP_DIR" -maxdepth 1 -type f \
  \( -name 'vvaley-*.sql.gz' -o -name 'vvaley-uploads-*.tar.gz' \) \
  -mtime "+${RETAIN_DAYS}" -print -delete

if [[ $fallos -ne 0 ]]; then
  echo "backup: terminado CON ERRORES" >&2
  exit 1
fi
echo "backup: hecho"
