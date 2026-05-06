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
# Cap Node's heap so the build doesn't OOM on small EC2 instances
# (t2/t3.micro has 1 GB of RAM; even with swap the build can balloon
# while compiling [locale] in 4 languages plus React 19's RSC output).
# Override with NODE_OPTIONS in the environment if needed.
NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=1024}" pnpm build

echo "▸ Restarting systemd service..."
sudo systemctl restart vvaley
sudo systemctl status vvaley --no-pager --lines=0

echo "✓ Deploy complete."
