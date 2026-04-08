import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { BusinessService } from './business.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessStatusDto } from './dto/update-business-status.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { UpdateBusinessInfoDto } from './dto/update-business-info.dto';
import { CreatePromoDto } from './dto/create-promo.dto';
import { UpdatePromoDto } from './dto/update-promo.dto';
import { CreateFeedPostDto } from './dto/create-feed-post.dto';
import { RedeemLoyaltyDto } from './dto/redeem-loyalty.dto';

@Controller(['business', 'businesses'])
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @Get()
  @Public()
  findAll() {
    return this.businessService.findAll();
  }

  @Get('search')
  @Public()
  search(
    @Query('latitude') latitude: string,
    @Query('longitude') longitude: string,
    @Query('radiusKm') radiusKm?: string,
    @Query('q') q?: string,
    @Query('municipality') municipality?: string,
  ) {
    // Name-based search for ClaimFlow
    if (q) {
      return this.businessService.searchByName(q, municipality);
    }
    return this.businessService.searchNearby({
      latitude,
      longitude,
      radiusKm,
    });
  }

  @Get('home-feed')
  @Public()
  getHybridHomeFeed(
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('latitude') latitude?: string,
    @Query('longitude') longitude?: string,
    @Query('radiusKm') radiusKm?: string,
    @Query('limit') limit?: string,
  ) {
    const resolvedLat = lat ?? latitude;
    const resolvedLng = lng ?? longitude;

    return this.businessService.getHybridHomeFeed({
      latitude: resolvedLat as string,
      longitude: resolvedLng as string,
      radiusKm,
      limit,
    });
  }

  @Get(':id')
  @Public()
  findOne(@Param('id') id: string) {
    return this.businessService.findOne(id);
  }

  @Post()
  @Roles(UserRole.OWNER)
  create(@Req() req: { user: { userId: string } }, @Body() body: CreateBusinessDto) {
    return this.businessService.create(req.user.userId, body);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER)
  update(
    @Param('id') id: string,
    @Req() req: { user: { userId: string } },
    @Body() body: UpdateBusinessDto,
  ) {
    return this.businessService.update(id, req.user.userId, body);
  }

  @Patch(':id/status')
  @Roles(UserRole.OWNER)
  updateStatus(
    @Param('id') id: string,
    @Req() req: { user: { userId: string } },
    @Body() body: UpdateBusinessStatusDto,
  ) {
    return this.businessService.updateStatus(id, req.user.userId, body.isOpen);
  }

  @Patch(':id/info')
  @Roles(UserRole.OWNER)
  updateInfo(
    @Param('id') id: string,
    @Req() req: { user: { userId: string } },
    @Body() body: UpdateBusinessInfoDto,
  ) {
    return this.businessService.updateInfo(id, req.user.userId, body);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PROMOTIONS ENDPOINTS (Secção 11 — Promo Manager)
  // ─────────────────────────────────────────────────────────────────────────

  @Get(':businessId/promos')
  @Public()
  getPromosByBusiness(@Param('businessId') businessId: string) {
    return this.businessService.getPromosByBusiness(businessId);
  }

  @Post(':businessId/promos')
  @Roles(UserRole.OWNER)
  createPromo(
    @Req() req: { user: { userId: string } },
    @Param('businessId') businessId: string,
    @Body() body: CreatePromoDto,
  ) {
    return this.businessService.createPromo(businessId, req.user.userId, body);
  }

  @Patch('promos/:promoId')
  @Roles(UserRole.OWNER)
  updatePromo(
    @Req() req: { user: { userId: string } },
    @Param('promoId') promoId: string,
    @Body() body: UpdatePromoDto,
  ) {
    return this.businessService.updatePromo(promoId, req.user.userId, body);
  }

  @Delete('promos/:promoId')
  @Roles(UserRole.OWNER)
  deletePromo(
    @Req() req: { user: { userId: string } },
    @Param('promoId') promoId: string,
  ) {
    return this.businessService.deletePromo(promoId, req.user.userId);
  }


  // ─── SPRINT A — Interacções sociais ──────────────────────────────────────

  @Get(':id/social-state')
  getSocialState(
    @Param('id') id: string,
    @Req() req: { user: { userId: string } },
  ) {
    return this.businessService.getSocialState(id, req.user.userId);
  }

  @Post(':id/bookmark')
  toggleBookmark(
    @Param('id') id: string,
    @Req() req: { user: { userId: string } },
  ) {
    return this.businessService.toggleBookmark(id, req.user.userId);
  }

  @Post(':id/checkin')
  checkIn(
    @Param('id') id: string,
    @Req() req: { user: { userId: string } },
  ) {
    return this.businessService.checkIn(id, req.user.userId);
  }

  @Get(':id/feed')
  @Public()
  getFeed(
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    return this.businessService.getFeed(id, limit ? Number(limit) : 20);
  }

  @Post(':id/feed')
  @Roles(UserRole.OWNER)
  createFeedPost(
    @Param('id') id: string,
    @Req() req: { user: { userId: string } },
    @Body() body: CreateFeedPostDto,
  ) {
    return this.businessService.createFeedPost(id, req.user.userId, body);
  }

  @Get(':id/loyalty-state')
  getLoyaltyState(
    @Param('id') id: string,
    @Req() req: { user: { userId: string } },
  ) {
    return this.businessService.getLoyaltyState(id, req.user.userId);
  }

  @Post(':id/loyalty/redeem')
  redeemLoyalty(
    @Param('id') id: string,
    @Req() req: { user: { userId: string } },
    @Body() body: RedeemLoyaltyDto,
  ) {
    return this.businessService.redeemLoyalty(id, req.user.userId, body.points, body.rewardCode);
  }

  @Get('recommendations/me')
  getRecommendations(
    @Req() req: { user: { userId: string } },
    @Query('limit') limit?: string,
  ) {
    return this.businessService.getRecommendations(req.user.userId, limit ? Number(limit) : 20);
  }

  // ─── SPRINT B — Follow ────────────────────────────────────────────────────

  @Post(':id/follow')
  toggleFollow(
    @Param('id') id: string,
    @Req() req: { user: { userId: string } },
  ) {
    return this.businessService.toggleFollow(id, req.user.userId);
  }

  // ─── SPRINT B — Reviews ───────────────────────────────────────────────────

  @Get(':id/reviews')
  @Public()
  getReviews(@Param('id') id: string) {
    return this.businessService.getReviews(id);
  }

  @Post(':id/reviews')
  createReview(
    @Param('id') id: string,
    @Req() req: { user: { userId: string } },
    @Body() body: { rating: number; comment: string },
  ) {
    return this.businessService.createReview(id, req.user.userId, body);
  }

  @Post('reviews/:id/helpful')
  toggleReviewHelpful(
    @Param('id') id: string,
    @Req() req: { user: { userId: string } },
  ) {
    return this.businessService.toggleReviewHelpful(id, req.user.userId);
  }

  @Post('reviews/:id/reply')
  @Roles(UserRole.OWNER)
  addOwnerReply(
    @Param('id') id: string,
    @Req() req: { user: { userId: string } },
    @Body() body: { reply: string },
  ) {
    return this.businessService.addOwnerReply(id, req.user.userId, body.reply);
  }

  // ─── SPRINT B/C — Q&A ────────────────────────────────────────────────────

  @Get(':id/questions')
  @Public()
  getQuestions(@Param('id') id: string) {
    return this.businessService.getQuestions(id);
  }

  @Post(':id/questions')
  askQuestion(
    @Param('id') id: string,
    @Req() req: { user: { userId: string } },
    @Body() body: { question: string },
  ) {
    return this.businessService.askQuestion(id, req.user.userId, body.question);
  }

  @Post('questions/:id/answer')
  @Roles(UserRole.OWNER)
  answerQuestion(
    @Param('id') id: string,
    @Req() req: { user: { userId: string } },
    @Body() body: { answer: string },
  ) {
    return this.businessService.answerQuestion(id, req.user.userId, body.answer);
  }

  @Post('questions/:id/helpful')
  toggleQuestionHelpful(
    @Param('id') id: string,
    @Req() req: { user: { userId: string } },
  ) {
    return this.businessService.toggleQuestionHelpful(id, req.user.userId);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER)
  remove(@Param('id') id: string, @Req() req: { user: { userId: string } }) {
    return this.businessService.remove(id, req.user.userId);
  }
}