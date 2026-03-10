#!/usr/bin/env bash
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
P="/workspaces/AchAqui2"
cp "$DIR/backend/prisma/validate-bookings.ts" "$P/backend/prisma/"
echo "✅ validate-bookings.ts corrigido"
cd "$P/backend" && npm run build
echo "✅ Build limpo!"
