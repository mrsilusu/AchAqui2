import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { RejectBookingDto } from './dto/reject-booking.dto';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Get()
  findAll(
    @Req() req: { user: { userId: string; role: UserRole } },
  ) {
    return this.bookingService.findAllForUser(req.user.userId, req.user.role);
  }

  @Post()
  create(
    @Req() req: { user: { userId: string } },
    @Body() createBookingDto: CreateBookingDto,
  ) {
    console.log('Recebi um pedido de reserva:', {
      userId: req.user.userId,
      data: createBookingDto,
    });
    return this.bookingService.create(req.user.userId, createBookingDto);
  }

  @Patch(':id/confirm')
  confirm(
    @Param('id') id: string,
    @Req() req: { user: { userId: string } },
    @Body() body: { businessId?: string },
  ) {
    return this.bookingService.confirmByOwner(id, req.user.userId, body?.businessId);
  }

  @Patch(':id/reject')
  reject(
    @Param('id') id: string,
    @Req() req: { user: { userId: string } },
    @Body() body: RejectBookingDto,
  ) {
    return this.bookingService.rejectByOwner(id, req.user.userId, body);
  }
}
