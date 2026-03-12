-- ============================================================
-- Fase 1 — Multi-Tenant: claim system + Google Places support
-- Aplicar no SQL Editor do Supabase
-- ============================================================

-- 1. Novos enums
CREATE TYPE "BusinessSource" AS ENUM ('GOOGLE', 'MANUAL');
CREATE TYPE "ClaimStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- 2. Alterar Business: ownerId torna-se nullable + novos campos
ALTER TABLE "Business"
  ALTER COLUMN "ownerId" DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS "isClaimed"     BOOLEAN          NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "claimedAt"     TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "source"        "BusinessSource" NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS "googlePlaceId" TEXT;

-- Index único para googlePlaceId (evita duplicados na importação)
CREATE UNIQUE INDEX IF NOT EXISTS "Business_googlePlaceId_key"
  ON "Business"("googlePlaceId")
  WHERE "googlePlaceId" IS NOT NULL;

-- 3. Criar tabela claim_requests
CREATE TABLE "claim_requests" (
  "id"          TEXT         NOT NULL,
  "businessId"  TEXT         NOT NULL,
  "userId"      TEXT         NOT NULL,
  "status"      "ClaimStatus" NOT NULL DEFAULT 'PENDING',
  "evidence"    TEXT,
  "adminNote"   TEXT,
  "reviewedAt"  TIMESTAMP(3),
  "reviewedBy"  TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "claim_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "claim_requests_businessId_userId_key" UNIQUE ("businessId", "userId")
);

-- Foreign keys
ALTER TABLE "claim_requests"
  ADD CONSTRAINT "claim_requests_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "Business"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "claim_requests_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Índices de performance
CREATE INDEX "claim_requests_businessId_idx" ON "claim_requests"("businessId");
CREATE INDEX "claim_requests_userId_idx"     ON "claim_requests"("userId");
CREATE INDEX "claim_requests_status_idx"     ON "claim_requests"("status");

-- 4. Registar migração no Prisma
INSERT INTO "_prisma_migrations"
  (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES
  (gen_random_uuid()::text, 'manual', NOW(), 'phase1_multi_tenant', NULL, NULL, NOW(), 1);
