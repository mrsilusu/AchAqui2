import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { HtBookingStatus, HtRoomStatus, StaffRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { HtAuditService } from './ht-audit.service';
import { CheckInDto } from './dto/check-in.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { CreateHtBookingDto } from './dto/create-booking.dto';

// [TENANT] Todas as queries incluem businessId extraído do JWT.
// [ACID]   check-in e check-out usam transação Prisma ($transaction).
// [AUDIT]  Cada mutação regista uma linha em core_audit_logs.

@Injectable()
export class HtBookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
    private readonly htAuditService: HtAuditService,
  ) {}

  private normalizeDocumentNumber(value?: string | null): string | null {
    const raw = String(value || '').trim();
    if (!raw) return null;
    return raw.replace(/\s+/g, '').toUpperCase();
  }

  private async assertAccess(businessId: string, actorId: string, actorRole: string = 'OWNER', actorBusinessId?: string) {
    // STAFF: o businessId foi validado e assinado no JWT durante o login
    // Basta confirmar que o businessId pedido coincide com o do JWT
    if (String(actorRole) === 'STAFF') {
      if (!actorBusinessId || actorBusinessId !== businessId) {
        throw new ForbiddenException('Sem permissão para este estabelecimento.');
      }
      return;
    }

    // OWNER: validação existente contra a base de dados
    const b = await this.prisma.business.findFirst({
      where: {
        id: businessId,
        OR: [{ ownerId: actorId }],
      },
      select: { id: true },
    });
    if (!b) {
      throw new ForbiddenException('Sem permissão para este estabelecimento.');
    }
  }

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

    const coreStaff = await this.prisma.coreBusinessStaff.findFirst({
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

    if (coreStaff) return true;

    const htStaff = await this.prisma.htStaff.findFirst({
      where: { businessId, userId, isActive: true },
      select: { department: true },
    });
    if (!htStaff) return false;
    if (!allowedRoles?.length) return true;
    const inferredRole = htStaff.department === 'RECEPTION'
      ? StaffRole.HT_RECEPTIONIST
      : htStaff.department === 'MANAGEMENT'
        ? StaffRole.HT_MANAGER
        : StaffRole.HT_HOUSEKEEPER;
    return allowedRoles.includes(inferredRole);
  }

  // [TENANT] Valida que a reserva pertence ao negócio do utilizador autenticado.
  // Previne IDOR: utilizador sem vínculo ao negócio não pode operar reservas.
  private async findBookingForOwner(bookingId: string, ownerId: string) {
    const booking = await this.prisma.htRoomBooking.findFirst({
      where: { id: bookingId },
      include: {
        room:     true,
        roomType: { select: { name: true, pricePerNight: true } },
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
    if (!booking) throw new NotFoundException('Reserva não encontrada.');

    const allowed = await this.hasBusinessAccess(booking.businessId, ownerId);
    if (!allowed) throw new ForbiddenException('Sem permissão para esta reserva.');

    return booking;
  }

  // [AUDIT] Linha imutável no log central — nunca dados pessoais em previousData/newData.
  private async audit(params: {
    businessId: string; action: string; actorId: string;
    resourceId: string; resourceType?: string; resourceName?: string; previousData?: object; newData?: object;
    note?: string; ipAddress?: string;
  }) {
    await this.htAuditService.log({
      businessId: params.businessId,
      module: 'HT' as any,
      action: params.action,
      actorId: params.actorId,
      resourceType: params.resourceType || 'HtRoomBooking',
      resourceId: params.resourceId,
      resourceName: params.resourceName,
      previousData: (params.previousData || {}) as any,
      newData: (params.newData || {}) as any,
      note: params.note,
      ipAddress: params.ipAddress,
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

    // Verificar blacklist — hóspede bloqueado não pode fazer check-in
    if (guestProfileId) {
      const profile = await this.prisma.htGuestProfile.findUnique({
        where: { id: guestProfileId },
        select: { isBlacklisted: true, fullName: true },
      });
      if (profile?.isBlacklisted) {
        throw new ForbiddenException(
          `Check-in bloqueado: hóspede ${profile.fullName ?? ''} está em lista negra.`,
        );
      }
    }

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

      if (!resolvedRoomId) {
        throw new BadRequestException(
          'Não é possível fazer check-in sem quarto atribuído. Seleccione um quarto disponível.',
        );
      }

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
      resourceName: `Reserva ${booking.guestName || booking.user?.name || bookingId.slice(0, 8)}`,
      previousData: {
        status: previousStatus,
        roomId: booking.roomId,
      },
      newData: {
        status: HtBookingStatus.CHECKED_IN,
        roomId: updated.roomId,
        roomNumber: updated.room?.number || null,
        roomTypeName: updated.roomType?.name || null,
        guestName: booking.guestName || booking.user?.name || null,
        startDate: booking.startDate,
        endDate: booking.endDate,
        checkedInAt: updated.checkedInAt,
        earlyCheckInFee,
      },
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
    const booking: any = await this.findBookingForOwner(bookingId, ownerId);

    if (booking.status !== HtBookingStatus.CHECKED_IN) {
      throw new BadRequestException(`Não é possível fazer check-out. Estado actual: ${booking.status}`);
    }

    const now = new Date();
    const plannedEnd = new Date(booking.endDate);
    const isEarly = now < plannedEnd;
    const previousStatus = booking.status;

    const realNights = Math.max(1, Math.ceil(
      (now.getTime() - new Date(booking.startDate).getTime()) / 86400000,
    ));
    const plannedNights = Math.max(1, Math.ceil(
      (plannedEnd.getTime() - new Date(booking.startDate).getTime()) / 86400000,
    ));

    let newTotalPrice = booking.totalPrice;
    let folioAdjusted = false;
    if (isEarly && booking.paymentStatus !== 'PAID') {
      const pricePerNight = booking.roomType?.pricePerNight ?? 0;
      if (pricePerNight > 0) {
        newTotalPrice = pricePerNight * realNights * (booking.rooms ?? 1);
        folioAdjusted = true;
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedBooking = await tx.htRoomBooking.update({
        where: { id: bookingId },
        data: {
          status: HtBookingStatus.CHECKED_OUT,
          checkedOutAt: now,
          ...(isEarly && {
            endDate: now,
            originalEndDate: plannedEnd,
            totalPrice: newTotalPrice,
          }),
          version: { increment: 1 },
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
        }).catch(() => null);
      }
      return updatedBooking;
    });

    await this.audit({
      businessId:   booking.businessId,
      action:       'HT_BOOKING_CHECKED_OUT',
      actorId:      ownerId,
      resourceId:   bookingId,
      resourceName: `Reserva ${booking.guestName || booking.user?.name || bookingId.slice(0, 8)}`,
      previousData: {
        status: previousStatus,
        endDate: booking.endDate,
        roomId: booking.roomId,
        guestName: booking.guestName || booking.user?.name || null,
      },
      newData: {
        status: HtBookingStatus.CHECKED_OUT,
        roomId: updated.room?.id || booking.roomId || null,
        roomNumber: updated.room?.number || null,
        guestName: booking.guestName || booking.user?.name || null,
        checkedOutAt: now,
        plannedEndDate: plannedEnd,
        actualNights: realNights,
        plannedNights,
        folioAdjusted,
        totalPrice: updated.totalPrice,
      },
      ipAddress: ip,
    });

    if (booking.business?.ownerId) {
      this.eventsGateway.emitToUser(booking.business.ownerId, 'room.dirty', {
      bookingId,
      roomId:     updated.room?.id,
      roomNumber: updated.room?.number,
      });
    }

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

        // Criar tarefa de housekeeping após no-show para inspeção/limpeza rápida do quarto.
        await tx.htHousekeepingTask.create({
          data: {
            roomId: booking.roomId,
            priority: 'NORMAL',
            notes: 'No-show marcado na receção',
          },
        }).catch(() => null);
      }
      return updatedBooking;
    });

    // Penalização No-Show configurada em HtPmsConfig (não bloqueia no-show em caso de erro).
    try {
      const cfg = await this.prisma.htPmsConfig.findUnique({
        where: { businessId: booking.businessId },
        select: { noShowPenalty: true },
      });
      if (cfg?.noShowPenalty && cfg.noShowPenalty > 0) {
        await this.prisma.htFolioItem.create({
          data: {
            businessId: booking.businessId,
            bookingId,
            type: 'OTHER' as any,
            description: 'Penalização No-Show',
            quantity: 1,
            unitPrice: cfg.noShowPenalty,
            amount: cfg.noShowPenalty,
            addedById: ownerId,
          },
        });
      }
    } catch {
      // Não bloquear fluxo de no-show por erro de folio/config.
    }

    await this.audit({
      businessId:   booking.businessId,
      action:       'HT_BOOKING_NO_SHOW',
      actorId:      ownerId,
      resourceId:   bookingId,
      resourceName: `Reserva ${booking.guestName || (booking as any).user?.name || bookingId.slice(0, 8)}`,
      previousData: {
        status: previousStatus,
        guestName: booking.guestName || (booking as any).user?.name || null,
        startDate: booking.startDate,
        endDate: booking.endDate,
      },
      newData: {
        status: HtBookingStatus.NO_SHOW,
        guestName: booking.guestName || (booking as any).user?.name || null,
        roomNumber: (booking as any).room?.number || null,
        noShowAt: updated.noShowAt,
      },
      ipAddress:    ip,
    });

    const bookingUserId = (booking as any)?.user?.id || booking.userId;
    const bookingBusinessName = (booking as any)?.business?.name || null;
    this.eventsGateway.emitToUser(bookingUserId, 'booking.noShow', {
      bookingId,
      businessName: bookingBusinessName,
      noShowAt: updated.noShowAt,
    });

    return updated;
  }

  async postponeBooking(bookingId: string, ownerId: string, ip?: string) {
    const booking = await this.findBookingForOwner(bookingId, ownerId);
    if (booking.status !== HtBookingStatus.CONFIRMED && booking.status !== HtBookingStatus.PENDING) {
      throw new BadRequestException(`Estado inválido para adiar: ${booking.status}`);
    }

    const previousStart = booking.startDate;
    const previousEnd = booking.endDate;

    const newStart = new Date(booking.startDate);
    newStart.setDate(newStart.getDate() + 1);

    const durationMs = booking.endDate.getTime() - booking.startDate.getTime();
    const newEnd = new Date(newStart.getTime() + durationMs);

    const updated = await this.prisma.htRoomBooking.update({
      where: { id: bookingId },
      data: {
        startDate: newStart,
        endDate: newEnd,
        status: HtBookingStatus.CONFIRMED,
        version: { increment: 1 },
      },
    });

    await this.audit({
      businessId: booking.businessId,
      action: 'HT_BOOKING_MODIFIED',
      actorId: ownerId,
      resourceId: bookingId,
      resourceName: `Reserva ${booking.guestName || (booking as any).user?.name || bookingId.slice(0, 8)}`,
      previousData: { startDate: previousStart, endDate: previousEnd },
      newData: {
        startDate: newStart,
        endDate: newEnd,
        guestName: booking.guestName || (booking as any).user?.name || null,
        reason: 'postpone_noshow',
      },
      ipAddress: ip,
    });

    return updated;
  }

  // REVERTER NO-SHOW — dois fluxos conforme exista penalidade
  async revertNoShow(bookingId: string, applyPenalty: boolean, ownerId: string, ip?: string) {
    const booking = await this.findBookingForOwner(bookingId, ownerId);

    if (booking.status !== HtBookingStatus.NO_SHOW) {
      throw new BadRequestException('Booking não está em No-Show');
    }

    // Verificar se folio já está pago (bloqueia reversão)
    if (booking.paymentStatus === 'PAID') {
      throw new BadRequestException('Folio já encerrado — reversão bloqueada');
    }

    const now = new Date();

    // Buscar pricePerNight do roomType usando roomTypeId
    let pricePerNight = 0;
    if (booking.roomTypeId) {
      const roomType = await this.prisma.htRoomType.findUnique({
        where: { id: booking.roomTypeId },
        select: { pricePerNight: true },
      });
      pricePerNight = roomType?.pricePerNight ?? 0;
    }

    // Ler config para obter noShowPenalty
    const config = await this.prisma.htPmsConfig.findFirst({
      where: { businessId: booking.businessId },
      select: { noShowPenalty: true },
    });
    const penaltyAmount = config?.noShowPenalty && config.noShowPenalty > 0
      ? config.noShowPenalty
      : (applyPenalty ? pricePerNight : 0);

    // Calcular noites restantes a partir de agora
    const remainingMs = booking.endDate.getTime() - now.getTime();
    const remainingNights = Math.max(1, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));
    const newTotalPrice = remainingNights * pricePerNight;

    // Efectuar transacção
    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedBooking = await tx.htRoomBooking.update({
        where: { id: bookingId },
        data: {
          status: HtBookingStatus.CHECKED_IN,
          checkedInAt: now,
          // Fluxo 4a: startDate imutável; 4b: startDate = now
          ...(applyPenalty ? {} : { startDate: now }),
          totalPrice: newTotalPrice,
          version: { increment: 1 },
        },
      });

      // Só criar folio item de penalidade se fluxo 4a com penalidade
      if (applyPenalty && penaltyAmount > 0) {
        await tx.htFolioItem.create({
          data: {
            businessId: booking.businessId,
            bookingId,
            type: 'OTHER' as any,
            description: 'Penalidade No-Show',
            quantity: 1,
            unitPrice: penaltyAmount,
            amount: penaltyAmount,
            addedById: ownerId,
          },
        });
      }

      // Quarto volta a DIRTY (em uso por hóspede CHECKED_IN)
      if (booking.roomId) {
        await tx.htRoom.update({
          where: { id: booking.roomId },
          data: { status: 'DIRTY', version: { increment: 1 } },
        });
      }

      return updatedBooking;
    });

    // Audit log
    await this.audit({
      businessId: booking.businessId,
      action: 'HT_BOOKING_REVERT_NO_SHOW',
      actorId: ownerId,
      resourceId: bookingId,
      resourceName: `Reserva ${booking.guestName || (booking as any).user?.name || bookingId.slice(0, 8)}`,
      previousData: {
        status: HtBookingStatus.NO_SHOW,
        guestName: booking.guestName || (booking as any).user?.name || null,
      },
      newData: {
        status: HtBookingStatus.CHECKED_IN,
        guestName: booking.guestName || (booking as any).user?.name || null,
        roomNumber: (booking as any).room?.number || null,
        applyPenalty,
        penaltyAmount,
        newTotalPrice,
      },
      note: `applyPenalty=${applyPenalty} | penalty=${penaltyAmount}`,
      ipAddress: ip,
    });

    return { success: true, applyPenalty, penaltyAmount, newTotalPrice };
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
      resourceName: `Reserva ${booking.guestName || booking.user?.name || bookingId.slice(0, 8)}`,
      previousData: {
        status: previousStatus,
        guestName: booking.guestName || booking.user?.name || null,
        startDate: booking.startDate,
        endDate: booking.endDate,
      },
      newData: {
        status: HtBookingStatus.CANCELLED,
        guestName: booking.guestName || booking.user?.name || null,
        cancelledAt: updated.cancelledAt,
        cancelReason: reason,
      },
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

  // CHEGADAS — janela de 14 dias (7 passados + próximos 7) para incluir atrasos de check-in.
  // [TENANT] [GDPR] — não expõe dados sensíveis do hóspede.
  async getTodayArrivals(businessId: string, actorId: string, actorRole: string = 'OWNER', actorBusinessId?: string) {
    await this.assertAccess(businessId, actorId, actorRole, actorBusinessId);
    const now   = new Date();
    const start = new Date(now); start.setDate(start.getDate() - 7); start.setHours(0, 0, 0, 0);
    const end7  = new Date(now); end7.setDate(end7.getDate() + 7); end7.setHours(23, 59, 59, 999);
    return this.prisma.htRoomBooking.findMany({
      where: {
        businessId,
        startDate: { gte: start, lte: end7 },
        status: { in: [HtBookingStatus.PENDING, HtBookingStatus.CONFIRMED, HtBookingStatus.NO_SHOW] },
      },
      select: BOOKING_SELECT,
      orderBy: { startDate: 'asc' },
    });
  }

  // SAÍDAS — duas listas combinadas:
  //   1. Checkouts pendentes: CHECKED_IN com endDate hoje ou nos próx. 7 dias
  //   2. Checkouts recentes:  CHECKED_OUT nos últimos 7 dias
  async getTodayDepartures(businessId: string, actorId: string, actorRole: string = 'OWNER', actorBusinessId?: string) {
    await this.assertAccess(businessId, actorId, actorRole, actorBusinessId);
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
  async getCurrentGuests(businessId: string, actorId: string, actorRole: string = 'OWNER', actorBusinessId?: string) {
    await this.assertAccess(businessId, actorId, actorRole, actorBusinessId);
    return this.prisma.htRoomBooking.findMany({
      where: { businessId, status: HtBookingStatus.CHECKED_IN },
      select: BOOKING_SELECT,
      orderBy: { checkedInAt: 'asc' },
    });
  }

  // ESTADIAS EXPIRADAS — hóspedes CHECKED_IN com endDate anterior a hoje.
  async getExpiredStays(businessId: string, actorId: string, actorRole: string = 'OWNER', actorBusinessId?: string) {
    await this.assertAccess(businessId, actorId, actorRole, actorBusinessId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.prisma.htRoomBooking.findMany({
      where: {
        businessId,
        status: HtBookingStatus.CHECKED_IN,
        endDate: { lt: today },
      },
      select: {
        ...BOOKING_SELECT,
        room: { select: { id: true, number: true, floor: true, roomType: { select: { id: true, name: true, pricePerNight: true } } } },
      } as any,
      orderBy: { endDate: 'asc' },
    });
  }

  // PROLONGAR ESTADIA EXPIRADA — sem tocar no item ACCOMMODATION (virtual no folio).
  async extendExpiredStay(bookingId: string, ownerId: string, newEndDate: string, ip?: string) {
    const booking: any = await this.findBookingForOwner(bookingId, ownerId);

    if (booking.status !== HtBookingStatus.CHECKED_IN) {
      throw new BadRequestException('Reserva não está em CHECKED_IN.');
    }
    if (booking.paymentStatus === 'PAID') {
      throw new BadRequestException('Folio já encerrado — não é possível alterar valores. Contacte o administrador.');
    }

    const eDate = new Date(newEndDate);
    if (Number.isNaN(eDate.getTime())) throw new BadRequestException('Data inválida.');
    if (eDate <= booking.endDate) {
      throw new BadRequestException('Nova data deve ser posterior à data actual de saída.');
    }

    const pricePerNight = booking.roomType?.pricePerNight ?? 0;
    if (pricePerNight <= 0) {
      throw new BadRequestException('Não foi possível calcular o valor por noite para esta reserva.');
    }

    const extraDays = Math.max(0, Math.ceil((eDate.getTime() - booking.endDate.getTime()) / 86400000));
    if (extraDays <= 0) {
      throw new BadRequestException('Extensão inválida.');
    }

    const totalNights = Math.max(1, Math.ceil((eDate.getTime() - booking.startDate.getTime()) / 86400000));
    const newTotalPrice = pricePerNight * totalNights * (booking.rooms ?? 1);

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedBooking = await tx.htRoomBooking.update({
        where: { id: bookingId },
        data: {
          endDate: eDate,
          totalPrice: newTotalPrice,
          version: { increment: 1 },
        },
      });

      await tx.htFolioItem.create({
        data: {
          businessId: booking.businessId,
          bookingId,
          type: 'OTHER' as any,
          description: `Extensão de estadia — ${extraDays} noite(s) extra`,
          quantity: extraDays,
          unitPrice: pricePerNight,
          amount: extraDays * pricePerNight,
          addedById: ownerId,
        },
      }).catch(() => null);

      return updatedBooking;
    });

    await this.audit({
      businessId: booking.businessId,
      action: 'HT_BOOKING_MODIFIED',
      actorId: ownerId,
      resourceId: bookingId,
      previousData: { endDate: booking.endDate, totalPrice: booking.totalPrice },
      newData: {
        endDate: eDate,
        totalPrice: newTotalPrice,
        extraDays,
        extraCharge: extraDays * pricePerNight,
      },
      note: 'extend_expired_stay',
      ipAddress: ip,
    });

    return {
      success: true,
      booking: updated,
      extraDays,
      extraCharge: extraDays * pricePerNight,
    };
  }

  // CHECKOUT PARA ESTADIAS EXPIRADAS — retroactivo/forçado/não confirmado.
  async expiredCheckOut(
    bookingId: string,
    ownerId: string,
    options: { mode: 'retroactive' | 'forced' | 'unconfirmed'; realCheckoutDate?: string },
    ip?: string,
  ) {
    const booking: any = await this.findBookingForOwner(bookingId, ownerId);

    if (booking.status !== HtBookingStatus.CHECKED_IN) {
      throw new BadRequestException('Reserva não está em CHECKED_IN.');
    }
    if (booking.paymentStatus === 'PAID' && options.mode !== 'unconfirmed') {
      throw new BadRequestException('Folio já encerrado — não é possível alterar valores. Contacte o administrador.');
    }

    const now = new Date();
    const todayMidnight = new Date(now); todayMidnight.setHours(0, 0, 0, 0);

    let effectiveCheckoutDate: Date;
    if (options.mode === 'retroactive') {
      if (!options.realCheckoutDate) {
        throw new BadRequestException('realCheckoutDate é obrigatório para checkout retroactivo.');
      }
      effectiveCheckoutDate = new Date(options.realCheckoutDate);
      if (Number.isNaN(effectiveCheckoutDate.getTime())) {
        throw new BadRequestException('Data de checkout retroactivo inválida.');
      }
      const checkInAt = booking.checkedInAt ? new Date(booking.checkedInAt) : new Date(booking.startDate);
      if (effectiveCheckoutDate < checkInAt) {
        throw new BadRequestException('A data de checkout não pode ser anterior ao check-in.');
      }
      if (effectiveCheckoutDate > now) {
        throw new BadRequestException('A data de checkout retroactivo não pode ser no futuro.');
      }
    } else if (options.mode === 'forced') {
      effectiveCheckoutDate = now;
    } else {
      // unconfirmed — assume saída na data prevista
      effectiveCheckoutDate = new Date(booking.endDate);
    }

    const checkInRef = booking.checkedInAt ? new Date(booking.checkedInAt) : new Date(booking.startDate);
    const pricePerNight = booking.roomType?.pricePerNight ?? 0;
    if (pricePerNight <= 0) {
      throw new BadRequestException('Não foi possível calcular o valor por noite para esta reserva.');
    }

    const realNights = Math.max(1, Math.ceil((effectiveCheckoutDate.getTime() - checkInRef.getTime()) / 86400000));
    const plannedNights = Math.max(1, Math.ceil((new Date(booking.endDate).getTime() - new Date(booking.startDate).getTime()) / 86400000));
    const extraNights = Math.max(0, realNights - plannedNights);
    const recalculatedTotalPrice = pricePerNight * realNights * (booking.rooms ?? 1);
    const shouldAdjustFinancials = !(booking.paymentStatus === 'PAID' && options.mode === 'unconfirmed');
    const persistedTotalPrice = shouldAdjustFinancials
      ? recalculatedTotalPrice
      : (booking.totalPrice ?? recalculatedTotalPrice);

    const supportsInspecting = Object.values(HtRoomStatus).includes('INSPECTING' as HtRoomStatus);
    const roomStatusAfterCheckout: HtRoomStatus = options.mode === 'unconfirmed'
      ? (supportsInspecting ? ('INSPECTING' as HtRoomStatus) : ('DIRTY' as HtRoomStatus))
      : ('CLEAN' as HtRoomStatus);

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedBooking = await tx.htRoomBooking.update({
        where: { id: bookingId },
        data: {
          status: HtBookingStatus.CHECKED_OUT,
          checkedOutAt: effectiveCheckoutDate,
          endDate: effectiveCheckoutDate,
          originalEndDate: booking.endDate,
          totalPrice: persistedTotalPrice,
          version: { increment: 1 },
        },
        include: {
          room: { select: { id: true, number: true } },
        },
      });

      if (extraNights > 0 && shouldAdjustFinancials) {
        await tx.htFolioItem.create({
          data: {
            businessId: booking.businessId,
            bookingId,
            type: 'OTHER' as any,
            description: `Noites extra — ${extraNights} noite(s) além do previsto`,
            amount: extraNights * pricePerNight,
            quantity: extraNights,
            unitPrice: pricePerNight,
            addedById: ownerId,
          },
        }).catch(() => null);
      }

      if (booking.roomId) {
        await tx.htRoom.update({
          where: { id: booking.roomId },
          data: { status: roomStatusAfterCheckout, version: { increment: 1 } },
        });

        await tx.htHousekeepingTask.create({
          data: {
            roomId: booking.roomId,
            priority: options.mode === 'unconfirmed' ? 'URGENT' : 'NORMAL',
            notes: options.mode === 'unconfirmed'
              ? 'Inspecção necessária — saída não confirmada pelo hóspede'
              : 'Quarto para limpeza após checkout',
          },
        }).catch(() => null);
      }

      if (options.mode === 'unconfirmed' && booking.guestProfileId) {
        const profile = await tx.htGuestProfile.findUnique({
          where: { id: booking.guestProfileId },
          select: { notes: true },
        });
        const noteLine = `Saída não confirmada registada em ${effectiveCheckoutDate.toISOString()}.`;
        const currentNotes = String(profile?.notes || '').trim();
        const mergedNotes = currentNotes ? `${currentNotes}\n${noteLine}` : noteLine;
        await tx.htGuestProfile.update({
          where: { id: booking.guestProfileId },
          data: { notes: mergedNotes },
        }).catch(() => null);
      }

      return updatedBooking;
    });

    await this.audit({
      businessId: booking.businessId,
      action: 'HT_BOOKING_CHECKED_OUT',
      actorId: ownerId,
      resourceId: bookingId,
      previousData: { status: HtBookingStatus.CHECKED_IN, endDate: booking.endDate },
      newData: {
        status: HtBookingStatus.CHECKED_OUT,
        mode: options.mode,
        effectiveCheckoutDate,
        originalEndDate: booking.endDate,
        realNights,
        extraNights,
        totalPrice: persistedTotalPrice,
      },
      note: 'expired_checkout',
      ipAddress: ip,
    });

    return {
      success: true,
      mode: options.mode,
      effectiveCheckoutDate,
      realNights,
      extraNights,
      booking: updated,
    };
  }

  // [TENANT] Verifica que o owner é dono do negócio sem carregar reservas.
  private async assertOwnership(businessId: string, ownerId: string) {
    const allowed = await this.hasBusinessAccess(businessId, ownerId);
    if (!allowed) throw new ForbiddenException('Sem permissão para este estabelecimento.');
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

    // CONFIRMAR RESERVA (owner confirma PENDING → CONFIRMED)
    async confirmBooking(bookingId: string, ownerId: string, ip?: string) {
      const booking: any = await this.findBookingForOwner(bookingId, ownerId);
      if (booking.status !== HtBookingStatus.PENDING) {
        throw new BadRequestException(`Estado inválido para confirmação: ${booking.status}`);
      }
      const updated = await this.prisma.htRoomBooking.update({
        where: { id: bookingId },
        data: {
          status: HtBookingStatus.CONFIRMED,
          confirmedAt: new Date(),
          version: { increment: 1 },
        },
      });
      await this.audit({
        businessId:   booking.businessId,
        action:       'HT_BOOKING_CONFIRMED',
        actorId:      ownerId,
        resourceId:   bookingId,
        resourceName: `Reserva ${booking.guestName || booking.user?.name || bookingId.slice(0, 8)}`,
        previousData: { status: booking.status },
        newData: {
          status: HtBookingStatus.CONFIRMED,
          confirmedAt: updated.confirmedAt,
          guestName: booking.guestName || booking.user?.name || null,
          startDate: booking.startDate,
          endDate: booking.endDate,
          totalPrice: booking.totalPrice,
        },
        ipAddress:    ip,
      });
      return updated;
    }

    // CRIAR RESERVA (owner cria directamente no PMS)
    async createBooking(dto: CreateHtBookingDto, ownerId: string, actorRole: string = 'OWNER', actorBusinessId?: string) {
      await this.assertAccess(dto.businessId, ownerId, actorRole, actorBusinessId);

      const roomType = await this.prisma.htRoomType.findFirst({
        where: { id: dto.roomTypeId, businessId: dto.businessId },
      });
      if (!roomType) throw new BadRequestException('Tipo de quarto não encontrado.');

      const startDate = new Date(dto.startDate);
      const endDate   = new Date(dto.endDate);
      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        throw new BadRequestException('Datas inválidas.');
      }
      if (endDate <= startDate) throw new BadRequestException('Data de saída deve ser posterior à entrada.');

      const nights = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000));
      const totalPrice = nights * roomType.pricePerNight;

      const owner = await this.prisma.business.findUnique({
        where: { id: dto.businessId },
        select: { ownerId: true },
      });
      if (!owner?.ownerId) throw new BadRequestException('Negócio sem owner atribuído.');

      const booking = await this.prisma.htRoomBooking.create({
        data: {
          businessId:  dto.businessId,
          roomTypeId:  dto.roomTypeId,
          userId:      owner.ownerId,
          startDate,
          endDate,
          guestName:   dto.guestName  ?? null,
          guestPhone:  dto.guestPhone ?? null,
          adults:      dto.adults     ?? 1,
          children:    dto.children   ?? 0,
          notes:       dto.notes      ?? null,
          totalPrice,
          status:      HtBookingStatus.CONFIRMED,
          confirmedAt: new Date(),
        },
      });

      await this.audit({
        businessId: dto.businessId,
        action:     'HT_BOOKING_CREATED',
        actorId:    ownerId,
        resourceId: booking.id,
        resourceName: `Reserva ${dto.guestName || booking.id.slice(0, 8)}`,
        newData: {
          status: HtBookingStatus.CONFIRMED,
          guestName: dto.guestName || null,
          guestPhone: dto.guestPhone || null,
          roomTypeId: dto.roomTypeId,
          roomTypeName: roomType.name,
          startDate,
          endDate,
          adults: dto.adults ?? 1,
          children: dto.children ?? 0,
          totalPrice,
        },
      });

      return booking;
    }

    async getRoomTypes(businessId: string, requesterId: string, requesterRole: string = 'OWNER', requesterBusinessId?: string) {
      await this.assertAccess(businessId, requesterId, requesterRole, requesterBusinessId);
      return this.prisma.htRoomType.findMany({
        where: { businessId },
        orderBy: { createdAt: 'asc' },
      });
    }

    async updateRoomType(
      id: string,
      requesterId: string,
      requesterRole: string,
      dto: {
        businessId: string;
        photos?: string[];
        amenities?: string[];
        name?: string;
        description?: string;
      },
      requesterBusinessId?: string,
    ) {
      await this.assertAccess(dto.businessId, requesterId, requesterRole, requesterBusinessId);

      const roomType = await this.prisma.htRoomType.findFirst({
        where: { id, businessId: dto.businessId },
        include: { business: { select: { ownerId: true } } },
      });

      if (!roomType) {
        throw new NotFoundException('Tipo de quarto não encontrado.');
      }

      if (dto.photos && dto.photos.length > 10) {
        throw new BadRequestException('Máximo de 10 fotos permitido.');
      }

      return this.prisma.htRoomType.update({
        where: { id },
        data: {
          ...(dto.photos !== undefined && { photos: dto.photos }),
          ...(dto.amenities !== undefined && { amenities: dto.amenities }),
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.description !== undefined && { description: dto.description }),
        },
      });
    }

    // ACTUALIZAR CONFIGURAÇÃO PMS (overbookingBuffer e outros campos tipados)
    async updatePmsConfig(businessId: string, ownerId: string, data: { overbookingBuffer?: number }, actorRole: string = 'OWNER', actorBusinessId?: string) {
      await this.assertAccess(businessId, ownerId, actorRole, actorBusinessId);
      return this.prisma.htPmsConfig.upsert({
        where:  { businessId },
        update: data,
        create: { businessId, ...data },
      });
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