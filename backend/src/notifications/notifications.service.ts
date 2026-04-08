import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  private isDeviceTokenStorageMissing(error: unknown): boolean {
    if (!(error instanceof PrismaClientKnownRequestError)) return false;
    return error.code === 'P2021' || error.code === 'P2022';
  }

  findAllByUser(userId: string, onlyUnread?: boolean) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        ...(onlyUnread ? { isRead: false } : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
      select: { id: true },
    });

    if (!notification) {
      throw new NotFoundException('Notificação não encontrada.');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return {
      updatedCount: result.count,
    };
  }

  async registerDeviceToken(
    userId: string,
    payload: { token: string; provider?: string; platform?: string; appVersion?: string },
  ) {
    const token = payload.token?.trim();
    if (!token) {
      throw new NotFoundException('Token de dispositivo inválido.');
    }

    try {
      const registered = await this.prisma.deviceToken.upsert({
        where: {
          userId_token: { userId, token },
        },
        update: {
          provider: payload.provider || 'expo',
          platform: payload.platform || null,
          appVersion: payload.appVersion || null,
          lastSeenAt: new Date(),
        },
        create: {
          userId,
          token,
          provider: payload.provider || 'expo',
          platform: payload.platform || null,
          appVersion: payload.appVersion || null,
          lastSeenAt: new Date(),
        },
      });

      return {
        id: registered.id,
        provider: registered.provider,
        platform: registered.platform,
      };
    } catch (error) {
      if (this.isDeviceTokenStorageMissing(error)) {
        return { skipped: true, reason: 'device_tokens_missing' };
      }
      throw error;
    }
  }

  async pushToUser(userId: string, title: string, body: string, data?: Record<string, unknown>) {
    try {
      const tokens = await this.prisma.deviceToken.findMany({
        where: { userId, provider: 'expo' },
        select: { token: true },
        take: 20,
      });

      if (tokens.length === 0) return { delivered: 0 };

      const messages = tokens.map(({ token }) => ({
        to: token,
        title,
        body,
        data: data || {},
        sound: 'default',
      }));

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      if (!response.ok) {
        return { delivered: 0, status: response.status };
      }

      return { delivered: messages.length };
    } catch (error) {
      if (this.isDeviceTokenStorageMissing(error)) {
        return { delivered: 0, skipped: true };
      }
      return { delivered: 0, error: (error as Error).message };
    }
  }
}
