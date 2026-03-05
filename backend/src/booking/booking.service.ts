import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, UserRole } from '@prisma/client';
import { EventsGateway } from '../events/events.gateway';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { RejectBookingDto } from './dto/reject-booking.dto';

@Injectable()
export class BookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
    private readonly mailService: MailService,
  ) {}

  async findAllForUser(userId: string, role: UserRole) {
    if (role === UserRole.OWNER) {
      return this.prisma.booking.findMany({
        where: {
          business: {
            ownerId: userId,
          },
        },
        include: {
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
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    }

    return this.prisma.booking.findMany({
      where: {
        userId,
      },
      include: {
        business: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
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

    const booking = await this.prisma.booking.create({
      data: {
        startDate,
        endDate,
        status: dto.status ?? BookingStatus.PENDING,
        userId,
        businessId: dto.businessId,
      },
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

    const ownerNotification = await this.prisma.notification.create({
      data: {
        userId: business.owner.id,
        title: 'Nova Reserva Recebida',
        message: `${user.name} criou uma nova reserva em ${business.name}.`,
        data: {
          bookingId: booking.id,
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
          businessId: business.id,
          startDate,
          endDate,
        },
      },
    });

    this.eventsGateway.emitToUser(business.owner.id, 'booking.created', {
      notificationId: ownerNotification.id,
      bookingId: booking.id,
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

    return booking;
  }

  async confirmByOwner(bookingId: string, ownerId: string, businessId?: string) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        id: bookingId,
        business: {
          ownerId,
        },
      },
      include: {
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
      },
    });

    if (!booking) {
      throw new NotFoundException('Reserva não encontrada para este proprietário.');
    }

    if (businessId && booking.business.id !== businessId) {
      throw new BadRequestException('Reserva não pertence ao businessId informado.');
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Não é possível confirmar uma reserva cancelada.');
    }

    const updatedBooking =
      booking.status === BookingStatus.CONFIRMED
        ? booking
        : await this.prisma.booking.update({
            where: { id: booking.id },
            data: { status: BookingStatus.CONFIRMED },
          });

    const clientNotification = await this.prisma.notification.create({
      data: {
        userId: booking.user.id,
        title: 'Reserva Confirmada',
        message: `A tua reserva em ${booking.business.name} foi confirmada.`,
        data: {
          bookingId: booking.id,
          businessId: booking.business.id,
          status: BookingStatus.CONFIRMED,
        },
      },
    });

    this.eventsGateway.emitToUser(booking.user.id, 'booking.confirmed', {
      notificationId: clientNotification.id,
      bookingId: booking.id,
      businessId: booking.business.id,
      status: BookingStatus.CONFIRMED,
    });

    return updatedBooking;
  }

  async rejectByOwner(bookingId: string, ownerId: string, dto: RejectBookingDto) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        id: bookingId,
        business: {
          ownerId,
        },
      },
      include: {
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
      },
    });

    if (!booking) {
      throw new NotFoundException('Reserva não encontrada para este proprietário.');
    }

    if (dto.businessId && booking.business.id !== dto.businessId) {
      throw new BadRequestException('Reserva não pertence ao businessId informado.');
    }

    const reason = dto.reason?.trim();
    const updatedBooking =
      booking.status === BookingStatus.CANCELLED
        ? booking
        : await this.prisma.booking.update({
            where: { id: booking.id },
            data: { status: BookingStatus.CANCELLED },
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
          businessId: booking.business.id,
          status: BookingStatus.CANCELLED,
          reason: reason || null,
        },
      },
    });

    this.eventsGateway.emitToUser(booking.user.id, 'booking.rejected', {
      notificationId: clientNotification.id,
      bookingId: booking.id,
      businessId: booking.business.id,
      status: BookingStatus.CANCELLED,
      reason: reason || null,
    });

    return updatedBooking;
  }
}
