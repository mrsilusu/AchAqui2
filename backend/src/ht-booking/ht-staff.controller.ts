// backend/src/ht-booking/ht-staff.controller.ts
import {
  Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  HtStaffService,
  CreateHtStaffDto,
  UpdateHtStaffDto,
} from './ht-staff.service';

@UseGuards(ThrottlerGuard)
@Roles(UserRole.OWNER)
@Controller('ht/staff')
export class HtStaffController {
  constructor(private readonly htStaffService: HtStaffService) {}

  // GET /ht/staff?businessId=...&includeInactive=true
  @Get()
  getStaff(
    @Query('businessId')      businessId: string,
    @Query('includeInactive') includeInactive: string,
    @Req()                    req: any,
  ) {
    return includeInactive === 'true'
      ? this.htStaffService.getAllStaff(businessId, req.user.userId)
      : this.htStaffService.getStaff(businessId, req.user.userId);
  }

  // POST /ht/staff
  @Post()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  createStaff(@Body() dto: CreateHtStaffDto, @Req() req: any) {
    return this.htStaffService.createStaff(req.user.userId, dto);
  }

  // PATCH /ht/staff/:id
  @Patch(':id')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  updateStaff(
    @Param('id') id: string,
    @Body()      dto: UpdateHtStaffDto,
    @Req()       req: any,
  ) {
    return this.htStaffService.updateStaff(id, req.user.userId, dto);
  }

  // PATCH /ht/staff/:id/suspend
  @Patch(':id/suspend')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  suspendStaff(@Param('id') id: string, @Req() req: any) {
    return this.htStaffService.suspendStaff(id, req.user.userId);
  }

  // PATCH /ht/staff/:id/reactivate
  @Patch(':id/reactivate')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  reactivateStaff(@Param('id') id: string, @Req() req: any) {
    return this.htStaffService.reactivateStaff(id, req.user.userId);
  }
}
