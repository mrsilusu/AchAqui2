-- Add per-staff section permission overrides (JSON)
ALTER TABLE "ht_staff" ADD COLUMN IF NOT EXISTS "section_overrides" JSONB;
