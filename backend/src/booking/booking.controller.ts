import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { RejectBookingDto } from './dto/reject-booking.dto';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';

// Limite global de leitura: 60 req/min por IP
@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Get()
  findAll(
    @Req() req: { user: { userId: string; role: UserRole } },
  ) {
    return this.bookingService.findAllForUser(req.user.userId, req.user.role);
  }

  // PÚBLICO — qualquer cliente pode verificar disponibilidade antes de reservar.
  // Não expõe dados privados (sem guestName, bookedRanges, etc.) — apenas
  // { available, physicalRooms, occupied, nextAvailableDate }.
  // Rate limit: 120 req/min por IP para suportar bursts legítimos do calendário
  // sem abrir demasiado para scraping.
  @Get('availability')
  @Public()
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  getAvailability(
    @Query('businessId') businessId: string,
    @Query('roomTypeId') roomTypeId: string,
    @Query('startDate')  startDate:  string,
    @Query('endDate')    endDate:    string,
  ) {
    return this.bookingService.getAvailability(businessId, roomTypeId, startDate, endDate);
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
  // Editar datas / tipo de quarto de uma reserva (OWNER only)
  @Patch(':id')
  @Roles(UserRole.OWNER)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  updateBooking(
    @Param('id') id: string,
    @Req() req: { user: { userId: string } },
    @Body() body: { startDate?: string; endDate?: string; roomTypeId?: string },
  ) {
    return this.bookingService.updateByOwner(id, req.user.userId, body);
  }

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
