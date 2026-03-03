import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UserRole } from '@prisma/client';

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
    return this.bookingService.create(req.user.userId, createBookingDto);
  }
}
