import { Injectable } from '@nestjs/common';
import { InteractionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SocialService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyStats(userId: string) {
    const [reviews, checkIns, bookmarks, businesses] = await Promise.all([
      this.prisma.review.count({ where: { userId } }),
      this.prisma.userBusinessInteraction.count({
        where: { userId, type: InteractionType.CHECKIN },
      }),
      this.prisma.userBusinessInteraction.count({
        where: { userId, type: InteractionType.BOOKMARK },
      }),
      this.prisma.business.count({ where: { ownerId: userId } }),
    ]);
    return { reviews, checkIns, bookmarks, businesses };
  }

  async getMyReviews(userId: string) {
    return this.prisma.review.findMany({
      where: { userId },
      include: {
        business: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMyCheckIns(userId: string) {
    return this.prisma.userBusinessInteraction.findMany({
      where: { userId, type: InteractionType.CHECKIN },
      include: {
        business: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }
}
