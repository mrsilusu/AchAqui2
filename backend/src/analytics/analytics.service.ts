import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  private toDateBucket(date: Date) {
    return date.toISOString().slice(0, 10);
  }

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
      LEFT JOIN "di_table_bookings" bk ON bk."businessId" = b."id"
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

  async ownerAdvanced(ownerId: string, days = 30) {
    const safeDays = Number.isFinite(days) ? Math.max(7, Math.min(120, Math.floor(days))) : 30;
    const from = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);

    const businesses = await this.prisma.business.findMany({
      where: { ownerId },
      select: { id: true, category: true },
    });
    const businessIds = businesses.map(b => b.id);

    if (businessIds.length === 0) {
      return {
        trends: [],
        funnel: {
          visits: 0,
          intent: 0,
          bookings: 0,
          conversionRate: 0,
        },
        segmentation: {
          returning: 0,
          newUsers: 0,
          topCategories: [],
        },
      };
    }

    const [tableBookings, roomBookings, interactions] = await Promise.all([
      this.prisma.diTableBooking.findMany({
        where: {
          businessId: { in: businessIds },
          createdAt: { gte: from },
        },
        select: { createdAt: true, status: true, userId: true },
      }),
      this.prisma.htRoomBooking.findMany({
        where: {
          businessId: { in: businessIds },
          createdAt: { gte: from },
        },
        select: { createdAt: true, status: true, userId: true },
      }),
      this.prisma.userBusinessInteraction.findMany({
        where: {
          businessId: { in: businessIds },
          createdAt: { gte: from },
        },
        select: { createdAt: true, userId: true, type: true, businessId: true },
      }).catch(() => []),
    ]);

    const allBookings = [...tableBookings, ...roomBookings];
    const trendsMap = new Map<string, { bookings: number; confirmed: number; checkins: number }>();

    for (const booking of allBookings) {
      const key = this.toDateBucket(booking.createdAt);
      const current = trendsMap.get(key) || { bookings: 0, confirmed: 0, checkins: 0 };
      current.bookings += 1;
      if (booking.status === 'CONFIRMED' || booking.status === 'CHECKED_IN' || booking.status === 'CHECKED_OUT') {
        current.confirmed += 1;
      }
      trendsMap.set(key, current);
    }

    for (const interaction of interactions) {
      if (interaction.type !== 'CHECKIN') continue;
      const key = this.toDateBucket(interaction.createdAt);
      const current = trendsMap.get(key) || { bookings: 0, confirmed: 0, checkins: 0 };
      current.checkins += 1;
      trendsMap.set(key, current);
    }

    const trends = [...trendsMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, values]) => ({ date, ...values }));

    const visits = interactions.length;
    const intent = interactions.filter(i => i.type === 'BOOKMARK' || i.type === 'CHECKIN').length;
    const bookings = allBookings.length;

    const bookingPerUser = new Map<string, number>();
    for (const booking of allBookings) {
      bookingPerUser.set(booking.userId, (bookingPerUser.get(booking.userId) ?? 0) + 1);
    }
    const returning = [...bookingPerUser.values()].filter(v => v > 1).length;
    const newUsers = [...bookingPerUser.values()].filter(v => v === 1).length;

    const categoryMap = new Map<string, number>();
    for (const business of businesses) {
      categoryMap.set(business.category, (categoryMap.get(business.category) ?? 0) + 1);
    }

    return {
      rangeDays: safeDays,
      trends,
      funnel: {
        visits,
        intent,
        bookings,
        conversionRate: visits > 0 ? Number(((bookings / visits) * 100).toFixed(2)) : 0,
      },
      segmentation: {
        returning,
        newUsers,
        topCategories: [...categoryMap.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([category, count]) => ({ category, count })),
      },
    };
  }
}