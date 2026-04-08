-- CreateEnum
CREATE TYPE "HtStaffDepartment" AS ENUM ('RECEPTION', 'HOUSEKEEPING', 'MAINTENANCE', 'MANAGEMENT', 'SECURITY', 'RESTAURANT');

-- CreateEnum
CREATE TYPE "HtShift" AS ENUM ('MORNING', 'AFTERNOON', 'NIGHT', 'ROTATING', 'FLEXIBLE');

-- CreateTable
CREATE TABLE "ht_staff" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "department" "HtStaffDepartment" NOT NULL DEFAULT 'RECEPTION',
    "roleTitle" TEXT,
    "documentType" TEXT,
    "documentNumber" TEXT,
    "pinHash" TEXT,
    "shift" "HtShift" NOT NULL DEFAULT 'FLEXIBLE',
    "shiftNotes" TEXT,
    "assignedFloors" JSONB,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "canCancelBookings" BOOLEAN NOT NULL DEFAULT false,
    "canApplyDiscounts" BOOLEAN NOT NULL DEFAULT false,
    "canViewFinancials" BOOLEAN NOT NULL DEFAULT false,
    "employmentStart" TIMESTAMP(3),
    "employmentEnd" TIMESTAMP(3),
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastPinChangedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ht_staff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ht_staff_businessId_email_key" ON "ht_staff"("businessId", "email");
CREATE UNIQUE INDEX "ht_staff_businessId_userId_key" ON "ht_staff"("businessId", "userId");
CREATE INDEX "ht_staff_businessId_department_isActive_idx" ON "ht_staff"("businessId", "department", "isActive");
CREATE INDEX "ht_staff_businessId_shift_idx" ON "ht_staff"("businessId", "shift");

-- AddForeignKey
ALTER TABLE "ht_staff" ADD CONSTRAINT "ht_staff_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ht_staff" ADD CONSTRAINT "ht_staff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ht_housekeeping_tasks" ADD CONSTRAINT "ht_housekeeping_tasks_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "ht_staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
