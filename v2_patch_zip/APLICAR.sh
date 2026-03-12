#!/usr/bin/env bash
# ================================================================
# AcheiAqui — Patch v2: corrigir nomes de modelos Prisma
# Correr em: /workspaces/AchAqui2
# ================================================================
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
P="/workspaces/AchAqui2"

echo "📋 A aplicar patches v2..."

cp "$DIR/backend/src/booking/booking.service.ts"        "$P/backend/src/booking/"
cp "$DIR/backend/src/booking/dto/create-booking.dto.ts" "$P/backend/src/booking/dto/"
cp "$DIR/backend/src/auth/auth.service.ts"              "$P/backend/src/auth/"
cp "$DIR/backend/src/item/item.service.ts"              "$P/backend/src/item/"
cp "$DIR/backend/prisma/validate-bookings.ts"           "$P/backend/prisma/"
cp "$DIR/backend/prisma/seed-validate-bookings.ts"      "$P/backend/prisma/"

echo "  ✅ 6 ficheiros actualizados"
echo "🔨 A compilar..."
cd "$P/backend" && npm run build

echo ""
echo "═════════════════════════════════"
echo "✅  Build limpo — sem erros!"
echo "═════════════════════════════════"
