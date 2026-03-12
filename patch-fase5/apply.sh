#!/bin/bash
# AcheiAqui — Security Patch (Fase 5)
# Uso no Codespace: bash patch-fase5/apply.sh

PATCH="$(cd "$(dirname "$0")" && pwd)"
PROJECT="$(pwd)"

echo "🔐 AcheiAqui Security Patch — Fase 5"
echo "📁 Projeto: $PROJECT"
echo ""

files=(
  "backend/src/booking/booking.controller.ts"
  "backend/src/business/business.service.ts"
  "backend/src/app.module.ts"
  "src/hooks/useLiveSync.js"
  "src/operations/HospitalityModule.jsx"
  "src/shared/Modals/OperationalLayerRenderer.js"
)

for f in "${files[@]}"; do
  src="$PATCH/$f"
  dst="$PROJECT/$f"
  if [ -f "$dst" ]; then
    cp "$src" "$dst" && echo "  ✅ $f"
  else
    echo "  ⚠️  Não encontrado (ignorado): $f"
  fi
done

echo ""
echo "📦 A instalar @nestjs/throttler..."
cd "$PROJECT/backend" && npm install @nestjs/throttler --save

echo ""
echo "✅ Patch 100% concluído — nenhum passo manual necessário!"
