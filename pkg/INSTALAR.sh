#!/usr/bin/env bash
# =============================================================
# AcheiAqui — Sprint 1 PMS  |  Correr na raiz: /workspaces/AchAqui2
# =============================================================
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
PROJECT="/workspaces/AchAqui2"

echo "📦 A instalar Sprint 1 PMS em $PROJECT ..."

# Backend — módulo HT
mkdir -p "$PROJECT/backend/src/ht-booking/dto"
cp "$ROOT/backend/src/ht-booking/dto/check-in.dto.ts"       "$PROJECT/backend/src/ht-booking/dto/"
cp "$ROOT/backend/src/ht-booking/ht-booking.controller.ts"  "$PROJECT/backend/src/ht-booking/"
cp "$ROOT/backend/src/ht-booking/ht-booking.module.ts"      "$PROJECT/backend/src/ht-booking/"
cp "$ROOT/backend/src/ht-booking/ht-booking.service.ts"     "$PROJECT/backend/src/ht-booking/"
echo "  ✅ backend/src/ht-booking/ criado"

# app.module.ts (já patchado)
cp "$ROOT/backend/src/app.module.ts" "$PROJECT/backend/src/app.module.ts"
echo "  ✅ app.module.ts atualizado"

# Frontend
cp "$ROOT/src/operations/ReceptionScreen.jsx"  "$PROJECT/src/operations/"
cp "$ROOT/src/lib/backendApi.js"               "$PROJECT/src/lib/"
cp "$ROOT/src/operations/HospitalityModule.jsx" "$PROJECT/src/operations/"
echo "  ✅ frontend atualizado"

# Regenerar Prisma Client
echo "🔄 npx prisma generate ..."
cd "$PROJECT/backend" && npx prisma generate

echo ""
echo "═══════════════════════════════════════════════"
echo "✅  Sprint 1 instalado!"
echo "   Testar: cd backend && npm run build"
echo "═══════════════════════════════════════════════"
