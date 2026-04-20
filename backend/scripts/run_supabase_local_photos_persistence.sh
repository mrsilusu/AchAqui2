#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

SCHEMA_PATH="prisma/schema.prisma"
MIGRATION_NAME="add_photos_to_business"

echo "== AchAqui / Supabase local: migração photos no Business =="
echo "Project root: $ROOT_DIR"

if ! command -v npx >/dev/null 2>&1; then
  echo "Erro: npx não encontrado no PATH." >&2
  exit 1
fi

if [[ ! -f "$SCHEMA_PATH" ]]; then
  echo "Erro: schema Prisma não encontrado em $SCHEMA_PATH" >&2
  exit 1
fi

# Carrega variáveis de ambiente locais (se existirem)
if [[ -f ".env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi
if [[ -f ".env.local" ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Aviso: DATABASE_URL não está definido no ambiente/.env." >&2
  echo "Se estiveres no Supabase local, define algo como:" >&2
  echo "  export DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:54322/postgres'" >&2
  exit 1
fi

echo "[1/4] Verificar conexão Prisma"
npx prisma db execute --schema "$SCHEMA_PATH" --stdin <<'SQL'
SELECT 1;
SQL

echo "[2/4] Executar migration dev: $MIGRATION_NAME"
npx prisma migrate dev --name "$MIGRATION_NAME"

echo "[3/4] Regenerar Prisma Client"
npx prisma generate

echo "[4/4] Verificar coluna photos na tabela Business"
QUERY_RESULT="$(npx prisma db execute --schema "$SCHEMA_PATH" --stdin <<'SQL'
SELECT column_name
FROM information_schema.columns
WHERE table_name='Business' AND column_name='photos';
SQL
)"

echo "$QUERY_RESULT"

echo "Concluído."
echo "Se quiseres validar manualmente no SQL Editor do Supabase, usa:" 
echo "SELECT column_name FROM information_schema.columns WHERE table_name='Business' AND column_name='photos';"
