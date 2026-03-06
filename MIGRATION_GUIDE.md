# 📋 Database Migration & Validation Guide

Guia passo-a-passo para migrar a base de dados e validar as mudanças de bookings separados (mesa vs quarto).

## 🎯 Objetivo

Aplicar a mudança de schema Prisma que:
1. **Renomeia** tabela `Booking` → `table_bookings` (reservas de mesas)
2. **Cria** nova tabela `room_bookings` (reservas de quartos)
3. **Separa** logicamente os dois tipos de reservas no banco

## 📝 Pré-requisitos

- ✅ Código backend compilado (`npm run build` passou)
- ✅ Prisma client gerado (`npx prisma generate`)
- ✅ Variável `DATABASE_URL` configurada no `.env`
- ✅ Acesso ao Supabase PostgreSQL

## 🚀 Passos de Execução

### Passo 1: Backup do Banco (Recomendado)

Antes de aplicar mudanças à base de dados em produção, faça um backup:

```bash
# Se usar Supabase, use o dashboard para backup
# Ou via psql (se disponível):
pg_dump "$DATABASE_URL" > backup-pre-migration-$(date +%s).sql
```

### Passo 2: Aplicar Migração

Opção A - Com Prisma (Recomendado):
```bash
cd /workspaces/AchAqui2/backend

# Força rebuild do cliente Prisma com novo schema
npx prisma generate

# Aplica migração à base de dados
npx prisma migrate deploy
```

Opção B - Se houver timeout em Prisma:
```bash
# Use db push para desenvolvimento
npx prisma db push

# Ou execute SQL manualmente via psql/Supabase SQL Editor
# Veja arquivo: prisma/migrations/separate_table_and_room_bookings/migration.sql
```

### Passo 3: Validar Schema

Verifique que as tabelas foram criadas:

```bash
cd /workspaces/AchAqui2/backend

# Lista tabelas
npx prisma db execute --stdin <<'EOF'
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
EOF

# Esperado output incluir:
# - table_bookings
# - room_bookings
# - (outras tabelas existentes)
```

### Passo 4: Rodar Seed de Validação

Script cria dados de teste para validar dual-booking:

```bash
cd /workspaces/AchAqui2/backend

# Executa seed
npx tsx prisma/seed-validate-bookings.ts

# Esperado output:
# ✅ Created test user: [uuid]
# ✅ Created test business: [uuid]
# ✅ Created table booking: table-booking-1-[timestamp]
# ✅ Created table booking: table-booking-2-[timestamp]
# ✅ Created room booking: room-booking-1-[timestamp]
# ✅ Created room booking: room-booking-2-[timestamp]
# 📊 Verification Query Results:
# 📌 Table bookings found: 2
# 🚪 Room bookings found: 2
# ✨ Seed completed successfully!
```

## ✅ Checklist de Validação

Após a migração, validar:

```bash
# 1. Backend executa sem erros
npm run build
# Esperado: "Successful compilation"

# 2. Prisma queries funcionam
npx prisma studio
# Navegar para "Booking" e "RoomBooking" e confirmar dados

# 3. Frontal recebe bookings corretamente
# No Owner App, testar:
#   - Visualizar reservas de mesas ✅
#   - Visualizar reservas de quartos ✅
#   - Criar nova reserva de mesa ✅
#   - Criar nova reserva de quarto ✅
#   - Confirmar/rejeitar cada tipo ✅
```

## 🔍 Queries de Debug

### Contar registros por tipo

```sql
SELECT COUNT(*) as table_bookings_count FROM table_bookings;
SELECT COUNT(*) as room_bookings_count FROM room_bookings;
```

### Listar bookings com tipo

```sql
-- Tabelas separadas, use union via aplicação
SELECT 'TABLE' as booking_type, id, "userId", "businessId", "checkIn", "checkOut" 
FROM table_bookings 
UNION ALL 
SELECT 'ROOM' as booking_type, id, "userId", "businessId", "checkIn", "checkOut" 
FROM room_bookings 
ORDER BY "createdAt" DESC;
```

### Observar mudanças em tempo real (Supabase)

```bash
# No Supabase dashboard SQL Editor:
# 1. Abra table_bookings
# 2. Abra room_bookings
# 3. Verifique schemas estão idênticos (mesmas colunas)
# 4. Veja dados de teste criados pelo seed
```

## 🚨 Troubleshooting

### Erro: "relation 'room_bookings' does not exist"

**Causa**: Migração não foi aplicada ou Prisma client desatualizado

**Solução**:
```bash
# Regenerar cliente
npx prisma generate

# Verificar status migrações
npx prisma migrate status

# Aplicar pendentes
npx prisma migrate deploy
```

### Erro: "column 'bookingType' does not exist"

**Causa**: DTO enviando campo sem tabela ter mudado

**Solução**: Verifique se migração foi aplicada. Campo `bookingType` é virtual, não persistido, apenas usado para roteamento de queries.

### Timeout ao conectar

**Causa**: Problemas na conectividade Supabase

**Solução**:
```bash
# Teste conexão básica
psql "$DATABASE_URL" -c "SELECT 1;"

# Se falhar, verifique:
# 1. DATABASE_URL está correto em .env
# 2. Supabase não está em manutenção
# 3. VPN/firewall não bloqueia
# 4. Timeout: aumente via DATABASE_POOL_TIMEOUT
```

## 📊 Dados de Teste

O seed cria:

**User**:
- `test@achaqui.com` (cliente)
- `owner@achaqui.com` (proprietário)

**Business**: 
- "Casa de Hóspedes Test" (propriedade do owner)

**Bookings**:
- 2 table_bookings (10 e 12 de março)
- 2 room_bookings (15-18 e 20-22 de março)

## 🔄 Próximas Passos

Após sucesso da migração:

1. ✅ Testar criar booking de mesa via DiningModule
2. ✅ Testar criar booking de quarto via HospitalityModule
3. ✅ Testar confirmação/rejeição em Owner UI
4. ✅ Validar que `findAllForUser()` retorna ambos os tipos
5. ✅ Testar realtime subscriptions atualizam ambas as tabelas
6. ✅ Deploy para staging/produção (via migrations)

## 📚 Referências

- [Prisma Migrations](https://www.prisma.io/docs/orm/prisma-migrate/overview)
- [Prisma DB Push vs Migrate](https://www.prisma.io/docs/orm/prisma-migrate/workflows/prototyping-your-schema)
- [Supabase PostgreSQL Connection](https://supabase.com/docs/guides/database/connecting-to-postgres)
