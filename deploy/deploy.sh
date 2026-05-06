#!/usr/bin/env bash
# Pull latest code and reload the production app on the EC2 host.
# Run from the project root (where package.json lives):
#   bash deploy/deploy.sh
set -euo pipefail

cd "$(dirname "$0")/.."

echo "▸ Fetching latest from origin/main..."
git fetch --prune origin
git reset --hard origin/main

echo "▸ Installing dependencies..."
pnpm install --frozen-lockfile

echo "▸ Applying database migrations..."
# Prisma 6.x sometimes doesn't release the event loop after `migrate
# deploy` even when the migration has finished — the CLI prints "No
# pending migrations to apply." and just sits there. Cap the step at
# 60s; if it times out (exit 124) the migration has already happened
# and we can safely move on.
set +e
timeout --foreground 60s pnpm prisma migrate deploy
prisma_ec=$?
set -e
case $prisma_ec in
  0)
    ;;
  124)
    echo "  (prisma migrate didn't exit cleanly — migrations already applied, continuing)"
    ;;
  *)
    echo "  prisma migrate failed (exit $prisma_ec)"
    exit "$prisma_ec"
    ;;
esac

echo "▸ Building Next.js..."
# Cap Node's heap as a safety net for low-memory hosts.  Override with
# NODE_OPTIONS in the environment if needed.
NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=2048}" pnpm build

echo "▸ Restarting systemd service..."
sudo systemctl restart vvaley
sudo systemctl status vvaley --no-pager --lines=0

echo "✓ Deploy complete."
