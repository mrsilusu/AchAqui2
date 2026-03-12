#!/bin/bash
# AcheiAqui — Bugfix: roomTypes não apareciam após logout/login
# Uso no Codespace: bash bugfix-patch/apply.sh

PATCH="$(cd "$(dirname "$0")" && pwd)"
PROJECT="$(pwd)"

echo "🐛 AcheiAqui Bugfix — roomTypes owner"
echo "📁 Projeto: $PROJECT"
echo ""

dst="$PROJECT/src/modules/Owner/OwnerModule.jsx"
if [ -f "$dst" ]; then
  cp "$PATCH/src/modules/Owner/OwnerModule.jsx" "$dst"
  echo "  ✅ src/modules/Owner/OwnerModule.jsx"
else
  echo "  ⚠️  Ficheiro não encontrado: $dst"
fi

echo ""
echo "✅ Bugfix aplicado!"
