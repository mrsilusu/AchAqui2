-- Add social interactions support used by /businesses/:id/social-state and /businesses/:id/checkin

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InteractionType') THEN
    CREATE TYPE "InteractionType" AS ENUM ('BOOKMARK', 'FOLLOW', 'CHECKIN');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "UserBusinessInteraction" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "type" "InteractionType" NOT NULL,
  "date" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserBusinessInteraction_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'UserBusinessInteraction_userId_fkey'
  ) THEN
    ALTER TABLE "UserBusinessInteraction"
      ADD CONSTRAINT "UserBusinessInteraction_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'UserBusinessInteraction_businessId_fkey'
  ) THEN
    ALTER TABLE "UserBusinessInteraction"
      ADD CONSTRAINT "UserBusinessInteraction_businessId_fkey"
      FOREIGN KEY ("businessId") REFERENCES "Business"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "UserBusinessInteraction_userId_businessId_type_date_key"
  ON "UserBusinessInteraction"("userId", "businessId", "type", "date");

CREATE INDEX IF NOT EXISTS "UserBusinessInteraction_userId_type_idx"
  ON "UserBusinessInteraction"("userId", "type");

CREATE INDEX IF NOT EXISTS "UserBusinessInteraction_businessId_type_idx"
  ON "UserBusinessInteraction"("businessId", "type");
