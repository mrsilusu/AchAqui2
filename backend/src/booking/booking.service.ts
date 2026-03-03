import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { EventsGateway } from '../events/events.gateway';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@Injectable()
export class BookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
    private readonly mailService: MailService,
  ) {}

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
}
