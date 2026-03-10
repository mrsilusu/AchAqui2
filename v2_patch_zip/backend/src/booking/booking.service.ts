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

    const tableBooking = await this.prisma.diTableBooking.findFirst({
      where: {
        id: bookingId,
        business: {
          ownerId,
        },
      },
      include,
    });

    if (tableBooking) {
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
    const includeForOwner = {
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
          email: true,
        },
      },
    };

    const includeForClient = {
      business: {
        select: {
          id: true,
          name: true,
        },
      },
    };

    if (role === UserRole.OWNER) {
      const [tableBookings, roomBookings] = await Promise.all([
        this.prisma.diTableBooking.findMany({
          where: {
            business: {
              ownerId: userId,
            },
          },
          include: includeForOwner,
          orderBy: {
            createdAt: 'desc',
          },
        }),
        this.prisma.htRoomBooking.findMany({
          where: {
            business: {
              ownerId: userId,
            },
          },
          include: includeForOwner,
          orderBy: {
            createdAt: 'desc',
          },
        }),
      ]);

      return this.sortByCreatedAtDesc([
        ...this.normalizeBookings(tableBookings, BookingTypeDto.TABLE),
        ...this.normalizeBookings(roomBookings, BookingTypeDto.ROOM),
      ]);
    }

    const [tableBookings, roomBookings] = await Promise.all([
      this.prisma.diTableBooking.findMany({
        where: {
          userId,
        },
        include: includeForClient,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.htRoomBooking.findMany({
        where: {
          userId,
        },
        include: includeForClient,
        orderBy: {
          createdAt: 'desc',
        },
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

    const bookingData = {
      startDate,
      endDate,
      status: dto.status ?? HtBookingStatus.PENDING,
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
      totalPrice: dto.totalPrice ?? null,
      notes:      dto.notes      ?? null,
      roomTypeId: dto.roomTypeId ?? null,
    };

    const booking =
      bookingType === BookingTypeDto.ROOM
        ? await this.prisma.htRoomBooking.create({
            data: roomBookingData,
            include: {
              business: {
                select: {
                  id: true,
                  name: true,
                  ownerId: true,
                },
              },
            },
          })
        : await this.prisma.diTableBooking.create({
            data: bookingData,
            include: {
              business: {
                select: {
                  id: true,
                  name: true,
                  ownerId: true,
                },
              },
            },
          });

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
              data: { status: HtBookingStatus.CONFIRMED },
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

    const reason = dto.reason?.trim();
    const updatedBooking =
      booking.status === HtBookingStatus.CANCELLED
        ? booking
        : bookingType === BookingTypeDto.ROOM
          ? await this.prisma.htRoomBooking.update({
              where: { id: booking.id },
              data: { status: HtBookingStatus.CANCELLED },
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
}
