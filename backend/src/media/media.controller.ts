import { Body, Controller, Param, Post, Req } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
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

  @Post('business/:businessId/portfolio/upload')
  @Roles(UserRole.OWNER)
  uploadPortfolioPhoto(
    @Req() req: { user: { userId: string } },
    @Param('businessId') businessId: string,
    @Body() dto: UploadBase64Dto,
  ) {
    return this.mediaService.uploadPortfolioPhoto(req.user.userId, businessId, dto);
  }

  @Post('review/upload')
  @Roles(UserRole.OWNER, UserRole.CLIENT)
  uploadReviewPhoto(
    @Req() req: { user: { userId: string } },
    @Body() dto: UploadBase64Dto,
  ) {
    return this.mediaService.uploadReviewPhoto(req.user.userId, dto);
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

  @Post('signed-url')
  @Roles(UserRole.OWNER, UserRole.STAFF)
  getSignedUploadUrl(
    @Req() req: { user: { userId: string; role: string } },
    @Body() body: {
      businessId: string;
      module: string;
      entityId?: string;
      fileName: string;
    },
  ) {
    return this.mediaService.createSignedUploadUrl(
      req.user.userId,
      req.user.role,
      body,
    );
  }

  @Post('room-type/:roomTypeId/upload')
  @Roles(UserRole.OWNER)
  uploadRoomTypePhoto(
    @Req() req: { user: { userId: string } },
    @Param('roomTypeId') roomTypeId: string,
    @Body() dto: UploadBase64Dto,
  ) {
    return this.mediaService.uploadRoomTypePhoto(req.user.userId, roomTypeId, dto);
  }
}
