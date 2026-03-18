import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { HtBookingStatus, UserRole } from '@prisma/client';
import { EventsGateway } from '../events/events.gateway';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { BookingTypeDto, CreateBookingDto } from './dto/create-booking.dto';
import { RejectBookingDto } from './dto/reject-booking.dto';

@Injectable()
export class BookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
    private readonly mailService: MailService,
  ) {}

  private normalizeBookings(items: any[], bookingType: BookingTypeDto) {
    return items.map((item) => ({ ...item, bookingType }));
  }

  private sortByCreatedAtDesc(items: any[]) {
    return [...items].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  private async findOwnedBooking(bookingId: string, ownerId: string) {
    const include = {
      business: {
        select: {
          id: true,
          name: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    };

    const tableBookingRaw = await this.prisma.diTableBooking.findFirst({
      where: {
        id: bookingId,
        business: { ownerId },
      },
      include: { business: { select: { id: true, name: true } } },
    });

    if (tableBookingRaw) {
      // DiTableBooking não tem relação user — buscar manualmente
      const tableUser = await this.prisma.user.findUnique({
        where: { id: tableBookingRaw.userId },
        select: { id: true, name: true },
      });
      const tableBooking = { ...tableBookingRaw, user: tableUser ?? { id: tableBookingRaw.userId, name: '' } };
      return { booking: tableBooking, bookingType: BookingTypeDto.TABLE as const };
    }

    const roomBooking = await this.prisma.htRoomBooking.findFirst({
      where: {
        id: bookingId,
        business: {
          ownerId,
        },
      },
      include,
    });

    if (roomBooking) {
      return { booking: roomBooking, bookingType: BookingTypeDto.ROOM as const };
    }

    return null;
  }

  async findAllForUser(userId: string, role: UserRole) {
    // DiTableBooking não tem relação user no schema — includes separados por modelo
    const htInclude = {
      business: { select: { id: true, name: true } },
      user: { select: { id: true, name: true, email: true } },
    };
    const diInclude = {
      business: { select: { id: true, name: true } },
    };

    if (role === UserRole.OWNER) {
      const [tableBookings, roomBookings] = await Promise.all([
        this.prisma.diTableBooking.findMany({
          where: { business: { ownerId: userId } },
          include: diInclude,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.htRoomBooking.findMany({
          where: { business: { ownerId: userId } },
          include: htInclude,
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      return this.sortByCreatedAtDesc([
        ...this.normalizeBookings(tableBookings, BookingTypeDto.TABLE),
        ...this.normalizeBookings(roomBookings, BookingTypeDto.ROOM),
      ]);
    }

    const [tableBookings, roomBookings] = await Promise.all([
      this.prisma.diTableBooking.findMany({
        where: { userId },
        include: diInclude,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.htRoomBooking.findMany({
        where: { userId },
        include: { business: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return this.sortByCreatedAtDesc([
      ...this.normalizeBookings(tableBookings, BookingTypeDto.TABLE),
      ...this.normalizeBookings(roomBookings, BookingTypeDto.ROOM),
    ]);
  }

  async create(userId: string, dto: CreateBookingDto) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new BadRequestException('Datas inválidas para reserva.');
    }

    if (startDate >= endDate) {
      throw new BadRequestException('startDate deve ser menor que endDate.');
    }

    const business = await this.prisma.business.findUnique({
      where: { id: dto.businessId },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!business) {
      throw new NotFoundException('Estabelecimento não encontrado.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Utilizador não encontrado.');
    }

    const bookingType = dto.bookingType ?? BookingTypeDto.TABLE;

    // [SECURITY] Calcular totalPrice no backend — nunca aceitar o valor do frontend.
    // Previne manipulação de preço (ex: cliente envia totalPrice: 1).
    let calculatedTotalPrice: number | null = null;
    if (bookingType === BookingTypeDto.ROOM && dto.roomTypeId) {
      const roomType = await this.prisma.htRoomType.findFirst({
        where: { id: dto.roomTypeId, businessId: dto.businessId },
        select: { pricePerNight: true },
      });
      if (roomType) {
        const nights = Math.max(1, Math.ceil(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        ));
        const rooms = dto.rooms ?? 1;
        calculatedTotalPrice = roomType.pricePerNight * nights * rooms;
      }
    }

    // [RULE] Validar minNights configurado no tipo de quarto e no HtPmsConfig
    if (bookingType === BookingTypeDto.ROOM && dto.roomTypeId) {
      const nights = Math.max(1, Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      ));

      // 1. Verificar minNights do RoomType (prioridade mais específica)
      const roomType = await this.prisma.htRoomType.findFirst({
        where: { id: dto.roomTypeId, businessId: dto.businessId },
        select: { minNights: true, pricePerNight: true },
      });
      const rtMin = roomType?.minNights ?? 1;
      if (nights < rtMin) {
        throw new BadRequestException(
          `Este tipo de quarto exige um mínimo de ${rtMin} noite${rtMin !== 1 ? 's' : ''}.`
        );
      }

      // 2. Verificar minNights do HtPmsConfig (configuração global do hotel)
      const pmsConfig = await this.prisma.htPmsConfig.findUnique({
        where: { businessId: dto.businessId },
        select: { minNights: true, instantConfirm: true },
      });
      const hotelMin = pmsConfig?.minNights ?? 1;
      if (nights < hotelMin) {
        throw new BadRequestException(
          `Este estabelecimento exige um mínimo de ${hotelMin} noite${hotelMin !== 1 ? 's' : ''}.`
        );
      }

      // 3. Aplicar instantConfirm se configurado
      if (pmsConfig?.instantConfirm && !dto.status) {
        // Override: reserva confirmada imediatamente sem validação manual do dono
        (dto as any)._forceStatus = HtBookingStatus.CONFIRMED;
      }
    }

    const bookingData = {
      startDate,
      endDate,
      status: (dto as any)._forceStatus ?? dto.status ?? HtBookingStatus.PENDING,
      userId,
      businessId: dto.businessId,
    };

    const roomBookingData = {
      ...bookingData,
      guestName:  dto.guestName  ?? user.name,
      guestPhone: dto.guestPhone ?? null,
      adults:     dto.adults     ?? 1,
      children:   dto.children   ?? 0,
      rooms:      dto.rooms      ?? 1,
      totalPrice: calculatedTotalPrice, // sempre calculado no backend
      notes:      dto.notes      ?? null,
      roomTypeId: dto.roomTypeId ?? null,
    };

    // [ACID] Regras de disponibilidade + criação dentro da mesma $transaction
    // para eliminar a race condition entre o count() e o create().
    // Sem esta transação, dois pedidos simultâneos passam ambos no count()
    // antes de qualquer create() e resultam em overbooking.
    let booking: any;

    if (bookingType === BookingTypeDto.ROOM && dto.roomTypeId) {
      // Regra 1: tipo de quarto deve ter quartos físicos (pode ficar fora — não muta estado)
      const physicalRooms = await this.prisma.htRoom.count({
        where: { roomTypeId: dto.roomTypeId, businessId: dto.businessId },
      });
      if (physicalRooms === 0) {
        throw new BadRequestException('Este tipo de quarto não tem quartos físicos disponíveis.');
      }

      // [ATOMIC] count + create na mesma transação — sem window de race condition
      booking = await this.prisma.$transaction(async (tx) => {
        // Regra 2: re-contar overlaps DENTRO da transação (snapshot isolado)
        const overlapping = await tx.htRoomBooking.count({
          where: {
            roomTypeId: dto.roomTypeId,
            status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] as any },
            startDate: { lt: endDate },
            endDate:   { gt: startDate },
          },
        });
        if (overlapping >= physicalRooms) {
          throw new BadRequestException('Não há quartos disponíveis para as datas seleccionadas.');
        }
        return tx.htRoomBooking.create({
          data: roomBookingData,
          include: {
            business: { select: { id: true, name: true, ownerId: true } },
          },
        });
      });
    } else {
      // Reserva de mesa: sem overlap check, criação directa
      booking = bookingType === BookingTypeDto.ROOM
        ? await this.prisma.htRoomBooking.create({
            data: roomBookingData,
            include: { business: { select: { id: true, name: true, ownerId: true } } },
          })
        : await this.prisma.diTableBooking.create({
            data: bookingData,
            include: { business: { select: { id: true, name: true, ownerId: true } } },
          });
    }

    const guestLabel = dto.guestName ?? user.name;
    const ownerNotification = await this.prisma.notification.create({
      data: {
        userId: business.owner.id,
        title: '🛎️ Nova Reserva Recebida',
        message: `${guestLabel} criou uma nova reserva em ${business.name}.`,
        data: {
          bookingId: booking.id,
          bookingType,
          businessId: business.id,
          startDate,
          endDate,
        },
      },
    });

    await this.prisma.notification.create({
      data: {
        userId: user.id,
        title: 'Reserva Criada',
        message: `A tua reserva em ${business.name} foi criada com sucesso.`,
        data: {
          bookingId: booking.id,
          bookingType,
          businessId: business.id,
          startDate,
          endDate,
        },
      },
    });

    this.eventsGateway.emitToUser(business.owner.id, 'booking.created', {
      notificationId: ownerNotification.id,
      bookingId: booking.id,
      bookingType,
      businessId: business.id,
      businessName: business.name,
      customerName: user.name,
      startDate: booking.startDate,
      endDate: booking.endDate,
      status: booking.status,
    });

    void this.mailService.sendNewBookingEmail({
      ownerEmail: business.owner.email,
      clientEmail: user.email,
      businessName: business.name,
      startDate: booking.startDate,
      endDate: booking.endDate,
    });

    return { ...booking, bookingType };
  }

  async confirmByOwner(bookingId: string, ownerId: string, businessId?: string) {
    const found = await this.findOwnedBooking(bookingId, ownerId);

    if (!found) {
      throw new NotFoundException('Reserva não encontrada para este proprietário.');
    }

    const { booking, bookingType } = found;

    if (businessId && booking.business.id !== businessId) {
      throw new BadRequestException('Reserva não pertence ao businessId informado.');
    }

    if (booking.status === HtBookingStatus.CANCELLED) {
      throw new BadRequestException('Não é possível confirmar uma reserva cancelada.');
    }

    const updatedBooking =
      booking.status === HtBookingStatus.CONFIRMED
        ? booking
        : bookingType === BookingTypeDto.ROOM
          ? await this.prisma.htRoomBooking.update({
              where: { id: booking.id },
              data: { status: HtBookingStatus.CONFIRMED, confirmedAt: new Date() },
            })
          : await this.prisma.diTableBooking.update({
              where: { id: booking.id },
              data: { status: HtBookingStatus.CONFIRMED },
            });

    const clientNotification = await this.prisma.notification.create({
      data: {
        userId: booking.user.id,
        title: 'Reserva Confirmada',
        message: `A tua reserva em ${booking.business.name} foi confirmada.`,
        data: {
          bookingId: booking.id,
          bookingType,
          businessId: booking.business.id,
          status: HtBookingStatus.CONFIRMED,
        },
      },
    });

    this.eventsGateway.emitToUser(booking.user.id, 'booking.confirmed', {
      notificationId: clientNotification.id,
      bookingId: booking.id,
      bookingType,
      businessId: booking.business.id,
      status: HtBookingStatus.CONFIRMED,
    });

    return { ...updatedBooking, bookingType };
  }

  async rejectByOwner(bookingId: string, ownerId: string, dto: RejectBookingDto) {
    const found = await this.findOwnedBooking(bookingId, ownerId);

    if (!found) {
      throw new NotFoundException('Reserva não encontrada para este proprietário.');
    }

    const { booking, bookingType } = found;

    if (dto.businessId && booking.business.id !== dto.businessId) {
      throw new BadRequestException('Reserva não pertence ao businessId informado.');
    }

    // [RULE] Não permitir cancelar reserva com hóspede já no hotel
    if (booking.status === HtBookingStatus.CHECKED_IN) {
      throw new BadRequestException(
        'Não é possível cancelar uma reserva activa (hóspede em casa). Faça o checkout primeiro.'
      );
    }

    const reason = dto.reason?.trim();
    const updatedBooking =
      booking.status === HtBookingStatus.CANCELLED
        ? booking
        : bookingType === BookingTypeDto.ROOM
          ? await this.prisma.htRoomBooking.update({
              where: { id: booking.id },
              data: { status: HtBookingStatus.CANCELLED, updatedAt: new Date() },
            })
          : await this.prisma.diTableBooking.update({
              where: { id: booking.id },
              data: { status: HtBookingStatus.CANCELLED },
            });

    const clientNotification = await this.prisma.notification.create({
      data: {
        userId: booking.user.id,
        title: 'Reserva Recusada',
        message: reason
          ? `A tua reserva em ${booking.business.name} foi recusada. Motivo: ${reason}`
          : `A tua reserva em ${booking.business.name} foi recusada.`,
        data: {
          bookingId: booking.id,
          bookingType,
          businessId: booking.business.id,
          status: HtBookingStatus.CANCELLED,
          reason: reason || null,
        },
      },
    });

    this.eventsGateway.emitToUser(booking.user.id, 'booking.rejected', {
      notificationId: clientNotification.id,
      bookingId: booking.id,
      bookingType,
      businessId: booking.business.id,
      status: HtBookingStatus.CANCELLED,
      reason: reason || null,
    });

    return { ...updatedBooking, bookingType };
  }

  async updateByOwner(bookingId: string, ownerId: string, dto: { startDate?: string; endDate?: string; roomTypeId?: string }) {
    const found = await this.findOwnedBooking(bookingId, ownerId);
    if (!found) throw new NotFoundException('Reserva não encontrada.');
    const { booking, bookingType } = found;
    // Edição de datas/tipo só suportada em reservas de quarto
    if (bookingType !== BookingTypeDto.ROOM) {
      throw new BadRequestException('Edição de datas só disponível para reservas de quarto.');
    }
    if (booking.status === HtBookingStatus.CHECKED_IN || booking.status === HtBookingStatus.CHECKED_OUT) {
      throw new BadRequestException('Não é possível editar uma reserva activa ou concluída.');
    }
    // Cast seguro — confirmado acima que é ROOM
    const roomBooking = booking as any;
    const data: any = {};
    if (dto.startDate)  data.startDate  = new Date(dto.startDate);
    if (dto.endDate)    data.endDate    = new Date(dto.endDate);
    if (dto.roomTypeId) data.roomTypeId = dto.roomTypeId;
    // Recalcular preço se datas ou tipo mudaram
    const currentRoomTypeId = dto.roomTypeId || roomBooking.roomTypeId;
    if (currentRoomTypeId) {
      const rt = await this.prisma.htRoomType.findFirst({
        where: { id: currentRoomTypeId }, select: { pricePerNight: true },
      });
      if (rt) {
        const s = data.startDate || roomBooking.startDate;
        const e = data.endDate   || roomBooking.endDate;
        const nights = Math.max(1, Math.ceil((new Date(e).getTime() - new Date(s).getTime()) / 86400000));
        data.totalPrice = rt.pricePerNight * nights * (roomBooking.rooms ?? 1);
      }
    }
    return this.prisma.htRoomBooking.update({ where: { id: bookingId }, data });
  }

  async getAvailability(businessId: string, roomTypeId: string, startDate: string, endDate: string) {
    const sDate = new Date(startDate);
    const eDate = new Date(endDate);
    if (isNaN(sDate.getTime()) || isNaN(eDate.getTime())) {
      throw new BadRequestException('Datas inválidas.');
    }
    const nights = Math.ceil((eDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24));
    const [physicalRooms, overlapping] = await Promise.all([
      this.prisma.htRoom.count({ where: { roomTypeId, businessId } }),
      this.prisma.htRoomBooking.count({
        where: {
          roomTypeId,
          status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] as any },
          startDate: { lt: eDate },
          endDate:   { gt: sDate },
        },
      }),
    ]);
    // Se não há quartos físicos configurados, usar totalRooms do tipo como capacidade.
    // Isso evita bloquear reservas quando o dono ainda não configurou os quartos físicos.
    const effectiveCapacity = physicalRooms > 0
      ? physicalRooms
      : 0; // 0 aqui sinaliza "sem quartos físicos" -- o frontend trata este caso
    const available = physicalRooms > 0
      ? Math.max(0, physicalRooms - overlapping)
      : 0; // sem quartos físicos -> não sabemos a capacidade real

    // Calcular próxima data disponível se ocupado
    let nextAvailableDate: string | null = null;
    if (available === 0 && physicalRooms > 0) {
      // Encontrar a última reserva activa que se sobrepõe e sugerir após o seu checkout
      const lastBooking = await this.prisma.htRoomBooking.findFirst({
        where: {
          roomTypeId,
          status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] as any },
          startDate: { lt: eDate },
          endDate:   { gt: sDate },
        },
        orderBy: { endDate: 'desc' },
        select: { endDate: true },
      });
      if (lastBooking) {
        // Sugerir endDate + 1 para garantir tempo de limpeza/housekeeping.
        // Ex: reserva 10→12, checkout dia 12, próxima entrada sugerida: dia 13.
        const next = new Date(lastBooking.endDate);
        next.setDate(next.getDate() + 1);
        // Verificar se nessa data já há disponibilidade
        const nextEnd = new Date(next.getTime() + nights * 24 * 60 * 60 * 1000);
        const nextOccupied = await this.prisma.htRoomBooking.count({
          where: {
            roomTypeId,
            status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] as any },
            startDate: { lt: nextEnd },
            endDate:   { gt: next },
          },
        });
        if (nextOccupied < physicalRooms) {
          const d = next.toISOString().slice(0, 10);
          const [y, m, day] = d.split('-');
          nextAvailableDate = `${day}/${m}/${y}`;
        }
      }
    }

    return { roomTypeId, physicalRooms, occupied: overlapping, available, nextAvailableDate };
  }
}