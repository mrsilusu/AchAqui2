import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminService } from './admin.service';
import { ReviewClaimDto } from './dto/review-claim.dto';
import { ImportGooglePlacesDto } from './dto/import-google-places.dto';

@Controller('admin')
@Roles(UserRole.ADMIN) // todos os endpoints deste controller exigem role ADMIN
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ─── Stats ───────────────────────────────────────────────────────────────

  /**
   * GET /admin/stats
   * Visão geral do SaaS: utilizadores, negócios, claims.
   */
  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  // ─── Claims ──────────────────────────────────────────────────────────────

  /**
   * GET /admin/claims
   * Lista todos os pedidos de claim. Filtrável por ?status=PENDING|APPROVED|REJECTED
   */
  @Get('claims')
  findAllClaims(@Query('status') status?: string) {
    return this.adminService.findAllClaims(status);
  }

  /**
   * GET /admin/claims/pending
   * Lista apenas os pedidos pendentes (shortcut útil para o painel admin).
   */
  @Get('claims/pending')
  findPendingClaims() {
    return this.adminService.findPendingClaims();
  }

  /**
   * PATCH /admin/claims/:id/review
   * Admin aprova ou rejeita um pedido de claim.
   */
  @Patch('claims/:id/review')
  reviewClaim(
    @Req() req: { user: { userId: string } },
    @Param('id') claimId: string,
    @Body() body: ReviewClaimDto,
  ) {
    return this.adminService.reviewClaim(claimId, req.user.userId, body);
  }

  // ─── Google Places Import ────────────────────────────────────────────────

  /**
   * POST /admin/import/google-places
   * Importa negócios do Google Places API para popular o app.
   * Body: { city: "Luanda", category: "DINING", limit: 20, radiusMeters: 5000 }
   */
  @Post('import/google-places')
  importFromGooglePlaces(@Body() body: ImportGooglePlacesDto) {
    return this.adminService.importFromGooglePlaces(body);
  }
}
