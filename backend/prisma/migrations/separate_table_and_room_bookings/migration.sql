-- CreateTable "room_bookings"
CREATE TABLE "room_bookings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "checkIn" TIMESTAMP(3) NOT NULL,
    "checkOut" TIMESTAMP(3) NOT NULL,
    "numberOfGuests" INTEGER NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "confirmedAtUTC" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "room_bookings_pkey" PRIMARY KEY ("id")
);

-- Rename "Booking" table to "table_bookings"
ALTER TABLE "Booking" RENAME TO "table_bookings";

-- CreateIndex for "room_bookings"
CREATE INDEX "room_bookings_userId_idx" ON "room_bookings"("userId");
CREATE INDEX "room_bookings_businessId_idx" ON "room_bookings"("businessId");
CREATE INDEX "room_bookings_status_idx" ON "room_bookings"("status");

-- Add foreign key constraints for "room_bookings"
ALTER TABLE "room_bookings" ADD CONSTRAINT "room_bookings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "room_bookings" ADD CONSTRAINT "room_bookings_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddIndex for "table_bookings" (already exists but ensure consistency)
CREATE INDEX IF NOT EXISTS "table_bookings_userId_idx" ON "table_bookings"("userId");
CREATE INDEX IF NOT EXISTS "table_bookings_businessId_idx" ON "table_bookings"("businessId");
CREATE INDEX IF NOT EXISTS "table_bookings_status_idx" ON "table_bookings"("status");
