import { Body, Controller, Param, Post, Req } from '@nestjs/common';
import { AppModule, StaffRole, UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { StaffAccess } from '../auth/decorators/staff-access.decorator';
import { UploadBase64Dto } from './dto/upload-base64.dto';
import { MediaService } from './media.service';

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('business/:businessId/upload')
  @Roles(UserRole.OWNER)
  uploadBusinessPhoto(
    @Req() req: { user: { userId: string } },
    @Param('businessId') businessId: string,
    @Body() dto: UploadBase64Dto,
  ) {
    return this.mediaService.uploadBusinessPhoto(req.user.userId, businessId, dto);
  }

  @Post('item/:itemId/upload')
  @Roles(UserRole.OWNER)
  uploadItemPhoto(
    @Req() req: { user: { userId: string } },
    @Param('itemId') itemId: string,
    @Body() dto: UploadBase64Dto,
  ) {
    return this.mediaService.uploadItemPhoto(req.user.userId, itemId, dto);
  }

  @Post('room-type/signed-url')
  @Roles(UserRole.OWNER, UserRole.STAFF)
  @StaffAccess({ module: AppModule.HT, roles: [StaffRole.HT_MANAGER] })
  getRoomPhotoSignedUrl(
    @Req() req: { user: { userId: string; role: string } },
    @Body() body: { roomTypeId: string; businessId: string; fileName: string },
  ) {
    return this.mediaService.createRoomPhotoSignedUrl(
      req.user.userId,
      req.user.role,
      body,
    );
  }
}
