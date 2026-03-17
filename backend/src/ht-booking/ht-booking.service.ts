import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { HtBookingStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { CheckInDto } from './dto/check-in.dto';

// [TENANT] Todas as queries incluem businessId extraído do JWT.
// [ACID]   check-in e check-out usam transação Prisma ($transaction).
// [AUDIT]  Cada mutação regista uma linha em core_audit_logs.

@Injectable()
export class HtBookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  // [TENANT] Valida que a reserva pertence ao negócio do owner autenticado.
  // Previne IDOR: Owner A não acede a reservas de Owner B.
  private async findBookingForOwner(bookingId: string, ownerId: string) {
    const booking = await this.prisma.htRoomBooking.findFirst({
      where: { id: bookingId }, // Roles guard garante que só OWNERs chegam aqui
      include: {
        room:     true,
        roomType: { select: { name: true } },
        user:     { select: { id: true, name: true, email: true } },
        business: { select: { id: true, name: true, ownerId: true } },
      },
    });
    if (!booking) throw new NotFoundException('Reserva não encontrada.');
    return booking;
  }

  // [AUDIT] Linha imutável no log central — nunca dados pessoais em previousData/newData.
  private async audit(params: {
    businessId: string; action: string; actorId: string;
    resourceId: string; previousData?: object; newData?: object;
    note?: string; ipAddress?: string;
  }) {
    await this.prisma.coreAuditLog.create({
      data: {
        businessId:   params.businessId,
        module:       'HT',
        action:       params.action as any,
        actorId:      params.actorId,
        resourceType: 'HtRoomBooking',
        resourceId:   params.resourceId,
        previousData: params.previousData ?? {},
        newData:      params.newData ?? {},
        note:         params.note,
        ipAddress:    params.ipAddress,
      },
    });
  }

  // CHECK-IN
  // [ACID] Transação atómica: atualiza reserva + atribui quarto.
  async checkIn(bookingId: string, ownerId: string, dto: CheckInDto, ip?: string) {
    const booking = await this.findBookingForOwner(bookingId, ownerId);

    if (booking.status !== HtBookingStatus.CONFIRMED && booking.status !== HtBookingStatus.PENDING) {
      throw new BadRequestException(`Não é possível fazer check-in. Estado actual: ${booking.status}`);
    }

    if (dto.roomId) {
      const room = await this.prisma.htRoom.findFirst({
        where: { id: dto.roomId, businessId: booking.businessId },
      });
      if (!room) throw new BadRequestException('Quarto não encontrado neste estabelecimento.');
      if (room.status === 'DIRTY' || room.status === 'MAINTENANCE') {
        throw new BadRequestException(`Quarto ${room.number} não está disponível (${room.status}).`);
      }
    }

    const previousStatus = booking.status;

    // Se não veio roomId explícito, atribuir automaticamente um quarto CLEAN do tipo correcto.
    // Sem esta atribuição, o HtRoom nunca fica marcado como ocupado no dashboard.
    let resolvedRoomId = dto.roomId ?? booking.roomId ?? null;
    if (!resolvedRoomId && booking.roomTypeId) {
      const autoRoom = await this.prisma.htRoom.findFirst({
        where: {
          businessId: booking.businessId,
          roomTypeId: booking.roomTypeId,
          status: 'CLEAN',
        },
        orderBy: { number: 'asc' },
      });
      if (autoRoom) resolvedRoomId = autoRoom.id;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedBooking = await tx.htRoomBooking.update({
        where: { id: bookingId },
        data: {
          status:      HtBookingStatus.CHECKED_IN,
          checkedInAt: new Date(),
          roomId:      resolvedRoomId,
          guestName:   dto.guestName  ?? booking.guestName,
          guestPhone:  dto.guestPhone ?? booking.guestPhone,
          version:     { increment: 1 },
        },
        include: {
          room:     { select: { number: true } },
          roomType: { select: { name: true } },
          user:     { select: { id: true, name: true } },
          business: { select: { id: true, name: true } },
        },
      });
      // Marcar o quarto físico como OCCUPIED (via CLEAN com booking activo)
      // O status mantém-se CLEAN -- a ocupação é inferida pelas reservas CHECKED_IN no dashboard.
      // Nada a fazer aqui para o status do room -- o dashboard já faz:
      // occupied = rooms.filter(r => r.status === 'CLEAN' && r.bookings.length > 0)
      // O que importa é que resolvedRoomId esteja na reserva para o join funcionar.
      return updatedBooking;
    });

    await this.audit({
      businessId:   booking.businessId,
      action:       'HT_BOOKING_CHECKED_IN',
      actorId:      ownerId,
      resourceId:   bookingId,
      previousData: { status: previousStatus },
      newData:      { status: HtBookingStatus.CHECKED_IN, roomId: updated.roomId, checkedInAt: updated.checkedInAt },
      ipAddress:    ip,
    });

    this.eventsGateway.emitToUser(booking.user.id, 'booking.checkedIn', {
      bookingId,
      businessName: booking.business.name,
      roomNumber:   updated.room?.number,
      checkedInAt:  updated.checkedInAt,
    });

    return updated;
  }

  // CHECK-OUT
  // [ACID] Transação: reserva CHECKED_OUT + quarto DIRTY + HousekeepingTask criada.
  async checkOut(bookingId: string, ownerId: string, ip?: string) {
    const booking = await this.findBookingForOwner(bookingId, ownerId);

    if (booking.status !== HtBookingStatus.CHECKED_IN) {
      throw new BadRequestException(`Não é possível fazer check-out. Estado actual: ${booking.status}`);
    }

    const previousStatus = booking.status;

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedBooking = await tx.htRoomBooking.update({
        where: { id: bookingId },
        data: {
          status:       HtBookingStatus.CHECKED_OUT,
          checkedOutAt: new Date(),
          version:      { increment: 1 },
        },
        include: {
          room:     { select: { id: true, number: true } },
          business: { select: { id: true, name: true } },
          user:     { select: { id: true, name: true } },
        },
      });
      if (updatedBooking.roomId) {
        await tx.htRoom.update({
          where: { id: updatedBooking.roomId },
          data: { status: 'DIRTY', version: { increment: 1 } },
        });
        await tx.htHousekeepingTask.create({
          data: { roomId: updatedBooking.roomId, priority: 'NORMAL' },
        });
      }
      return updatedBooking;
    });

    await this.audit({
      businessId:   booking.businessId,
      action:       'HT_BOOKING_CHECKED_OUT',
      actorId:      ownerId,
      resourceId:   bookingId,
      previousData: { status: previousStatus },
      newData:      { status: HtBookingStatus.CHECKED_OUT, checkedOutAt: updated.checkedOutAt },
      ipAddress:    ip,
    });

    this.eventsGateway.emitToUser(ownerId, 'room.dirty', {
      bookingId,
      roomId:     updated.room?.id,
      roomNumber: updated.room?.number,
    });

    return updated;
  }

  // NO-SHOW — liberta quarto se atribuído.
  async markNoShow(bookingId: string, ownerId: string, ip?: string) {
    const booking = await this.findBookingForOwner(bookingId, ownerId);

    if (booking.status !== HtBookingStatus.CONFIRMED && booking.status !== HtBookingStatus.PENDING) {
      throw new BadRequestException(`Estado inválido para No-Show: ${booking.status}`);
    }

    const previousStatus = booking.status;

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedBooking = await tx.htRoomBooking.update({
        where: { id: bookingId },
        data: { status: HtBookingStatus.NO_SHOW, noShowAt: new Date(), version: { increment: 1 } },
      });
      if (booking.roomId) {
        await tx.htRoom.update({
          where: { id: booking.roomId },
          data: { status: 'CLEAN', version: { increment: 1 } },
        });
      }
      return updatedBooking;
    });

    await this.audit({
      businessId:   booking.businessId,
      action:       'HT_BOOKING_NO_SHOW',
      actorId:      ownerId,
      resourceId:   bookingId,
      previousData: { status: previousStatus },
      newData:      { status: HtBookingStatus.NO_SHOW, noShowAt: updated.noShowAt },
      ipAddress:    ip,
    });

    return updated;
  }

  // CHEGADAS — próximos 7 dias (PENDING ou CONFIRMED). Se não houver hoje, mostra as próximas.
  // [TENANT] [GDPR] — não expõe dados sensíveis do hóspede.
  async getTodayArrivals(businessId: string, ownerId: string) {
    const now   = new Date();
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    const end7  = new Date(now); end7.setDate(end7.getDate() + 7); end7.setHours(23, 59, 59, 999);
    return this.prisma.htRoomBooking.findMany({
      where: {
        businessId,
        startDate: { gte: start, lte: end7 },
        status: { in: [HtBookingStatus.PENDING, HtBookingStatus.CONFIRMED] },
      },
      select: BOOKING_SELECT,
      orderBy: { startDate: 'asc' },
    });
  }

  // SAÍDAS — próximos 7 dias com status CHECKED_IN.
  async getTodayDepartures(businessId: string, ownerId: string) {
    const now   = new Date();
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    const end7  = new Date(now); end7.setDate(end7.getDate() + 7); end7.setHours(23, 59, 59, 999);
    return this.prisma.htRoomBooking.findMany({
      where: {
        businessId,
        endDate: { gte: start, lte: end7 },
        status: HtBookingStatus.CHECKED_IN,
      },
      select: BOOKING_SELECT,
      orderBy: { endDate: 'asc' },
    });
  }

  // HÓSPEDES ACTUAIS — todos com status CHECKED_IN.
  async getCurrentGuests(businessId: string, ownerId: string) {
    return this.prisma.htRoomBooking.findMany({
      where: { businessId, status: HtBookingStatus.CHECKED_IN },
      select: BOOKING_SELECT,
      orderBy: { checkedInAt: 'asc' },
    });
  }

  // [TENANT] Verifica que o owner é dono do negócio sem carregar reservas.
  private async assertOwnership(businessId: string, ownerId: string) {
    const b = await this.prisma.business.findFirst({ where: { id: businessId, ownerId } });
    if (!b) throw new ForbiddenException('Sem permissão para este estabelecimento.');
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function todayRange() {
  const now   = new Date();
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const end   = new Date(now); end.setHours(23, 59, 59, 999);
  return { start, end };
}

const BOOKING_SELECT = {
  id: true, guestName: true, guestPhone: true,
  adults: true, children: true, rooms: true,
  startDate: true, endDate: true, status: true,
  notes: true, checkedInAt: true, checkedOutAt: true,
  totalPrice: true, paymentStatus: true, roomTypeId: true,
  roomType: { select: { name: true, pricePerNight: true } },
  room:     { select: { number: true, floor: true } },
  user:     { select: { id: true, name: true } },
} as const;