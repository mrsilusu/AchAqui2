import { Controller, Get, Param, Patch, Query, Req } from '@nestjs/common';
import { Body, Post } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(
    @Req() req: { user: { userId: string } },
    @Query('onlyUnread') onlyUnread?: string,
  ) {
    return this.notificationsService.findAllByUser(
      req.user.userId,
      onlyUnread === 'true',
    );
  }

  @Patch(':id/read')
  markAsRead(
    @Req() req: { user: { userId: string } },
    @Param('id') id: string,
  ) {
    return this.notificationsService.markAsRead(req.user.userId, id);
  }

  @Patch('read-all')
  markAllAsRead(@Req() req: { user: { userId: string } }) {
    return this.notificationsService.markAllAsRead(req.user.userId);
  }

  @Post('device-token')
  registerDeviceToken(
    @Req() req: { user: { userId: string } },
    @Body() body: { token: string; provider?: string; platform?: string; appVersion?: string },
  ) {
    return this.notificationsService.registerDeviceToken(req.user.userId, body);
  }
}
