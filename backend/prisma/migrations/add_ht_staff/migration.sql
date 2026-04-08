-- CreateEnum
CREATE TYPE "HtStaffDepartment" AS ENUM ('RECEPTION', 'HOUSEKEEPING', 'MAINTENANCE', 'MANAGEMENT', 'SECURITY', 'RESTAURANT');

-- CreateEnum
CREATE TYPE "HtShift" AS ENUM ('MORNING', 'AFTERNOON', 'NIGHT', 'ROTATING', 'FLEXIBLE');

-- CreateTable
CREATE TABLE "ht_staff" (
    "id"                  TEXT NOT NULL,
    "businessId"          TEXT NOT NULL,
    "userId"              TEXT,
    "coreStaffId"         TEXT,
    "fullName"            TEXT NOT NULL,
    "phone"               TEXT,
    "email"               TEXT,
    "position"            TEXT,
    "department"          "HtStaffDepartment" NOT NULL,
    "photoUrl"            TEXT,
    "documentType"        TEXT,
    "documentNumber"      TEXT,
    "shift"               "HtShift" NOT NULL DEFAULT 'ROTATING',
    "workDays"            INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5]::INTEGER[],
    "startTime"           TEXT,
    "endTime"             TEXT,
    "assignedFloors"      INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "maxRoomsPerDay"      INTEGER,
    "pinHash"             TEXT,
    "canCancelBookings"   BOOLEAN NOT NULL DEFAULT false,
    "canApplyDiscounts"   BOOLEAN NOT NULL DEFAULT false,
    "canViewFinancials"   BOOLEAN NOT NULL DEFAULT false,
    "employmentStart"     TIMESTAMP(3),
    "employmentEnd"       TIMESTAMP(3),
    "isActive"            BOOLEAN NOT NULL DEFAULT true,
    "emergencyName"       TEXT,
    "emergencyPhone"      TEXT,
    "notes"               TEXT,
    "addedById"           TEXT,
    "updatedById"         TEXT,
    "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"           TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ht_staff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ht_staff_coreStaffId_key" ON "ht_staff"("coreStaffId");

-- CreateIndex
CREATE UNIQUE INDEX "ht_staff_businessId_documentNumber_key" ON "ht_staff"("businessId", "documentNumber");

-- CreateIndex
CREATE INDEX "ht_staff_businessId_department_idx" ON "ht_staff"("businessId", "department");

-- CreateIndex
CREATE INDEX "ht_staff_businessId_isActive_idx" ON "ht_staff"("businessId", "isActive");

-- AddForeignKey
ALTER TABLE "ht_staff" ADD CONSTRAINT "ht_staff_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ht_staff" ADD CONSTRAINT "ht_staff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ht_housekeeping_tasks" ADD CONSTRAINT "ht_housekeeping_tasks_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "ht_staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
