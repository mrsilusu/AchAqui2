import { Controller, Get, Req } from '@nestjs/common';
import { SocialService } from './social.service';

@Controller('social')
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  @Get('me/stats')
  getMyStats(@Req() req: { user: { userId: string } }) {
    return this.socialService.getMyStats(req.user.userId);
  }

  @Get('me/reviews')
  getMyReviews(@Req() req: { user: { userId: string } }) {
    return this.socialService.getMyReviews(req.user.userId);
  }

  @Get('me/checkins')
  getMyCheckIns(@Req() req: { user: { userId: string } }) {
    return this.socialService.getMyCheckIns(req.user.userId);
  }
}
