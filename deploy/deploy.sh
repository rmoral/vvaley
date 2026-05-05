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
pnpm prisma migrate deploy

echo "▸ Building Next.js..."
pnpm build

echo "▸ Reloading PM2..."
if pm2 describe vvaley >/dev/null 2>&1; then
  pm2 reload vvaley --update-env
else
  pm2 start ecosystem.config.cjs
fi
pm2 save

echo "✓ Deploy complete."
