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
    return this.adminService.reviewClaim(id, req.user.sub, body.decision, body.adminNote);
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
  ) {
    return this.adminService.getAllUsers(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      search,
    );
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