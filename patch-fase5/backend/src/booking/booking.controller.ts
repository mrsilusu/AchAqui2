import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { RejectBookingDto } from './dto/reject-booking.dto';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';

// Limite global de leitura: 60 req/min por IP
@UseGuards(ThrottlerGuard)
@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Get()
  findAll(
    @Req() req: { user: { userId: string; role: UserRole } },
  ) {
    return this.bookingService.findAllForUser(req.user.userId, req.user.role);
  }

  // SEGURANÇA: Rate limit agressivo em criação de reservas —
  // máximo 5 reservas por minuto por IP para prevenir DoS e spam de agenda.
  @Post()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  create(
    @Req() req: { user: { userId: string } },
    @Body() createBookingDto: CreateBookingDto,
  ) {
    // SEGURANÇA: totalPrice enviado pelo frontend é ignorado.
    // O backend recalcula o preço a partir da DB — ver BookingService.create().
    return this.bookingService.create(req.user.userId, createBookingDto);
  }

  // SEGURANÇA: confirmByOwner valida internamente que o booking.business.ownerId
  // corresponde ao req.user.userId — Cross-Tenant check garantido no service.
  @Patch(':id/confirm')
  @Roles(UserRole.OWNER)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  confirm(
    @Param('id') id: string,
    @Req() req: { user: { userId: string } },
    @Body() body: { businessId?: string },
  ) {
    return this.bookingService.confirmByOwner(id, req.user.userId, body?.businessId);
  }

  // SEGURANÇA: rejectByOwner valida internamente que booking.business.ownerId === currentUserId.
  // Um Owner A não consegue cancelar reservas de Owner B mesmo conhecendo o bookingId.
  @Patch(':id/reject')
  @Roles(UserRole.OWNER)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  reject(
    @Param('id') id: string,
    @Req() req: { user: { userId: string } },
    @Body() body: RejectBookingDto,
  ) {
    return this.bookingService.rejectByOwner(id, req.user.userId, body);
  }
}
