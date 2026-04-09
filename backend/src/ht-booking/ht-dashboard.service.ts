// backend/src/ht-booking/ht-dashboard.service.ts
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { HtStaffDepartment, StaffRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HtDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private async hasBusinessAccess(businessId: string, userId: string, allowedRoles?: StaffRole[]) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, ownerId: true },
    });
    if (!business) return false;
    if (business.ownerId === userId) return true;

    const roleFilter = allowedRoles?.length
      ? { in: allowedRoles }
      : { in: [StaffRole.HT_MANAGER, StaffRole.HT_RECEPTIONIST, StaffRole.HT_HOUSEKEEPER] };

    const staff = await this.prisma.coreBusinessStaff.findFirst({
      where: {
        businessId,
        userId,
        revokedAt: null,
        OR: [
          { role: StaffRole.GENERAL_MANAGER },
          {
            role: roleFilter as any,
            OR: [{ module: 'HT' }, { module: null }],
          },
        ],
      },
      select: { id: true },
    });
    if (staff) return true;

    // Fallback para ambientes legados: relação ativa em ht_staff sem sincronização em coreBusinessStaff.
    const htStaff = await this.prisma.htStaff.findFirst({
      where: {
        businessId,
        userId,
        isActive: true,
      },
      select: { department: true },
    });
    if (!htStaff) return false;

    if (!allowedRoles?.length) return true;

    const inferredRole = htStaff.department === HtStaffDepartment.RECEPTION
      ? StaffRole.HT_RECEPTIONIST
      : htStaff.department === HtStaffDepartment.MANAGEMENT
        ? StaffRole.HT_MANAGER
        : StaffRole.HT_HOUSEKEEPER;

    return allowedRoles.includes(inferredRole);
  }

  private async assertAccess(businessId: string, actorId: string, actorRole: string = 'OWNER', actorBusinessId?: string) {
    // STAFF: o businessId foi validado e assinado no JWT durante o login
    // Basta confirmar que o businessId pedido coincide com o do JWT
    if (actorRole === 'STAFF') {
      if (!actorBusinessId || actorBusinessId !== businessId) {
        throw new ForbiddenException('Sem permissão para este estabelecimento.');
      }
      return;
    }

    // OWNER: validação existente contra a base de dados
    const b = await this.prisma.business.findFirst({
      where: {
        id: businessId,
        OR: [{ ownerId: actorId }, { ownerId: null, id: businessId }],
      },
      select: { id: true },
    });
    if (!b) throw new ForbiddenException('Sem permissão para este estabelecimento.');
  }

  async getDashboard(businessId: string, actorId: string, actorRole: string = 'OWNER', actorBusinessId?: string) {
    await this.assertAccess(businessId, actorId, actorRole, actorBusinessId);

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
      completedTasks,
    ] = await Promise.all([
      // Quartos e estados (inclui tasks de housekeeping pendentes)
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
          tasks: {
            where: { completedAt: null },
            select: { id: true, priority: true, createdAt: true },
            orderBy: { createdAt: 'asc' },
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

      // Métrica operacional: tempo de limpeza por tipo de quarto (últimos 30 dias)
      this.prisma.htHousekeepingTask.findMany({
        where: {
          room: { businessId },
          completedAt: { not: null },
          createdAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
        },
        select: {
          roomId: true,
          createdAt: true,
          startedAt: true,
          completedAt: true,
          room: {
            select: {
              roomType: {
                select: { id: true, name: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
    ]);

    // Calcular estados dos quartos
    // occupied: quarto CLEAN com reserva CHECKED_IN activa (roomId associado à reserva)
    // clean (livre): quarto CLEAN sem reservas activas
    const roomStats = {
      total:       rooms.length,
      occupied:    rooms.filter(r => r.status === 'CLEAN' && r.bookings.length > 0).length,
      clean:       rooms.filter(r => r.status === 'CLEAN' && r.bookings.length === 0).length,
      dirty:       rooms.filter(r => r.status === 'DIRTY').length,
      cleaning:    rooms.filter(r => r.status === 'CLEANING').length,
      inspecting:  rooms.filter(r => r.status === 'INSPECTING').length,
      maintenance: rooms.filter(r => r.status === 'MAINTENANCE').length,
    };

    const cleaningByType: Record<string, { roomTypeId: string; roomTypeName: string; totalMinutes: number; tasks: number }> = {};
    completedTasks.forEach((t) => {
      const completedAt = t.completedAt ? new Date(t.completedAt).getTime() : null;
      if (!completedAt) return;
      const startRef = t.startedAt ? new Date(t.startedAt).getTime() : new Date(t.createdAt).getTime();
      const durationMinutes = Math.max(0, Math.round((completedAt - startRef) / 60000));
      const roomTypeId = t.room?.roomType?.id;
      const roomTypeName = t.room?.roomType?.name;
      if (!roomTypeId || !roomTypeName) return;
      if (!cleaningByType[roomTypeId]) {
        cleaningByType[roomTypeId] = {
          roomTypeId,
          roomTypeName,
          totalMinutes: 0,
          tasks: 0,
        };
      }
      cleaningByType[roomTypeId].totalMinutes += durationMinutes;
      cleaningByType[roomTypeId].tasks += 1;
    });

    const avgCleaningByRoomType = Object.values(cleaningByType)
      .map((row) => ({
        roomTypeId: row.roomTypeId,
        roomTypeName: row.roomTypeName,
        tasks: row.tasks,
        avgMinutes: row.tasks > 0 ? Number((row.totalMinutes / row.tasks).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.tasks - a.tasks);

    // Taxa de ocupação real = quartos físicos ocupados / total quartos físicos
    // Usa roomStats.occupied (CLEAN com reserva activa) em vez de contagem de reservas
    const occupancyRate = roomStats.total > 0
      ? Math.round((roomStats.occupied / roomStats.total) * 100)
      : 0;

    return {
      date: now.toISOString(),
      occupancyRate,
      roomStats,
      rooms: rooms.map(r => ({
        id:           r.id,
        number:       r.number,
        floor:        r.floor,
        status:       r.status,
        typeName:     r.roomType.name,
        guest:        r.bookings[0]?.guestName || r.bookings[0]?.user?.name || null,
        checkOut:     r.bookings[0]?.endDate || null,
        pendingTasks: r.tasks.map(t => ({ id: t.id, priority: t.priority, createdAt: t.createdAt })),
      })),
      today: {
        arrivals:   arrivalsToday,
        departures: departuresToday,
        guests:     currentGuests,
        revenue:    revenueToday._sum.totalPrice ?? 0,
      },
      housekeeping: {
        pendingTasks,
        avgCleaningByRoomType,
      },
        kpis: {
          adr:    departuresToday > 0
                    ? Math.round((revenueToday._sum.totalPrice ?? 0) / departuresToday)
                    : 0,
          revpar: (() => {
                    const adr = departuresToday > 0
                      ? Math.round((revenueToday._sum.totalPrice ?? 0) / departuresToday)
                      : 0;
                    return Math.round(adr * (occupancyRate / 100));
                  })(),
        },
    };
  }
  // ─── Reservas para o Mapa (período configurável) ────────────────────────
  async getBookingsForMap(businessId: string, actorId: string, from: Date, to: Date, actorRole: string = 'OWNER', actorBusinessId?: string) {
    await this.assertAccess(businessId, actorId, actorRole, actorBusinessId);

    const [rooms, bookings] = await Promise.all([
      this.prisma.htRoom.findMany({
        where: { businessId },
        include: { roomType: { select: { id: true, name: true } } },
        orderBy: [{ floor: 'asc' }, { number: 'asc' }],
      }),
      this.prisma.htRoomBooking.findMany({
        where: {
          businessId,
          status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'NO_SHOW', 'CANCELLED'] },
          OR: [
            { startDate: { lte: to }, endDate: { gte: from } },
          ],
        },
        select: {
          id: true, guestName: true, guestPhone: true, startDate: true, endDate: true,
          status: true, roomId: true, roomTypeId: true, totalPrice: true,
          cancelledAt: true, cancelReason: true,
          checkedInAt: true, checkedOutAt: true, originalEndDate: true,
          paymentStatus: true, adults: true, children: true, rooms: true,
          roomType: { select: { id: true, name: true } },
        },
        orderBy: { startDate: 'asc' },
      }),
    ]);

    // Agrupar quartos por tipo
    const typeMap: Record<string, { id: string; name: string; rooms: any[] }> = {};
    rooms.forEach(r => {
      const tid = r.roomType.id;
      if (!typeMap[tid]) typeMap[tid] = { id: tid, name: r.roomType.name, rooms: [] };
      typeMap[tid].rooms.push({ id: r.id, number: r.number, floor: r.floor, status: r.status });
    });

    return {
      roomTypes: Object.values(typeMap),
      bookings:  bookings.map(bk => ({
        id:            bk.id,
        guestName:     bk.guestName  || 'Hóspede',
        guestPhone:    bk.guestPhone || null,
        startDate:     bk.startDate.toISOString(),
        endDate:       bk.endDate.toISOString(),
        status:        bk.status,
        roomId:        bk.roomId,
        roomTypeId:    bk.roomTypeId,
        typeName:      bk.roomType?.name || '—',
        totalPrice:    bk.totalPrice,
        cancelledAt:   bk.cancelledAt,
        cancelReason:  bk.cancelReason,
        checkedInAt:     bk.checkedInAt?.toISOString()     ?? null,
        checkedOutAt:    bk.checkedOutAt?.toISOString()    ?? null,
        originalEndDate: bk.originalEndDate?.toISOString() ?? null,
        paymentStatus: bk.paymentStatus,
        adults:        bk.adults   ?? 1,
        children:      bk.children ?? 0,
        rooms:         bk.rooms    ?? 1,
      })),
      from: from.toISOString(),
      to:   to.toISOString(),
    };
  }

  // ─── Marcar limpeza concluída (quarto segue para INSPECTING) ─────────────
  async completeTask(taskId: string, ownerId: string) {
    const task = await this.prisma.htHousekeepingTask.findFirst({
      where: { id: taskId },
      include: { room: { include: { business: { select: { id: true, ownerId: true } } } } },
    });
    if (!task) throw new NotFoundException('Tarefa não encontrada.');
    const allowed = await this.hasBusinessAccess(task.room.business.id, ownerId, [StaffRole.HT_MANAGER, StaffRole.HT_HOUSEKEEPER]);
    if (!allowed) {
      throw new ForbiddenException('Sem permissão para esta tarefa.');
    }
    if (task.completedAt) {
      throw new BadRequestException('Tarefa já foi concluída.');
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const t = await tx.htHousekeepingTask.update({
        where: { id: taskId },
        data:  {
          startedAt: task.startedAt ?? new Date(),
          completedAt: new Date(),
        },
      });
      // Supervisor deve aprovar antes do CLEAN
      await tx.htRoom.update({
        where: { id: task.roomId },
        data:  { status: 'INSPECTING', version: { increment: 1 } },
      });
      return t;
    });
    return updated;
  }

  // ─── Aprovar inspeção e libertar quarto ───────────────────────────────────
  async approveInspection(roomId: string, ownerId: string) {
    const room = await this.prisma.htRoom.findUnique({
      where: { id: roomId },
      include: { business: { select: { id: true, ownerId: true } } },
    });
    if (!room) throw new NotFoundException('Quarto não encontrado.');
    const allowed = await this.hasBusinessAccess(room.business.id, ownerId, [StaffRole.HT_MANAGER]);
    if (!allowed) {
      throw new ForbiddenException('Sem permissão para este quarto.');
    }

    const task = await this.prisma.htHousekeepingTask.findFirst({
      where: {
        roomId,
        completedAt: { not: null },
        inspectedAt: null,
      },
      orderBy: { completedAt: 'desc' },
    });
    if (!task) {
      throw new BadRequestException('Não há tarefa concluída pendente de inspeção para este quarto.');
    }

    return this.prisma.$transaction(async (tx) => {
      const inspectedTask = await tx.htHousekeepingTask.update({
        where: { id: task.id },
        data: {
          inspectedAt: new Date(),
          inspectedById: ownerId,
        },
      });
      await tx.htRoom.update({
        where: { id: roomId },
        data: { status: 'CLEAN', version: { increment: 1 } },
      });
      return inspectedTask;
    });
  }
}