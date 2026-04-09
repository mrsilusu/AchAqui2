-- Migration: add overbookingBuffer to HtPmsConfig
ALTER TABLE "ht_pms_config" ADD COLUMN IF NOT EXISTS "overbookingBuffer" INTEGER NOT NULL DEFAULT 100;
