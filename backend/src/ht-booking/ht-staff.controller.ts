import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { HtStaffService } from './ht-staff.service';

@UseGuards(ThrottlerGuard)
@Roles(UserRole.OWNER)
@Controller('ht/staff')
export class HtStaffController {
  constructor(private readonly s: HtStaffService) {}

  @Get()
  list(@Query('businessId') businessId: string, @Req() req: any) {
    return this.s.list(businessId, req.user.userId);
  }

  @Post()
  add(@Body() body: { businessId: string; userId: string; role: string }, @Req() req: any) {
    return this.s.add(body.businessId, req.user.userId, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Query('businessId') businessId: string, @Req() req: any) {
    return this.s.remove(id, businessId, req.user.userId);
  }

  @Patch('tasks/:taskId/assign')
  assignTask(
    @Param('taskId') taskId: string,
    @Body() body: { userId: string; businessId: string },
    @Req() req: any,
  ) {
    return this.s.assignTask(taskId, body.userId, body.businessId, req.user.userId);
  }
}
