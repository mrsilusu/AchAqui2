import { Body, Controller, Get, Ip, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { HtBookingService } from './ht-booking.service';
import { CheckInDto } from './dto/check-in.dto';

@UseGuards(ThrottlerGuard)
@Roles(UserRole.OWNER)
@Controller('ht/bookings')
export class HtBookingController {
  constructor(private readonly htBookingService: HtBookingService) {}

  @Get('arrivals')
  getArrivals(@Query('businessId') businessId: string, @Req() req: any) {
    return this.htBookingService.getTodayArrivals(businessId, req.user.userId);
  }

  @Get('departures')
  getDepartures(@Query('businessId') businessId: string, @Req() req: any) {
    return this.htBookingService.getTodayDepartures(businessId, req.user.userId);
  }

  @Get('guests')
  getCurrentGuests(@Query('businessId') businessId: string, @Req() req: any) {
    return this.htBookingService.getCurrentGuests(businessId, req.user.userId);
  }

  @Patch(':id/checkin')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  checkIn(@Param('id') id: string, @Body() dto: CheckInDto, @Req() req: any, @Ip() ip: string) {
    return this.htBookingService.checkIn(id, req.user.userId, dto, ip);
  }

  @Patch(':id/checkout')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  checkOut(@Param('id') id: string, @Req() req: any, @Ip() ip: string) {
    return this.htBookingService.checkOut(id, req.user.userId, ip);
  }

  @Patch(':id/noshow')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  noShow(@Param('id') id: string, @Req() req: any, @Ip() ip: string) {
    return this.htBookingService.markNoShow(id, req.user.userId, ip);
  }
}
