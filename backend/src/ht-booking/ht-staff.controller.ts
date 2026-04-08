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
  list(
    @Query('businessId') businessId: string,
    @Query('includeInactive') includeInactive: string,
    @Req() req: any,
  ) {
    return this.s.getStaff(businessId, req.user.userId, includeInactive !== 'false');
  }

  @Post()
  create(@Body() body: any, @Req() req: any) {
    return this.s.createStaff(req.user.userId, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Query('businessId') businessId: string, @Req() req: any) {
    return this.s.suspendStaff(id, businessId, req.user.userId, 'Removido pelo owner');
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Query('businessId') businessId: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    return this.s.updateStaff(id, businessId, req.user.userId, body);
  }

  @Patch(':id/suspend')
  suspend(
    @Param('id') id: string,
    @Query('businessId') businessId: string,
    @Body() body: { reason?: string },
    @Req() req: any,
  ) {
    return this.s.suspendStaff(id, businessId, req.user.userId, body?.reason || 'Suspenso pelo owner');
  }

  @Patch(':id/reactivate')
  reactivate(
    @Param('id') id: string,
    @Query('businessId') businessId: string,
    @Req() req: any,
  ) {
    return this.s.reactivateStaff(id, businessId, req.user.userId);
  }

  @Get(':id/activity')
  activity(
    @Param('id') id: string,
    @Query('businessId') businessId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Req() req: any,
  ) {
    return this.s.getStaffActivity(id, businessId, req.user.userId, from, to);
  }

  @Patch('tasks/:taskId/assign')
  assignTask(
    @Param('taskId') taskId: string,
    @Body() body: { staffId: string; businessId: string },
    @Req() req: any,
  ) {
    return this.s.assignTask(taskId, body.staffId, body.businessId, req.user.userId);
  }

  @Post(':id/create-account')
  createAccount(
    @Param('id') id: string,
    @Query('businessId') businessId: string,
    @Req() req: any,
  ) {
    return this.s.createStaffAccount(id, businessId, req.user.userId);
  }
}
