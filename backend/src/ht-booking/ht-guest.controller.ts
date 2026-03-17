import {
  Body, Controller, Get, Param, Patch, Post,
  Query, Req, UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { HtGuestService } from './ht-guest.service';

@UseGuards(ThrottlerGuard)
@Roles(UserRole.OWNER)
@Controller('ht/guests')
export class HtGuestController {
  constructor(private readonly s: HtGuestService) {}

  // GET /ht/guests?businessId=&search=
  @Get()
  list(
    @Query('businessId') businessId: string,
    @Query('search') search: string,
    @Req() req: any,
  ) {
    return this.s.list(businessId, req.user.userId, search);
  }

  // GET /ht/guests/:id?businessId=
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Query('businessId') businessId: string,
    @Req() req: any,
  ) {
    return this.s.findOne(id, businessId, req.user.userId);
  }

  // POST /ht/guests
  @Post()
  create(@Body() body: any, @Req() req: any) {
    return this.s.create(body.businessId, req.user.userId, body);
  }

  // PATCH /ht/guests/:id?businessId=
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Query('businessId') businessId: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    return this.s.update(id, businessId, req.user.userId, body);
  }

  // POST /ht/guests/:id/link-booking
  @Post(':id/link-booking')
  linkToBooking(
    @Param('id') guestId: string,
    @Body() body: { bookingId: string; businessId: string },
    @Req() req: any,
  ) {
    return this.s.linkToBooking(guestId, body.bookingId, body.businessId, req.user.userId);
  }
}
