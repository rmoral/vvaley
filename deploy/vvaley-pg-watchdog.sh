#!/usr/bin/env bash
# Cada minuto: comprueba si Postgres responde. Si no, lo levanta y rebota
# vvaley (para que Prisma renueve el pool de conexiones). Logs vía syslog
# para que aparezcan en `journalctl -t vvaley-pg-watchdog`.
#
# Install:
#   sudo install -o root -g root -m 0755 deploy/vvaley-pg-watchdog.sh /usr/local/sbin/vvaley-pg-watchdog
#   sudo install -o root -g root -m 0644 deploy/vvaley-pg-watchdog.service /etc/systemd/system/
#   sudo install -o root -g root -m 0644 deploy/vvaley-pg-watchdog.timer   /etc/systemd/system/
#   sudo systemctl daemon-reload
#   sudo systemctl enable --now vvaley-pg-watchdog.timer

set -euo pipefail

PG_HOST="${VVALEY_PG_HOST:-127.0.0.1}"
PG_PORT="${VVALEY_PG_PORT:-5432}"
PG_CLUSTER_VER="${VVALEY_PG_CLUSTER_VER:-12}"
PG_CLUSTER_NAME="${VVALEY_PG_CLUSTER_NAME:-main}"
APP_SERVICE="${VVALEY_APP_SERVICE:-vvaley}"

log() { logger -t vvaley-pg-watchdog -- "$*"; }

# pg_isready vuelve 0 si el server acepta conexiones; cualquier otra cosa
# es problema (sin conexión, rechaza, timeout…).
if pg_isready -h "$PG_HOST" -p "$PG_PORT" -q -t 5; then
  exit 0
fi

log "Postgres no responde en $PG_HOST:$PG_PORT — intentando levantar cluster $PG_CLUSTER_VER/$PG_CLUSTER_NAME"

# pg_ctlcluster es idempotente: si ya está arriba no hace daño.
pg_ctlcluster "$PG_CLUSTER_VER" "$PG_CLUSTER_NAME" start || \
  log "pg_ctlcluster start devolvió error (puede ser carrera con systemd)"

sleep 5

if pg_isready -h "$PG_HOST" -p "$PG_PORT" -q -t 5; then
  log "Postgres recuperado — reiniciando $APP_SERVICE para renovar pool Prisma"
  systemctl restart "$APP_SERVICE" || log "fallo al reiniciar $APP_SERVICE"
else
  log "Postgres SIGUE caído tras el intento de start — requiere intervención manual"
  exit 1
fi
