#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "[1/2] Running Prisma migration: add_photos_to_business"
npx prisma migrate dev --name add_photos_to_business

echo "[2/2] Generating Prisma client"
npx prisma generate

echo "Done."
echo "Optional verification SQL (run in your DB client):"
echo "SELECT column_name FROM information_schema.columns WHERE table_name='Business' AND column_name='photos';"
