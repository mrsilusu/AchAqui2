import { Body, Controller, Post, Req } from '@nestjs/common';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  create(
    @Req() req: { user: { userId: string } },
    @Body() createBookingDto: CreateBookingDto,
  ) {
    return this.bookingService.create(req.user.userId, createBookingDto);
  }
}
