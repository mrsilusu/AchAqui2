import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Controller('admin')
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly configService: ConfigService,
  ) {}

  // ─── Stats ─────────────────────────────────────────────────────────────────

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  @Get('analytics')
  getAnalytics(@Query('days') days?: string) {
    return this.adminService.getAdvancedAnalytics(days ? parseInt(days, 10) : 30);
  }

  @Get('activity')
  getActivity(@Query('limit') limit?: string) {
    return this.adminService.getRecentActivity(limit ? parseInt(limit, 10) : 20);
  }

  @Get('audit-logs')
  getAuditLogs(
    @Query('limit') limit?: string,
    @Query('module') module?: string,
    @Query('actorId') actorId?: string,
  ) {
    return this.adminService.getAuditLogs({
      limit: limit ? parseInt(limit, 10) : 40,
      module,
      actorId,
    });
  }

  @Get('content/moderation')
  getContentModeration(@Query('type') type?: 'all' | 'reviews' | 'questions') {
    return this.adminService.getContentModeration(type ?? 'all');
  }

  @Delete('content/reviews/:id')
  deleteReview(@Param('id') id: string) {
    return this.adminService.removeReview(id);
  }

  @Delete('content/questions/:id')
  deleteQuestion(@Param('id') id: string) {
    return this.adminService.removeQuestion(id);
  }

  // ─── Claims ────────────────────────────────────────────────────────────────

  @Get('claims')
  getAllClaims(@Query('status') status?: string) {
    return this.adminService.getAllClaims(status);
  }

  @Get('claims/pending')
  getPendingClaims() {
    return this.adminService.getPendingClaims();
  }

  @Patch('claims/:id/review')
  reviewClaim(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: { decision: 'APPROVED' | 'REJECTED'; adminNote?: string },
  ) {
    return this.adminService.reviewClaim(id, req.user?.userId ?? req.user?.sub, body.decision, body.adminNote);
  }

  @Patch('claims/:id/note')
  updateClaimNote(
    @Param('id') id: string,
    @Body() body: { adminNote?: string | null },
  ) {
    return this.adminService.updateClaimNote(id, body.adminNote ?? null);
  }

  // ─── Businesses ────────────────────────────────────────────────────────────

  @Get('businesses')
  getAllBusinesses(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getAllBusinesses(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      search,
    );
  }

  @Get('businesses/:id/claims')
  getBusinessClaimHistory(@Param('id') id: string) {
    return this.adminService.getBusinessClaimHistory(id);
  }

  @Patch('businesses/:id')
  updateBusinessData(
    @Param('id') id: string,
    @Body() body: { name?: string; category?: string; description?: string; isActive?: boolean },
  ) {
    return this.adminService.updateBusinessData(id, body);
  }

  @Patch('businesses/:id/metadata')
  updateBusinessMetadata(
    @Param('id') id: string,
    @Body() body: { metadata: Record<string, unknown> },
  ) {
    return this.adminService.updateBusinessMetadata(id, body.metadata);
  }

  @Patch('businesses/:id/toggle-active')
  toggleBusinessActive(@Param('id') id: string) {
    return this.adminService.toggleBusinessActive(id);
  }

  @Patch('businesses/:id/toggle-premium')
  toggleBusinessPremium(@Param('id') id: string) {
    return this.adminService.toggleBusinessPremium(id);
  }

  @Patch('businesses/:id/unclaim')
  unclaimBusiness(@Param('id') id: string) {
    return this.adminService.unclaimBusiness(id);
  }

  @Delete('businesses/:id')
  deleteBusiness(@Param('id') id: string) {
    return this.adminService.deleteBusiness(id);
  }

  @Post('businesses/:id/impersonate-owner')
  impersonateBusinessOwner(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body?: { durationMinutes?: number },
  ) {
    return this.adminService.impersonateBusinessOwner(
      req.user?.userId ?? req.user?.sub,
      id,
      body?.durationMinutes,
    );
  }

  // ─── Imports ───────────────────────────────────────────────────────────────

  @Post('import/google-places')
  importFromGooglePlaces(@Body() body: { query: string; location: string }) {
    const apiKey = this.configService.get<string>('GOOGLE_PLACES_API_KEY');
    return this.adminService.importFromGooglePlaces(body.query, body.location, apiKey);
  }

  @Post('import/outscraper')
  importFromOutscraper(
    @Body() body: { query: string; limit?: number; coordinates?: string; language?: string; region?: string },
  ) {
    const apiKey = this.configService.get<string>('OUTSCRAPER_API_KEY');
    if (!apiKey) throw new Error('OUTSCRAPER_API_KEY não configurada no .env do backend.');
    return this.adminService.importFromOutscraper(
      body.query,
      body.limit ?? 100,
      apiKey,
      body.coordinates,
      body.language ?? 'pt',
      body.region   ?? 'ao',
    );
  }

  // ─── Users ─────────────────────────────────────────────────────────────────

  @Get('users')
  getAllUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('suspended') suspended?: string,
    @Query('hasBusinesses') hasBusinesses?: string,
  ) {
    return this.adminService.getAllUsers(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      search,
      role,
      suspended,
      hasBusinesses,
    );
  }

  @Get('users/:id/businesses')
  getUserBusinesses(@Param('id') id: string) {
    return this.adminService.getUserBusinesses(id);
  }

  @Patch('users/:id/suspend')
  suspendUser(
    @Param('id') id: string,
    @Body() body: { suspended: boolean; reason?: string },
  ) {
    return this.adminService.toggleUserSuspended(id, !!body.suspended, body.reason);
  }

  @Patch('users/:id/role')
  changeUserRole(
    @Param('id') id: string,
    @Body() body: { role: string },
  ) {
    return this.adminService.changeUserRole(id, body.role as any);
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }
}