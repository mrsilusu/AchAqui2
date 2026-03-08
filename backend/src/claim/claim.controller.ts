import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Request,
} from '@nestjs/common';
import { ClaimService } from './claim.service';
import { CreateClaimRequestDto } from './dto/create-claim-request.dto';
import { AdminService } from '../admin/admin.service';

@Controller('claims')
export class ClaimController {
  constructor(
    private readonly claimService: ClaimService,
    private readonly adminService: AdminService,
  ) {}

  /**
   * POST /claims/:businessId
   * Owner submits a claim request for a business
   */
  @Post(':businessId')
  submitClaim(
    @Param('businessId') businessId: string,
    @Request() req: any,
    @Body() dto: CreateClaimRequestDto,
  ) {
    return this.claimService.submitClaim(businessId, req.user.sub, dto);
  }

  /**
   * GET /claims/mine
   * Owner views their own claim requests
   */
  @Get('mine')
  getMyClaims(@Request() req: any) {
    return this.claimService.getMyClaims(req.user.sub);
  }

  /**
   * DELETE /claims/:claimId
   * Owner cancels a pending claim
   */
  @Delete(':claimId')
  cancelClaim(@Param('claimId') claimId: string, @Request() req: any) {
    return this.claimService.cancelClaim(claimId, req.user.sub);
  }

  /**
   * POST /claims/report-missing
   * Owner reports a business that should be on the platform but isn't
   */
  @Post('report-missing')
  reportMissing(
    @Request() req: any,
    @Body() body: { note: string; businessName?: string },
  ) {
    return this.adminService.reportMissingBusiness(req.user.sub, body.note, body.businessName);
  }
}
