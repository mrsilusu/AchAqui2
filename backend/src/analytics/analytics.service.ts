import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async ownerDashboard(ownerId: string) {
    const [summary] = await this.prisma.$queryRaw<
      Array<{
        total_businesses: bigint;
        total_bookings: bigint;
        confirmed_bookings: bigint;
        cancelled_bookings: bigint;
        pending_bookings: bigint;
        total_capacity: bigint;
        estimated_revenue: number;
      }>
    >`
      SELECT
        COUNT(DISTINCT b."id") AS total_businesses,
        COUNT(bk."id") AS total_bookings,
        COUNT(*) FILTER (WHERE bk."status" = 'CONFIRMED') AS confirmed_bookings,
        COUNT(*) FILTER (WHERE bk."status" = 'CANCELLED') AS cancelled_bookings,
        COUNT(*) FILTER (WHERE bk."status" = 'PENDING') AS pending_bookings,
        COALESCE(SUM(i."capacity"), 0) AS total_capacity,
        COALESCE(SUM(CASE WHEN bk."status" = 'CONFIRMED' THEN i."price" ELSE 0 END), 0) AS estimated_revenue
      FROM "Business" b
      LEFT JOIN "Booking" bk ON bk."businessId" = b."id"
      LEFT JOIN "Item" i ON i."businessId" = b."id"
      WHERE b."ownerId" = ${ownerId}
    `;

    const confirmed = Number(summary?.confirmed_bookings ?? 0);
    const totalCapacity = Number(summary?.total_capacity ?? 0);

    return {
      totalBusinesses: Number(summary?.total_businesses ?? 0),
      totalBookings: Number(summary?.total_bookings ?? 0),
      confirmedBookings: confirmed,
      cancelledBookings: Number(summary?.cancelled_bookings ?? 0),
      pendingBookings: Number(summary?.pending_bookings ?? 0),
      totalCapacity,
      estimatedRevenue: Number(summary?.estimated_revenue ?? 0),
      occupancyRate: totalCapacity > 0 ? (confirmed / totalCapacity) * 100 : 0,
    };
  }
}
