import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { ClaimService } from './claim.service';
import { CreateClaimRequestDto } from './dto/create-claim-request.dto';

@Controller('claims')
export class ClaimController {
  constructor(private readonly claimService: ClaimService) {}

  /**
   * POST /claims/:businessId
   * Dono submete pedido de claim para um negócio.
   */
  @Post(':businessId')
  @Roles(UserRole.OWNER)
  submit(
    @Req() req: { user: { userId: string } },
    @Param('businessId') businessId: string,
    @Body() body: CreateClaimRequestDto,
  ) {
    return this.claimService.submitClaim(req.user.userId, businessId, body);
  }

  /**
   * GET /claims/mine
   * Dono vê os seus próprios pedidos.
   */
  @Get('mine')
  @Roles(UserRole.OWNER)
  myRequests(@Req() req: { user: { userId: string } }) {
    return this.claimService.findByUser(req.user.userId);
  }
}
