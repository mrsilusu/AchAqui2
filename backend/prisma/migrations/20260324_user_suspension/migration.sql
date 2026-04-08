-- Admin user suspension support

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "isSuspended" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "suspendedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "suspensionReason" TEXT;

CREATE INDEX IF NOT EXISTS "User_isSuspended_idx" ON "User"("isSuspended");
