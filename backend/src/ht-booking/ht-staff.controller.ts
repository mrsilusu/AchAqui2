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

  private resolveBusinessId(req: any, fallback?: string) {
    return String(req.user.role) === 'STAFF'
      ? req.user.businessId
      : fallback;
  }

  @Get()
  list(
    @Query('businessId') businessId: string,
    @Query('includeInactive') includeInactive: string,
    @Req() req: any,
  ) {
    const resolvedBusinessId = this.resolveBusinessId(req, businessId);
    return this.s.getStaff(
      resolvedBusinessId,
      req.user.userId,
      includeInactive !== 'false',
      req.user.role ?? 'OWNER',
      req.user.businessId,
      req.user.staffRole,
    );
  }

  @Post()
  create(@Body() body: any, @Req() req: any) {
    const resolvedBusinessId = this.resolveBusinessId(req, body?.businessId);
    return this.s.createStaff(
      req.user.userId,
      { ...body, businessId: resolvedBusinessId },
      req.user.role ?? 'OWNER',
      req.user.businessId,
      req.user.staffRole,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Query('businessId') businessId: string, @Req() req: any) {
    const resolvedBusinessId = this.resolveBusinessId(req, businessId);
    return this.s.suspendStaff(
      id,
      resolvedBusinessId,
      req.user.userId,
      'Removido pelo owner',
      req.user.role ?? 'OWNER',
      req.user.businessId,
      req.user.staffRole,
    );
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Query('businessId') businessId: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    const resolvedBusinessId = this.resolveBusinessId(req, businessId);
    return this.s.updateStaff(
      id,
      resolvedBusinessId,
      req.user.userId,
      body,
      req.user.role ?? 'OWNER',
      req.user.businessId,
      req.user.staffRole,
    );
  }

  @Patch(':id/suspend')
  suspend(
    @Param('id') id: string,
    @Query('businessId') businessId: string,
    @Body() body: { reason?: string },
    @Req() req: any,
  ) {
    const resolvedBusinessId = this.resolveBusinessId(req, businessId);
    return this.s.suspendStaff(
      id,
      resolvedBusinessId,
      req.user.userId,
      body?.reason || 'Suspenso pelo owner',
      req.user.role ?? 'OWNER',
      req.user.businessId,
      req.user.staffRole,
    );
  }

  @Patch(':id/reactivate')
  reactivate(
    @Param('id') id: string,
    @Query('businessId') businessId: string,
    @Req() req: any,
  ) {
    const resolvedBusinessId = this.resolveBusinessId(req, businessId);
    return this.s.reactivateStaff(
      id,
      resolvedBusinessId,
      req.user.userId,
      req.user.role ?? 'OWNER',
      req.user.businessId,
      req.user.staffRole,
    );
  }

  @Get(':id/activity')
  activity(
    @Param('id') id: string,
    @Query('businessId') businessId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Req() req: any,
  ) {
    const resolvedBusinessId = this.resolveBusinessId(req, businessId);
    return this.s.getStaffActivity(
      id,
      resolvedBusinessId,
      req.user.userId,
      from,
      to,
      req.user.role ?? 'OWNER',
      req.user.businessId,
      req.user.staffRole,
    );
  }

  @Patch('tasks/:taskId/assign')
  assignTask(
    @Param('taskId') taskId: string,
    @Body() body: { staffId: string; businessId: string },
    @Req() req: any,
  ) {
    const resolvedBusinessId = this.resolveBusinessId(req, body?.businessId);
    return this.s.assignTask(
      taskId,
      body.staffId,
      resolvedBusinessId,
      req.user.userId,
      req.user.role ?? 'OWNER',
      req.user.businessId,
      req.user.staffRole,
    );
  }

  @Post(':id/create-account')
  createAccount(
    @Param('id') id: string,
    @Query('businessId') businessId: string,
    @Body() body: { password?: string },
    @Req() req: any,
  ) {
    const resolvedBusinessId = this.resolveBusinessId(req, businessId);
    return this.s.createStaffAccount(
      id,
      resolvedBusinessId,
      req.user.userId,
      body,
      req.user.role ?? 'OWNER',
      req.user.businessId,
      req.user.staffRole,
    );
  }
}
