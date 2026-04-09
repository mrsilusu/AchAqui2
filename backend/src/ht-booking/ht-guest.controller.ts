import {
  Body, Controller, Get, Param, Patch, Post,
  Query, Req, UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppModule, StaffRole, UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { StaffAccess } from '../auth/decorators/staff-access.decorator';
import { HtGuestService } from './ht-guest.service';

@UseGuards(ThrottlerGuard)
@Roles(UserRole.OWNER)
@StaffAccess({ module: AppModule.HT, roles: [StaffRole.HT_MANAGER, StaffRole.HT_RECEPTIONIST] })
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
    const resolvedId = String(req.user.role) === 'STAFF' ? req.user.businessId : businessId;
    return this.s.list(resolvedId, req.user.userId, search, req.user.role ?? 'OWNER', req.user.businessId);
  }

  // GET /ht/guests/:id?businessId=
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Query('businessId') businessId: string,
    @Req() req: any,
  ) {
    const resolvedId = String(req.user.role) === 'STAFF' ? req.user.businessId : businessId;
    return this.s.findOne(id, resolvedId, req.user.userId, req.user.role ?? 'OWNER', req.user.businessId);
  }

  // POST /ht/guests
  @Post()
  create(@Body() body: any, @Req() req: any) {
    const resolvedId = String(req.user.role) === 'STAFF' ? req.user.businessId : body.businessId;
    return this.s.create(resolvedId, req.user.userId, body, req.user.role ?? 'OWNER', req.user.businessId);
  }

  // PATCH /ht/guests/:id?businessId=
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Query('businessId') businessId: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    const resolvedId = String(req.user.role) === 'STAFF' ? req.user.businessId : businessId;
    return this.s.update(id, resolvedId, req.user.userId, body, req.user.role ?? 'OWNER', req.user.businessId);
  }

  // POST /ht/guests/:id/link-booking
  @Post(':id/link-booking')
  linkToBooking(
    @Param('id') guestId: string,
    @Body() body: { bookingId: string; businessId: string },
    @Req() req: any,
  ) {
    const resolvedId = String(req.user.role) === 'STAFF' ? req.user.businessId : body.businessId;
    return this.s.linkToBooking(guestId, body.bookingId, resolvedId, req.user.userId, req.user.role ?? 'OWNER', req.user.businessId);
  }
}
