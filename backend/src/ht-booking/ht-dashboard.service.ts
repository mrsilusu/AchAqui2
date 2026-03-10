// backend/src/ht-booking/ht-dashboard.service.ts
import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HtDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertOwnership(businessId: string, ownerId: string) {
    const b = await this.prisma.business.findFirst({ where: { id: businessId, ownerId } });
    if (!b) throw new ForbiddenException('Sem permissão para este estabelecimento.');
  }

  async getDashboard(businessId: string, ownerId: string) {
    await this.assertOwnership(businessId, ownerId);

    const now   = new Date();
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    const end   = new Date(now); end.setHours(23, 59, 59, 999);

    // Correr tudo em paralelo — [ACID] read-only, sem transacção necessária
    const [
      rooms,
      arrivalsToday,
      departuresToday,
      currentGuests,
      pendingTasks,
      revenueToday,
    ] = await Promise.all([
      // Quartos e estados
      this.prisma.htRoom.findMany({
        where: { businessId },
        include: {
          roomType: { select: { name: true, pricePerNight: true } },
          bookings: {
            where: { status: 'CHECKED_IN' },
            select: {
              id: true,
              guestName: true,
              endDate: true,
              user: { select: { name: true } },
            },
            take: 1,
          },
        },
        orderBy: [{ floor: 'asc' }, { number: 'asc' }],
      }),

      // Chegadas de hoje (PENDING ou CONFIRMED)
      this.prisma.htRoomBooking.count({
        where: {
          businessId,
          startDate: { gte: start, lte: end },
          status: { in: ['PENDING', 'CONFIRMED'] },
        },
      }),

      // Saídas de hoje (CHECKED_IN com endDate hoje)
      this.prisma.htRoomBooking.count({
        where: {
          businessId,
          endDate: { gte: start, lte: end },
          status: 'CHECKED_IN',
        },
      }),

      // Hóspedes actuais
      this.prisma.htRoomBooking.count({
        where: { businessId, status: 'CHECKED_IN' },
      }),

      // Tarefas de housekeeping pendentes
      this.prisma.htHousekeepingTask.count({
        where: {
          room: { businessId },
          completedAt: null,
        },
      }),

      // Receita do dia — checkouts de hoje com pagamento
      this.prisma.htRoomBooking.aggregate({
        where: {
          businessId,
          checkedOutAt: { gte: start, lte: end },
          paymentStatus: 'PAID',
        },
        _sum: { totalPrice: true },
      }),
    ]);

    // Calcular estados dos quartos
    const roomStats = {
      total:       rooms.length,
      clean:       rooms.filter(r => r.status === 'CLEAN').length,
      occupied:    rooms.filter(r => r.status === 'CLEAN' && r.bookings.length > 0).length,
      dirty:       rooms.filter(r => r.status === 'DIRTY').length,
      cleaning:    rooms.filter(r => r.status === 'CLEANING').length,
      maintenance: rooms.filter(r => r.status === 'MAINTENANCE').length,
    };

    // Taxa de ocupação real = quartos com hóspede / total
    const occupancyRate = rooms.length > 0
      ? Math.round((currentGuests / rooms.length) * 100)
      : 0;

    return {
      date: now.toISOString(),
      occupancyRate,
      roomStats,
      rooms: rooms.map(r => ({
        id:        r.id,
        number:    r.number,
        floor:     r.floor,
        status:    r.status,
        typeName:  r.roomType.name,
        guest:     r.bookings[0]?.guestName || r.bookings[0]?.user?.name || null,
        checkOut:  r.bookings[0]?.endDate || null,
      })),
      today: {
        arrivals:   arrivalsToday,
        departures: departuresToday,
        guests:     currentGuests,
        revenue:    revenueToday._sum.totalPrice ?? 0,
      },
      housekeeping: {
        pendingTasks,
      },
    };
  }
}
