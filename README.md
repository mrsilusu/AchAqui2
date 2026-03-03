# AchAqui

Aplicação mobile (Expo/React Native) com frontend cliente/dono e backend NestJS + Prisma.

## Rebranding

O nome oficial do projeto é **AchAqui**.

## Configuração de ambiente (frontend)

Defina estas variáveis antes de iniciar o app:

- `EXPO_PUBLIC_BACKEND_URL` → URL pública do backend NestJS (deploy no Supabase/infra alvo)
- `EXPO_PUBLIC_SUPABASE_URL` → URL do projeto Supabase
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` → chave anon do Supabase

Exemplo:

```bash
export EXPO_PUBLIC_BACKEND_URL="https://SEU-BACKEND"
export EXPO_PUBLIC_SUPABASE_URL="https://SEU-PROJETO.supabase.co"
export EXPO_PUBLIC_SUPABASE_ANON_KEY="SEU_ANON_KEY"
```

## Execução

```bash
npm install
npx expo start --tunnel
```

## Realtime

O frontend usa Supabase Realtime para escutar alterações em reservas e notificações e sincronizar automaticamente as telas de Cliente/Dono sem refresh manual.
