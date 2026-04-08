-- Ensure required enums exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'HtStaffDepartment') THEN
    CREATE TYPE "HtStaffDepartment" AS ENUM (
      'RECEPTION','HOUSEKEEPING','MAINTENANCE','MANAGEMENT','SECURITY','RESTAURANT'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'HtShift') THEN
    CREATE TYPE "HtShift" AS ENUM ('MORNING','AFTERNOON','NIGHT','ROTATING','FLEXIBLE');
  END IF;
END $$;

-- Create table when it does not exist
CREATE TABLE IF NOT EXISTS "ht_staff" (
  "id"                TEXT NOT NULL,
  "businessId"        TEXT NOT NULL,
  "userId"            TEXT,
  "coreStaffId"       TEXT,
  "fullName"          TEXT NOT NULL,
  "phone"             TEXT,
  "email"             TEXT,
  "position"          TEXT,
  "department"        "HtStaffDepartment" NOT NULL,
  "photoUrl"          TEXT,
  "documentType"      TEXT,
  "documentNumber"    TEXT,
  "shift"             "HtShift" NOT NULL DEFAULT 'ROTATING',
  "workDays"          INTEGER[] DEFAULT ARRAY[1,2,3,4,5]::INTEGER[],
  "startTime"         TEXT,
  "endTime"           TEXT,
  "assignedFloors"    INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  "maxRoomsPerDay"    INTEGER,
  "pinHash"           TEXT,
  "canCancelBookings" BOOLEAN NOT NULL DEFAULT false,
  "canApplyDiscounts" BOOLEAN NOT NULL DEFAULT false,
  "canViewFinancials" BOOLEAN NOT NULL DEFAULT false,
  "employmentStart"   TIMESTAMP(3),
  "employmentEnd"     TIMESTAMP(3),
  "isActive"          BOOLEAN NOT NULL DEFAULT true,
  "emergencyName"     TEXT,
  "emergencyPhone"    TEXT,
  "notes"             TEXT,
  "addedById"         TEXT,
  "updatedById"       TEXT,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ht_staff_pkey" PRIMARY KEY ("id")
);

-- Add missing columns for partially created legacy table
ALTER TABLE "ht_staff" ADD COLUMN IF NOT EXISTS "coreStaffId" TEXT;
ALTER TABLE "ht_staff" ADD COLUMN IF NOT EXISTS "position" TEXT;
ALTER TABLE "ht_staff" ADD COLUMN IF NOT EXISTS "photoUrl" TEXT;
ALTER TABLE "ht_staff" ADD COLUMN IF NOT EXISTS "workDays" INTEGER[] DEFAULT ARRAY[1,2,3,4,5]::INTEGER[];
ALTER TABLE "ht_staff" ADD COLUMN IF NOT EXISTS "startTime" TEXT;
ALTER TABLE "ht_staff" ADD COLUMN IF NOT EXISTS "endTime" TEXT;
ALTER TABLE "ht_staff" ADD COLUMN IF NOT EXISTS "maxRoomsPerDay" INTEGER;
ALTER TABLE "ht_staff" ADD COLUMN IF NOT EXISTS "emergencyName" TEXT;
ALTER TABLE "ht_staff" ADD COLUMN IF NOT EXISTS "emergencyPhone" TEXT;
ALTER TABLE "ht_staff" ADD COLUMN IF NOT EXISTS "addedById" TEXT;
ALTER TABLE "ht_staff" ADD COLUMN IF NOT EXISTS "updatedById" TEXT;

-- Legacy compatibility copy when old columns exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ht_staff' AND column_name = 'roleTitle'
  ) THEN
    EXECUTE 'UPDATE "ht_staff" SET "position" = COALESCE("position", "roleTitle")';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ht_staff' AND column_name = 'emergencyContactName'
  ) THEN
    EXECUTE 'UPDATE "ht_staff" SET "emergencyName" = COALESCE("emergencyName", "emergencyContactName")';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ht_staff' AND column_name = 'emergencyContactPhone'
  ) THEN
    EXECUTE 'UPDATE "ht_staff" SET "emergencyPhone" = COALESCE("emergencyPhone", "emergencyContactPhone")';
  END IF;
END $$;

-- Convert assignedFloors from JSONB legacy shape to INTEGER[]
DO $$
DECLARE
  col_type TEXT;
BEGIN
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_name = 'ht_staff' AND column_name = 'assignedFloors';

  IF col_type = 'jsonb' THEN
    ALTER TABLE "ht_staff"
      ALTER COLUMN "assignedFloors" DROP DEFAULT;

    ALTER TABLE "ht_staff"
      ALTER COLUMN "assignedFloors" TYPE INTEGER[]
      USING (
        CASE
          WHEN "assignedFloors" IS NULL THEN ARRAY[]::INTEGER[]
          ELSE COALESCE(
            (SELECT array_agg(value::INTEGER)
             FROM jsonb_array_elements_text("assignedFloors") AS t(value)),
            ARRAY[]::INTEGER[]
          )
        END
      );

    ALTER TABLE "ht_staff"
      ALTER COLUMN "assignedFloors" SET DEFAULT ARRAY[]::INTEGER[];
  END IF;
END $$;

-- Align defaults and nullability required by contract
ALTER TABLE "ht_staff" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "ht_staff" ALTER COLUMN "shift" SET DEFAULT 'ROTATING';
ALTER TABLE "ht_staff" ALTER COLUMN "department" DROP DEFAULT;
ALTER TABLE "ht_staff" ALTER COLUMN "isActive" SET DEFAULT true;

-- Indexes and uniqueness from contract
CREATE UNIQUE INDEX IF NOT EXISTS "ht_staff_coreStaffId_key" ON "ht_staff"("coreStaffId");
CREATE UNIQUE INDEX IF NOT EXISTS "ht_staff_businessId_documentNumber_key" ON "ht_staff"("businessId", "documentNumber");
CREATE INDEX IF NOT EXISTS "ht_staff_businessId_department_idx" ON "ht_staff"("businessId", "department");
CREATE INDEX IF NOT EXISTS "ht_staff_businessId_isActive_idx" ON "ht_staff"("businessId", "isActive");

-- Foreign keys (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ht_staff_businessId_fkey'
  ) THEN
    ALTER TABLE "ht_staff"
      ADD CONSTRAINT "ht_staff_businessId_fkey"
      FOREIGN KEY ("businessId") REFERENCES "Business"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ht_staff_userId_fkey'
  ) THEN
    ALTER TABLE "ht_staff"
      ADD CONSTRAINT "ht_staff_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ht_staff_coreStaffId_fkey'
  ) THEN
    ALTER TABLE "ht_staff"
      ADD CONSTRAINT "ht_staff_coreStaffId_fkey"
      FOREIGN KEY ("coreStaffId") REFERENCES "core_business_staff"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ht_housekeeping_tasks_assignedToId_fkey'
  ) THEN
    ALTER TABLE "ht_housekeeping_tasks"
      ADD CONSTRAINT "ht_housekeeping_tasks_assignedToId_fkey"
      FOREIGN KEY ("assignedToId") REFERENCES "ht_staff"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
