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
    return this.s.getAll(bId, req.user.userId);
  }

  @Post()
  @StaffAccess({ module: AppModule.HT, roles: [StaffRole.HT_MANAGER] })
  create(@Body() body: any, @Req() req: any) {
    return this.s.create(req.user.userId, body);
  }

  @Patch(':id')
  @StaffAccess({ module: AppModule.HT, roles: [StaffRole.HT_MANAGER, StaffRole.HT_HOUSEKEEPER] })
  update(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.s.update(id, req.user.userId, body);
  }

  @Delete(':id')
  @StaffAccess({ module: AppModule.HT, roles: [StaffRole.HT_MANAGER] })
  remove(@Param('id') id: string, @Req() req: any) {
    return this.s.remove(id, req.user.userId);
  }
}
