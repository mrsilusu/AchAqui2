# Fase 1 — Multi-Tenant: Instruções de Instalação

## Ficheiros entregues

```
backend/
├── prisma/
│   ├── schema.prisma                          ← substituir
│   └── migrations/
│       └── phase1_multi_tenant/
│           └── migration.sql                  ← correr no Supabase SQL Editor
├── src/
│   ├── app.module.ts                          ← substituir
│   ├── admin/
│   │   ├── admin.module.ts                    ← novo
│   │   ├── admin.controller.ts                ← novo
│   │   ├── admin.service.ts                   ← novo
│   │   └── dto/
│   │       ├── review-claim.dto.ts            ← novo
│   │       └── import-google-places.dto.ts    ← novo
│   ├── claim/
│   │   ├── claim.module.ts                    ← novo
│   │   ├── claim.controller.ts                ← novo
│   │   ├── claim.service.ts                   ← novo
│   │   └── dto/
│   │       └── create-claim-request.dto.ts    ← novo
│   └── business/
│       └── business.service.ts                ← substituir
```

---

## Passo 1 — Correr o SQL no Supabase

1. Abre o painel do Supabase → **SQL Editor**
2. Cola o conteúdo de `migrations/phase1_multi_tenant/migration.sql`
3. Corre e confirma que não há erros

---

## Passo 2 — Copiar os ficheiros para o projecto

```bash
# No terminal do Codespace, a partir da raiz do projecto:

# Substituir schema
cp /caminho/para/fase1/backend/prisma/schema.prisma backend/prisma/schema.prisma

# Substituir app.module.ts
cp /caminho/para/fase1/backend/src/app.module.ts backend/src/app.module.ts

# Substituir business.service.ts
cp /caminho/para/fase1/backend/src/business/business.service.ts backend/src/business/business.service.ts

# Criar pasta admin
mkdir -p backend/src/admin/dto
cp /caminho/para/fase1/backend/src/admin/* backend/src/admin/
cp /caminho/para/fase1/backend/src/admin/dto/* backend/src/admin/dto/

# Criar pasta claim
mkdir -p backend/src/claim/dto
cp /caminho/para/fase1/backend/src/claim/* backend/src/claim/
cp /caminho/para/fase1/backend/src/claim/dto/* backend/src/claim/dto/
```

---

## Passo 3 — Regenerar o Prisma Client e reiniciar

```bash
cd backend
npx prisma generate
npm run start:dev
```

---

## Passo 4 — Adicionar variável de ambiente (Google Places)

No ficheiro `backend/.env`, adicionar:

```env
GOOGLE_PLACES_API_KEY=a_tua_chave_aqui
```

Sem esta chave, o endpoint de importação retorna 400 (mas tudo o resto funciona).

---

## Passo 5 — Criar utilizador ADMIN

No **Supabase SQL Editor**, criar o primeiro admin (substituir os valores):

```sql
-- ATENÇÃO: a password aqui é em plaintext apenas para criar o hash
-- Em produção usar o endpoint /auth/signup e depois promover via SQL

UPDATE "User"
SET role = 'ADMIN'
WHERE email = 'admin@acheiaqui.app';
```

Ou via signup + promoção:
1. Registar utilizador normalmente via `/auth/signup`
2. No Supabase SQL Editor: `UPDATE "User" SET role = 'ADMIN' WHERE email = 'teu@email.com';`

---

## Novos endpoints disponíveis após instalação

### Para donos (role: OWNER)
| Método | URL | Descrição |
|--------|-----|-----------|
| POST | `/claims/:businessId` | Submeter pedido de claim |
| GET | `/claims/mine` | Ver os meus pedidos de claim |

### Para admin (role: ADMIN)
| Método | URL | Descrição |
|--------|-----|-----------|
| GET | `/admin/stats` | Estatísticas gerais do SaaS |
| GET | `/admin/claims` | Todos os pedidos (filtrável por ?status=) |
| GET | `/admin/claims/pending` | Apenas pedidos pendentes |
| PATCH | `/admin/claims/:id/review` | Aprovar ou rejeitar um pedido |
| POST | `/admin/import/google-places` | Importar negócios do Google |

### Exemplo de importação Google Places
```json
POST /admin/import/google-places
{
  "city": "Luanda",
  "category": "DINING",
  "limit": 20,
  "radiusMeters": 5000
}
```

### Exemplo de claim
```json
POST /claims/BUSINESS_ID
Authorization: Bearer TOKEN_DO_DONO

{
  "evidence": "Sou o proprietário da Pizzaria Bela Vista desde 2020. Posso fornecer o registo comercial número 12345/2020."
}
```

### Exemplo de aprovação (admin)
```json
PATCH /admin/claims/CLAIM_ID/review
Authorization: Bearer TOKEN_DO_ADMIN

{
  "decision": "APPROVED",
  "adminNote": "Documentação verificada e aprovada."
}
```
