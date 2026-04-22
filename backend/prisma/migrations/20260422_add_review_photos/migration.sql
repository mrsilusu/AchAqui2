-- Add photos array to reviews
ALTER TABLE "reviews"
ADD COLUMN IF NOT EXISTS "photos" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
