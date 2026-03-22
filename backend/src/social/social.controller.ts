import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { SocialService } from './social.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReplyReviewDto } from './dto/reply-review.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { AnswerQuestionDto } from './dto/answer-question.dto';

type AuthReq = { user: { userId: string; role: UserRole } };

@Controller()
export class SocialController {
  constructor(private readonly social: SocialService) {}

  // ─── Follow ──────────────────────────────────────────────────────────────────

  @Post('businesses/:id/follow')
  follow(@Req() req: AuthReq, @Param('id') id: string) {
    return this.social.follow(req.user.userId, id);
  }

  @Delete('businesses/:id/follow')
  unfollow(@Req() req: AuthReq, @Param('id') id: string) {
    return this.social.unfollow(req.user.userId, id);
  }

  @Get('businesses/:id/follow')
  followStatus(@Req() req: AuthReq, @Param('id') id: string) {
    return this.social.getFollowStatus(req.user.userId, id);
  }

  // ─── Check-in ────────────────────────────────────────────────────────────────

  @Post('businesses/:id/checkin')
  checkIn(@Req() req: AuthReq, @Param('id') id: string) {
    return this.social.checkIn(req.user.userId, id);
  }

  // ─── Bookmarks ───────────────────────────────────────────────────────────────

  @Post('businesses/:id/bookmark')
  addBookmark(@Req() req: AuthReq, @Param('id') id: string) {
    return this.social.addBookmark(req.user.userId, id);
  }

  @Delete('businesses/:id/bookmark')
  removeBookmark(@Req() req: AuthReq, @Param('id') id: string) {
    return this.social.removeBookmark(req.user.userId, id);
  }

  @Get('social/bookmarks')
  getBookmarks(@Req() req: AuthReq) {
    return this.social.getBookmarks(req.user.userId);
  }

  // ─── Reviews ─────────────────────────────────────────────────────────────────

  @Public()
  @Get('businesses/:id/reviews')
  getReviews(@Param('id') id: string) {
    return this.social.getReviews(id);
  }

  @Post('businesses/:id/reviews')
  createReview(
    @Req() req: AuthReq,
    @Param('id') id: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.social.createReview(req.user.userId, id, dto);
  }

  @Post('reviews/:id/reply')
  @Roles(UserRole.OWNER)
  replyToReview(
    @Req() req: AuthReq,
    @Param('id') id: string,
    @Body() dto: ReplyReviewDto,
  ) {
    return this.social.replyToReview(req.user.userId, id, dto);
  }

  @Post('reviews/:id/helpful')
  toggleReviewHelpful(@Req() req: AuthReq, @Param('id') id: string) {
    return this.social.toggleReviewHelpful(req.user.userId, id);
  }

  // ─── Q&A ─────────────────────────────────────────────────────────────────────

  @Public()
  @Get('businesses/:id/questions')
  getQuestions(@Param('id') id: string) {
    return this.social.getQuestions(id);
  }

  @Post('businesses/:id/questions')
  createQuestion(
    @Req() req: AuthReq,
    @Param('id') id: string,
    @Body() dto: CreateQuestionDto,
  ) {
    return this.social.createQuestion(req.user.userId, id, dto);
  }

  @Post('questions/:id/answer')
  @Roles(UserRole.OWNER)
  answerQuestion(
    @Req() req: AuthReq,
    @Param('id') id: string,
    @Body() dto: AnswerQuestionDto,
  ) {
    return this.social.answerQuestion(req.user.userId, id, dto);
  }

  @Post('questions/:id/helpful')
  toggleQuestionHelpful(@Req() req: AuthReq, @Param('id') id: string) {
    return this.social.toggleQuestionHelpful(req.user.userId, id);
  }
}
