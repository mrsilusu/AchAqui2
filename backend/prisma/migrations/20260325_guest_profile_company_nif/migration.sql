-- L1: guest profile legal/commercial fields
ALTER TABLE "ht_guest_profiles"
  ADD COLUMN IF NOT EXISTS "companyName" TEXT,
  ADD COLUMN IF NOT EXISTS "nif" TEXT;

CREATE INDEX IF NOT EXISTS "ht_guest_profiles_businessId_nif_idx"
  ON "ht_guest_profiles"("businessId", "nif");
