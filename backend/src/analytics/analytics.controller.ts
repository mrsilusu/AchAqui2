import { Controller, Get, Query, Req } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('owner/dashboard')
  @Roles(UserRole.OWNER)
  ownerDashboard(@Req() req: { user: { userId: string } }) {
    return this.analyticsService.ownerDashboard(req.user.userId);
  }

  @Get('owner/advanced')
  @Roles(UserRole.OWNER)
  ownerAdvanced(
    @Req() req: { user: { userId: string } },
    @Query('days') days?: string,
  ) {
    return this.analyticsService.ownerAdvanced(req.user.userId, days ? Number(days) : 30);
  }
}
