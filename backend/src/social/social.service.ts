import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReplyReviewDto } from './dto/reply-review.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { AnswerQuestionDto } from './dto/answer-question.dto';

@Injectable()
export class SocialService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async assertBusinessExists(businessId: string) {
    const b = await this.prisma.business.findUnique({ where: { id: businessId }, select: { id: true, ownerId: true } });
    if (!b) throw new NotFoundException('Negócio não encontrado.');
    return b;
  }

  // ─── Follow ─────────────────────────────────────────────────────────────────

  async follow(userId: string, businessId: string) {
    await this.assertBusinessExists(businessId);
    try {
      await this.prisma.follow.create({ data: { userId, businessId } });
    } catch {
      // unique constraint → já segue
      throw new ConflictException('Já estás a seguir este negócio.');
    }
    return { following: true };
  }

  async unfollow(userId: string, businessId: string) {
    await this.assertBusinessExists(businessId);
    await this.prisma.follow.deleteMany({ where: { userId, businessId } });
    return { following: false };
  }

  async getFollowStatus(userId: string, businessId: string) {
    const record = await this.prisma.follow.findUnique({
      where: { userId_businessId: { userId, businessId } },
    });
    const count = await this.prisma.follow.count({ where: { businessId } });
    return { following: !!record, count };
  }

  // ─── Check-in ────────────────────────────────────────────────────────────────

  async checkIn(userId: string, businessId: string) {
    await this.assertBusinessExists(businessId);
    const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
    try {
      await this.prisma.checkIn.create({ data: { userId, businessId, date: today } });
    } catch {
      throw new ConflictException('Já fizeste check-in hoje neste negócio.');
    }
    const total = await this.prisma.checkIn.count({ where: { businessId } });
    return { success: true, total };
  }

  // ─── Bookmarks ───────────────────────────────────────────────────────────────

  async addBookmark(userId: string, businessId: string) {
    await this.assertBusinessExists(businessId);
    await this.prisma.bookmark.upsert({
      where: { userId_businessId: { userId, businessId } },
      create: { userId, businessId },
      update: {},
    });
    return { bookmarked: true };
  }

  async removeBookmark(userId: string, businessId: string) {
    await this.prisma.bookmark.deleteMany({ where: { userId, businessId } });
    return { bookmarked: false };
  }

  async getBookmarks(userId: string) {
    const records = await this.prisma.bookmark.findMany({
      where: { userId },
      select: { businessId: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return records.map(r => r.businessId);
  }

  // ─── Reviews ─────────────────────────────────────────────────────────────────

  async getReviews(businessId: string) {
    await this.assertBusinessExists(businessId);
    const reviews = await this.prisma.review.findMany({
      where: { businessId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const total = reviews.length;
    const avg = total > 0
      ? (reviews.reduce((s, r) => s + r.rating, 0) / total)
      : 0;
    return { reviews, total, avg: parseFloat(avg.toFixed(1)) };
  }

  async createReview(userId: string, businessId: string, dto: CreateReviewDto) {
    await this.assertBusinessExists(businessId);
    try {
      const review = await this.prisma.review.create({
        data: {
          userId,
          businessId,
          rating: dto.rating,
          comment: dto.comment,
          photos: dto.photos ?? [],
        },
        include: { user: { select: { id: true, name: true } } },
      });
      return review;
    } catch {
      throw new ConflictException('Já avaliaste este negócio. Edita a tua avaliação existente.');
    }
  }

  async replyToReview(ownerId: string, reviewId: string, dto: ReplyReviewDto) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: { business: { select: { ownerId: true } } },
    });
    if (!review) throw new NotFoundException('Avaliação não encontrada.');
    if (review.business.ownerId !== ownerId) throw new ForbiddenException('Só o dono pode responder.');
    return this.prisma.review.update({
      where: { id: reviewId },
      data: { ownerResponse: dto.response, ownerResponseDate: new Date() },
    });
  }

  async toggleReviewHelpful(userId: string, reviewId: string) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId }, select: { id: true, helpfulCount: true } });
    if (!review) throw new NotFoundException('Avaliação não encontrada.');

    const existing = await this.prisma.reviewHelpful.findUnique({
      where: { userId_reviewId: { userId, reviewId } },
    });

    if (existing) {
      await this.prisma.reviewHelpful.delete({ where: { userId_reviewId: { userId, reviewId } } });
      const updated = await this.prisma.review.update({
        where: { id: reviewId },
        data: { helpfulCount: { decrement: 1 } },
        select: { helpfulCount: true },
      });
      return { helpful: false, count: Math.max(0, updated.helpfulCount) };
    } else {
      await this.prisma.reviewHelpful.create({ data: { userId, reviewId } });
      const updated = await this.prisma.review.update({
        where: { id: reviewId },
        data: { helpfulCount: { increment: 1 } },
        select: { helpfulCount: true },
      });
      return { helpful: true, count: updated.helpfulCount };
    }
  }

  // ─── Q&A ─────────────────────────────────────────────────────────────────────

  async getQuestions(businessId: string) {
    await this.assertBusinessExists(businessId);
    return this.prisma.question.findMany({
      where: { businessId },
      include: {
        user: { select: { id: true, name: true } },
        answer: true,
      },
      orderBy: { helpfulCount: 'desc' },
    });
  }

  async createQuestion(userId: string, businessId: string, dto: CreateQuestionDto) {
    await this.assertBusinessExists(businessId);
    return this.prisma.question.create({
      data: { userId, businessId, content: dto.content },
      include: { user: { select: { id: true, name: true } } },
    });
  }

  async answerQuestion(ownerId: string, questionId: string, dto: AnswerQuestionDto) {
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      include: { business: { select: { ownerId: true } }, answer: true },
    });
    if (!question) throw new NotFoundException('Pergunta não encontrada.');
    if (question.business.ownerId !== ownerId) throw new ForbiddenException('Só o dono pode responder.');
    if (question.answer) {
      return this.prisma.questionAnswer.update({
        where: { questionId },
        data: { content: dto.content },
      });
    }
    return this.prisma.questionAnswer.create({
      data: { questionId, authorId: ownerId, content: dto.content },
    });
  }

  async toggleQuestionHelpful(userId: string, questionId: string) {
    const q = await this.prisma.question.findUnique({ where: { id: questionId }, select: { id: true } });
    if (!q) throw new NotFoundException('Pergunta não encontrada.');

    const existing = await this.prisma.questionHelpful.findUnique({
      where: { userId_questionId: { userId, questionId } },
    });

    if (existing) {
      await this.prisma.questionHelpful.delete({ where: { userId_questionId: { userId, questionId } } });
      const updated = await this.prisma.question.update({
        where: { id: questionId },
        data: { helpfulCount: { decrement: 1 } },
        select: { helpfulCount: true },
      });
      return { helpful: false, count: Math.max(0, updated.helpfulCount) };
    } else {
      await this.prisma.questionHelpful.create({ data: { userId, questionId } });
      const updated = await this.prisma.question.update({
        where: { id: questionId },
        data: { helpfulCount: { increment: 1 } },
        select: { helpfulCount: true },
      });
      return { helpful: true, count: updated.helpfulCount };
    }
  }
}
