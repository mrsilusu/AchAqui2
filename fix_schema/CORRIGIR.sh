#!/usr/bin/env bash
# =============================================================
# AcheiAqui — Fix: Actualizar schema.prisma para v2 + regenerar
# Correr em: /workspaces/AchAqui2
# =============================================================
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT="/workspaces/AchAqui2"

echo "📋 A substituir schema.prisma..."
cp "$DIR/backend/prisma/schema.prisma" "$PROJECT/backend/prisma/schema.prisma"
echo "  ✅ schema.prisma v2 copiado"

echo "🔄 A regenerar Prisma Client..."
cd "$PROJECT/backend"
npx prisma generate

echo "🔨 A compilar TypeScript..."
npm run build

echo ""
echo "═══════════════════════════════════════"
echo "✅  Feito! Backend pronto."
echo "═══════════════════════════════════════"
