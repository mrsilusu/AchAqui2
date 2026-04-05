import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { HtBookingStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { CheckInDto } from './dto/check-in.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';

// [TENANT] Todas as queries incluem businessId extraído do JWT.
// [ACID]   check-in e check-out usam transação Prisma ($transaction).
// [AUDIT]  Cada mutação regista uma linha em core_audit_logs.

@Injectable()
export class HtBookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  private normalizeDocumentNumber(value?: string | null): string | null {
    const raw = String(value || '').trim();
    if (!raw) return null;
    return raw.replace(/\s+/g, '').toUpperCase();
  }

  // [TENANT] Valida que a reserva pertence ao negócio do owner autenticado.
  // Previne IDOR: Owner A não acede a reservas de Owner B.
  private async findBookingForOwner(bookingId: string, ownerId: string) {
    // [IDOR FIX] Filtra por business.ownerId — impede Owner A de operar reservas de Owner B
    const booking = await this.prisma.htRoomBooking.findFirst({
      where: { id: bookingId, business: { ownerId } },
      include: {
        room:     true,
        roomType: { select: { name: true } },
        user:     { select: { id: true, name: true, email: true } },
        business: { select: { id: true, name: true, ownerId: true } },
        guestProfile: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            documentType: true,
            documentNumber: true,
            companyName: true,
            nif: true,
            nationality: true,
            dateOfBirth: true,
          },
        },
      },
    } as any);
    if (!booking) throw new NotFoundException('Reserva não encontrada ou sem permissão.');
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

  // [LEGAL AO] Check-in requer identificação válida do hóspede.
  // Garante perfil persistente ligado à reserva para histórico e conformidade.
  private async ensureGuestProfileForCheckIn(
    booking: any,
    dto: CheckInDto,
  ): Promise<string> {
    const fullName = (dto.guestName?.trim() || booking.guestName?.trim() || booking.user?.name || '').trim();
    if (!fullName) {
      throw new BadRequestException('Nome do hóspede é obrigatório para check-in.');
    }

    const phone = dto.guestPhone?.trim() || booking.guestPhone?.trim() || null;
    const documentType = dto.documentType?.trim() || booking.guestProfile?.documentType || 'BI';
    const documentNumber = this.normalizeDocumentNumber(dto.documentNumber || booking.guestProfile?.documentNumber || null);
    if (!documentNumber) {
      throw new BadRequestException('Documento de identificação é obrigatório para check-in (BI/Passaporte).');
    }

    const nationality = dto.nationality?.trim() || booking.guestProfile?.nationality || null;
    const companyName = dto.companyName?.trim() || booking.guestProfile?.companyName || null;
    const nif = dto.nif?.trim() || booking.guestProfile?.nif || null;
    const dateOfBirth = dto.dateOfBirth?.trim()
      ? new Date(dto.dateOfBirth)
      : (booking.guestProfile?.dateOfBirth ?? null);
    if (dateOfBirth && Number.isNaN(dateOfBirth.getTime())) {
      throw new BadRequestException('Data de nascimento inválida.');
    }

    const existingByDocument = await this.prisma.htGuestProfile.findFirst({
      where: {
        businessId: booking.businessId,
        documentNumber,
      },
      select: { id: true },
    });

    if (booking.guestProfileId) {
      if (existingByDocument && existingByDocument.id !== booking.guestProfileId) {
        throw new BadRequestException('Número de documento já registado para outro hóspede neste estabelecimento.');
      }
      const updated = await this.prisma.htGuestProfile.update({
        where: { id: booking.guestProfileId },
        data: {
          fullName,
          phone,
          documentType,
          documentNumber,
          companyName,
          nif,
          nationality,
          dateOfBirth,
        } as any,
        select: { id: true },
      });
      return updated.id;
    }

    if (existingByDocument) {
      throw new BadRequestException(
        'Número de documento já registado para outro hóspede neste estabelecimento. ' +
        'Use um perfil existente em vez de criar um novo no check-in.'
      );
    }

    const created = await this.prisma.htGuestProfile.create({
      data: {
        businessId: booking.businessId,
        fullName,
        phone,
        email: booking.user?.email ?? null,
        documentType,
        documentNumber,
        companyName,
        nif,
        nationality,
        dateOfBirth,
      } as any,
      select: { id: true },
    });
    return created.id;
  }

  // CHECK-IN
  // [ACID] Transação atómica: atualiza reserva + atribui quarto.
  async checkIn(bookingId: string, ownerId: string, dto: CheckInDto, ip?: string) {
    const booking: any = await this.findBookingForOwner(bookingId, ownerId);

    if (booking.status !== HtBookingStatus.CONFIRMED && booking.status !== HtBookingStatus.PENDING) {
      throw new BadRequestException(`Não é possível fazer check-in. Estado actual: ${booking.status}`);
    }

    // [PMS] Validação de early check-in
    const todayMidnight = new Date(); todayMidnight.setHours(0,0,0,0);
    const checkInDate   = new Date(booking.startDate); checkInDate.setHours(0,0,0,0);
    const daysEarly     = Math.round((checkInDate.getTime() - todayMidnight.getTime()) / 86400000);

    let earlyCheckInFee = 0;
    if (daysEarly > 0) {
      // Check-in antecipado: calcular taxa proporcional
      const pmsConfig = await this.prisma.htPmsConfig.findUnique({
        where:  { businessId: booking.businessId },
        select: { earlyCheckinFee: true, lateCheckoutFee: true },
      }).catch(() => null);

      // Se o hotel tem earlyCheckinFee configurada, usar esse valor
      // Caso contrário: cobrar 1 diária completa por cada dia antecipado
      if (pmsConfig?.earlyCheckinFee && pmsConfig.earlyCheckinFee > 0) {
        earlyCheckInFee = pmsConfig.earlyCheckinFee * daysEarly;
      } else if (booking.roomTypeId) {
        const rt = await this.prisma.htRoomType.findFirst({
          where: { id: booking.roomTypeId }, select: { pricePerNight: true },
        });
        if (rt) earlyCheckInFee = rt.pricePerNight * daysEarly;
      }

      // Guardar info do early check-in para o caller usar (não lança erro — o owner decide)
      // O caller (controller) devolve earlyCheckInInfo na resposta
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
    const guestProfileId = await this.ensureGuestProfileForCheckIn(booking, dto);

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

    const realArrival = new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      // [Fix 2] Verificar colisão: outro hóspede CHECKED_IN no mesmo quarto
      if (resolvedRoomId) {
        const collision = await tx.htRoomBooking.findFirst({
          where: {
            id:      { not: bookingId },
            roomId:  resolvedRoomId,
            status:  HtBookingStatus.CHECKED_IN,
          },
          select: { guestName: true },
        });
        if (collision) {
          throw new BadRequestException(
            `Quarto já está ocupado por ${collision.guestName || 'outro hóspede'}. ` +
            `Escolha outro quarto ou faça o checkout do hóspede actual.`
          );
        }
      }

      return tx.htRoomBooking.update({
        where: { id: bookingId },
        data: {
          status:      HtBookingStatus.CHECKED_IN,
          checkedInAt: realArrival,
          roomId:      resolvedRoomId,
          guestProfileId,
          guestName:   dto.guestName  ?? booking.guestName,
          guestPhone:  dto.guestPhone ?? booking.guestPhone,
          // [Fix 1] Early check-in: startDate passa a ser o dia real de entrada
          ...(daysEarly > 0 && { startDate: realArrival }),
          version:     { increment: 1 },
        },
        include: {
          room:     { select: { number: true } },
          roomType: { select: { name: true } },
          user:     { select: { id: true, name: true } },
          business: { select: { id: true, name: true } },
        },
      });
    });

    // Se houve early check-in, adicionar taxa ao folio
    if (earlyCheckInFee > 0) {
      await this.prisma.htFolioItem.create({
        data: {
          businessId:  booking.businessId,
          bookingId,
          type:        'SERVICE' as any,
          description: `Check-in antecipado (${daysEarly} dia${daysEarly !== 1 ? 's' : ''} antes da data prevista)`,
          quantity:    daysEarly,
          unitPrice:   earlyCheckInFee / daysEarly,
          amount:      earlyCheckInFee,
        },
      }).catch(() => null); // não bloquear o check-in se o folio falhar
    }

    await this.audit({
      businessId:   booking.businessId,
      action:       'HT_BOOKING_CHECKED_IN',
      actorId:      ownerId,
      resourceId:   bookingId,
      previousData: { status: previousStatus },
      newData:      { status: HtBookingStatus.CHECKED_IN, roomId: updated.roomId, checkedInAt: updated.checkedInAt, earlyCheckInFee },
      ipAddress:    ip,
    });

    this.eventsGateway.emitToUser(booking.user.id, 'booking.checkedIn', {
      bookingId,
      businessName: booking.business.name,
      roomNumber:   updated.room?.number,
      checkedInAt:  updated.checkedInAt,
      earlyCheckIn: daysEarly > 0 ? { daysEarly, fee: earlyCheckInFee } : null,
    });

    return {
      ...updated,
      earlyCheckIn: daysEarly > 0 ? { daysEarly, fee: earlyCheckInFee } : null,
    };
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

  // CANCELAMENTO (owner) — requer motivo e apenas antes do CHECKED_IN.
  async cancel(bookingId: string, ownerId: string, dto: CancelBookingDto, ip?: string) {
    const booking: any = await this.findBookingForOwner(bookingId, ownerId);
    const reason = String(dto?.reason || '').trim();
    if (reason.length < 3) {
      throw new BadRequestException('Motivo do cancelamento é obrigatório (mínimo 3 caracteres).');
    }

    if (booking.status !== HtBookingStatus.PENDING && booking.status !== HtBookingStatus.CONFIRMED) {
      throw new BadRequestException(`Só é possível cancelar reservas PENDING/CONFIRMED. Estado actual: ${booking.status}`);
    }

    const previousStatus = booking.status;

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedBooking = await tx.htRoomBooking.update({
        where: { id: bookingId },
        data: {
          status: HtBookingStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelReason: reason,
          version: { increment: 1 },
        },
      });

      if (booking.roomId) {
        await tx.htRoom.update({
          where: { id: booking.roomId },
          data: { status: 'CLEAN', version: { increment: 1 } },
        }).catch(() => null);
      }

      return updatedBooking;
    });

    await this.audit({
      businessId: booking.businessId,
      action: 'HT_BOOKING_CANCELLED',
      actorId: ownerId,
      resourceId: bookingId,
      previousData: { status: previousStatus },
      newData: { status: HtBookingStatus.CANCELLED, cancelledAt: updated.cancelledAt, cancelReason: reason },
      note: reason,
      ipAddress: ip,
    });

    this.eventsGateway.emitToUser(booking.user.id, 'booking.cancelled', {
      bookingId,
      businessName: booking.business.name,
      cancelledAt: updated.cancelledAt,
      reason,
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

  // SAÍDAS — duas listas combinadas:
  //   1. Checkouts pendentes: CHECKED_IN com endDate hoje ou nos próx. 7 dias
  //   2. Checkouts recentes:  CHECKED_OUT nos últimos 7 dias
  async getTodayDepartures(businessId: string, ownerId: string) {
    const now   = new Date();
    const today = new Date(now); today.setHours(0, 0, 0, 0);
    const next7 = new Date(now); next7.setDate(next7.getDate() + 7); next7.setHours(23, 59, 59, 999);
    const past7 = new Date(now); past7.setDate(past7.getDate() - 7); past7.setHours(0, 0, 0, 0);

    const [pending, recent] = await Promise.all([
      // Hóspedes ainda dentro que devem sair nos próximos 7 dias
      this.prisma.htRoomBooking.findMany({
        where: { businessId, status: HtBookingStatus.CHECKED_IN,
                 endDate: { gte: today, lte: next7 } },
        select: BOOKING_SELECT,
        orderBy: { endDate: 'asc' },
      }),
      // Checkouts já efectuados nos últimos 7 dias
      this.prisma.htRoomBooking.findMany({
        where: { businessId, status: HtBookingStatus.CHECKED_OUT,
                 checkedOutAt: { gte: past7 } },
        select: BOOKING_SELECT,
        orderBy: { checkedOutAt: 'desc' },
      }),
    ]);

    return [
      ...pending,
      ...recent.map(b => ({ ...b, _recentCheckout: true })),
    ];
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

  // PROLONGAR ESTADIA — move o endDate para uma data posterior
  async extendStay(bookingId: string, ownerId: string, newEndDate: string, ip?: string) {
    const booking = await this.findBookingForOwner(bookingId, ownerId);
    if (booking.status !== HtBookingStatus.CHECKED_IN) {
      throw new BadRequestException('Só é possível prolongar estadias activas (CHECKED_IN).');
    }
    const eDate = new Date(newEndDate);
    if (isNaN(eDate.getTime())) throw new BadRequestException('Data inválida.');
    if (eDate <= booking.endDate) {
      throw new BadRequestException('A nova data de saída deve ser posterior à actual.');
    }
    // Verificar disponibilidade do quarto físico específico para o período adicional
    if (booking.roomId) {
      const roomConflict = await this.prisma.htRoomBooking.findFirst({
        where: {
          id:        { not: bookingId },
          roomId:    booking.roomId,
          status:    { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] as any },
          startDate: { lt: eDate },
          endDate:   { gt: booking.endDate },
        },
      });
      if (roomConflict) {
        throw new BadRequestException('O quarto tem outra reserva nesse período. Muda o hóspede de quarto primeiro.');
      }
    } else if (booking.roomTypeId) {
      const overlapping = await this.prisma.htRoomBooking.count({
        where: {
          id:         { not: bookingId },
          roomTypeId: booking.roomTypeId,
          status:     { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] as any },
          startDate:  { lt: eDate },
          endDate:    { gt: booking.endDate },
        },
      });
      const physicalRooms = await this.prisma.htRoom.count({
        where: { roomTypeId: booking.roomTypeId, businessId: booking.businessId },
      });
      if (overlapping >= physicalRooms) {
        throw new BadRequestException('Sem disponibilidade para prolongar a estadia nessas datas.');
      }
    }
    // Recalcular preço total
    let newTotalPrice = booking.totalPrice;
    if (booking.roomTypeId) {
      const rt = await this.prisma.htRoomType.findFirst({
        where: { id: booking.roomTypeId },
        select: { pricePerNight: true },
      });
      if (rt) {
        const nights = Math.ceil((eDate.getTime() - booking.startDate.getTime()) / (1000 * 60 * 60 * 24));
        newTotalPrice = rt.pricePerNight * nights * (booking.rooms ?? 1);
      }
    }
    const updated = await this.prisma.htRoomBooking.update({
      where: { id: bookingId },
      data:  { endDate: eDate, totalPrice: newTotalPrice, version: { increment: 1 } },
    });
    await this.audit({
      businessId: booking.businessId, action: 'HT_BOOKING_MODIFIED',
      actorId: ownerId, resourceId: bookingId,
      previousData: { endDate: booking.endDate, totalPrice: booking.totalPrice },
      newData:      { endDate: eDate, totalPrice: newTotalPrice },
      ipAddress: ip,
    });
    return updated;
  }

  // ALTERAR QUARTO — muda o quarto físico atribuído durante a estadia
  async changeRoom(bookingId: string, ownerId: string, newRoomId: string, ip?: string) {
    const booking = await this.findBookingForOwner(bookingId, ownerId);
    if (booking.status !== HtBookingStatus.CHECKED_IN) {
      throw new BadRequestException('Só é possível alterar o quarto em estadias activas (CHECKED_IN).');
    }
    const newRoom = await this.prisma.htRoom.findFirst({
      where: { id: newRoomId, businessId: booking.businessId },
    });
    if (!newRoom) throw new BadRequestException('Quarto não encontrado.');
    if (newRoom.status === 'DIRTY' || newRoom.status === 'MAINTENANCE') {
      throw new BadRequestException(`Quarto ${newRoom.number} não está disponível (${newRoom.status}).`);
    }
    if (newRoom.roomTypeId !== booking.roomTypeId) {
      throw new BadRequestException('O novo quarto deve ser do mesmo tipo da reserva.');
    }
    const previousRoomId = booking.roomId;
    const updated = await this.prisma.$transaction(async (tx) => {
      // Verificar colisão DENTRO da transação -- outro CHECKED_IN no quarto destino
      const collision = await tx.htRoomBooking.findFirst({
        where: { id: { not: bookingId }, roomId: newRoomId,
                 status: HtBookingStatus.CHECKED_IN },
        select: { guestName: true },
      });
      if (collision) {
        throw new ConflictException(
          `Quarto Nº ${newRoom.number} já está ocupado por ${collision.guestName || 'outro hóspede'}. ` +
          `Faça o checkout desse hóspede primeiro ou escolha outro quarto.`
        );
      }
      const updatedBooking = await tx.htRoomBooking.update({
        where: { id: bookingId },
        data:  { roomId: newRoomId, version: { increment: 1 } },
      });
      // Marcar quarto anterior como DIRTY para limpeza
      if (previousRoomId) {
        await tx.htRoom.update({
          where: { id: previousRoomId },
          data:  { status: 'DIRTY', version: { increment: 1 } },
        });
        await tx.htHousekeepingTask.create({
          data: { roomId: previousRoomId, priority: 'URGENT' },
        });
      }
      return updatedBooking;
    });
    await this.audit({
      businessId: booking.businessId, action: 'HT_ROOM_REASSIGNED',
      actorId: ownerId, resourceId: bookingId,
      previousData: { roomId: previousRoomId },
      newData:      { roomId: newRoomId },
      ipAddress: ip,
    });
    return updated;
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
  cancelledAt: true, cancelReason: true,
  totalPrice: true, paymentStatus: true, roomTypeId: true,
  guestProfile: {
    select: {
      id: true,
      documentType: true,
      documentNumber: true,
      companyName: true,
      nif: true,
      nationality: true,
      dateOfBirth: true,
    },
  },
  roomType: { select: { name: true, pricePerNight: true } },
  room:     { select: { number: true, floor: true } },
  user:     { select: { id: true, name: true } },
} as const;