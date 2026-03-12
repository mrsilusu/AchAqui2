-- ============================================================
-- MIGRATION: Criar tabela room_types dedicada
-- Executar no Supabase SQL Editor
-- ============================================================

-- 1. Criar tabela room_types
CREATE TABLE IF NOT EXISTS "room_types" (
  "id"                TEXT          NOT NULL DEFAULT gen_random_uuid()::text,
  "businessId"        TEXT          NOT NULL,
  "name"              TEXT          NOT NULL,
  "description"       TEXT          NOT NULL DEFAULT '',
  "pricePerNight"     DOUBLE PRECISION NOT NULL,
  "maxGuests"         INTEGER       NOT NULL DEFAULT 2,
  "totalRooms"        INTEGER       NOT NULL DEFAULT 1,
  "available"         BOOLEAN       NOT NULL DEFAULT true,
  "amenities"         TEXT[]        NOT NULL DEFAULT '{}',
  "minNights"         INTEGER       NOT NULL DEFAULT 1,
  "taxRate"           DOUBLE PRECISION NOT NULL DEFAULT 0,
  "weekendMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  "seasonalRates"     JSONB,
  "photos"            TEXT[]        NOT NULL DEFAULT '{}',
  "createdAt"         TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "room_types_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "room_types_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "Business"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- 2. Índice para queries por negócio
CREATE INDEX IF NOT EXISTS "room_types_businessId_idx" ON "room_types"("businessId");

-- 3. Trigger para updatedAt automático
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_room_types_updated_at ON "room_types";
CREATE TRIGGER update_room_types_updated_at
  BEFORE UPDATE ON "room_types"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. Adicionar FK em room_bookings para room_types (opcional mas recomendado)
ALTER TABLE "room_bookings"
  DROP CONSTRAINT IF EXISTS "room_bookings_roomTypeId_fkey";

ALTER TABLE "room_bookings"
  ADD CONSTRAINT "room_bookings_roomTypeId_fkey"
  FOREIGN KEY ("roomTypeId") REFERENCES "room_types"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================
-- NOTA: Os dados antigos na tabela "Item" (quartos criados
-- antes desta migração) NÃO são migrados automaticamente.
-- Se precisares migrar, usa o script abaixo (opcional):
-- ============================================================

-- INSERT INTO "room_types" (
--   "id", "businessId", "name", "description",
--   "pricePerNight", "maxGuests", "totalRooms", "available",
--   "createdAt", "updatedAt"
-- )
-- SELECT
--   "id", "businessId", "name", "description",
--   "price", "capacity", "totalRooms", "available",
--   "createdAt", "updatedAt"
-- FROM "Item"
-- WHERE "available" IS NOT NULL  -- identifica registos que eram quartos
-- ON CONFLICT DO NOTHING;
