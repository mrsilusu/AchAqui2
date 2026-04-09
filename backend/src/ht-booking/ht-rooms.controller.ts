import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppModule, StaffRole, UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { StaffAccess } from '../auth/decorators/staff-access.decorator';
import { HtRoomsService } from './ht-rooms.service';

@UseGuards(ThrottlerGuard)
@Roles(UserRole.OWNER)
@StaffAccess({ module: AppModule.HT, roles: [StaffRole.HT_MANAGER, StaffRole.HT_RECEPTIONIST, StaffRole.HT_HOUSEKEEPER] })
@Controller('ht/rooms')
export class HtRoomsController {
  constructor(private readonly s: HtRoomsService) {}

  @Get()
  getAll(@Query('businessId') bId: string, @Req() req: any) {
     const resolvedId = String(req.user.role) === 'STAFF' ? req.user.businessId : bId;
     return this.s.getAll(resolvedId, req.user.userId, req.user.role ?? 'OWNER', req.user.businessId);
  }

  @Post()
  @StaffAccess({ module: AppModule.HT, roles: [StaffRole.HT_MANAGER] })
  create(@Body() body: any, @Req() req: any) {
    const resolvedId = String(req.user.role) === 'STAFF' ? req.user.businessId : body.businessId;
    return this.s.create(
      req.user.userId,
      { ...body, businessId: resolvedId },
      req.user.role ?? 'OWNER',
      req.user.businessId,
    );
  }

  @Patch(':id')
  @StaffAccess({ module: AppModule.HT, roles: [StaffRole.HT_MANAGER, StaffRole.HT_HOUSEKEEPER] })
  update(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.s.update(id, req.user.userId, body, req.user.role ?? 'OWNER', req.user.businessId);
  }

  @Delete(':id')
  @StaffAccess({ module: AppModule.HT, roles: [StaffRole.HT_MANAGER] })
  remove(@Param('id') id: string, @Req() req: any) {
    return this.s.remove(id, req.user.userId, req.user.role ?? 'OWNER', req.user.businessId);
  }
}
