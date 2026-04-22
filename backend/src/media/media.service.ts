import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { StaffRole } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as nodePath from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { UploadBase64Dto } from './dto/upload-base64.dto';

const VALID_MODULES = [
  'gallery', 'cover', 'documents',
  'ht', 'di', 'bw', 'rt', 'ev', 'he', 'ed', 'ps',
  'staff', 'avatar',
] as const;

type MediaModule = typeof VALID_MODULES[number];

const UPLOAD_FOLDERS = {
  businessCover: (bizId: string) =>
    `businesses/${bizId}/cover`,
  businessGallery: (bizId: string) =>
    `businesses/${bizId}/gallery`,
  module: (bizId: string, mod: string, entityId?: string) =>
    entityId
      ? `businesses/${bizId}/${mod}/${entityId}`
      : `businesses/${bizId}/${mod}`,
  userAvatar: (userId: string) =>
    `users/${userId}/avatar`,
  platform: (section: string) =>
    `platform/${section}`,
};

@Injectable()
export class MediaService {
  private readonly bucket = process.env.SUPABASE_STORAGE_BUCKET ?? 'achaqui-media';
  private readonly supabaseUrl = process.env.SUPABASE_URL ?? '';
  private readonly supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  private readonly supabase = this.supabaseUrl && this.supabaseServiceRoleKey
    ? createClient(this.supabaseUrl, this.supabaseServiceRoleKey)
    : null;

  constructor(private readonly prisma: PrismaService) {}

  async uploadBusinessPhoto(
    ownerId: string,
    businessId: string,
    dto: UploadBase64Dto,
  ) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, ownerId: true },
    });

    if (!business) {
      throw new NotFoundException('Estabelecimento não encontrado.');
    }

    if (business.ownerId !== ownerId) {
      throw new ForbiddenException('Sem permissão para upload neste estabelecimento.');
    }

    const filePath = `${UPLOAD_FOLDERS.businessGallery(businessId)}/${crypto.randomUUID()}.jpg`;
    return this.upload(filePath, dto);
  }

  async uploadPortfolioPhoto(
    ownerId: string,
    businessId: string,
    dto: UploadBase64Dto,
  ) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, ownerId: true },
    });

    if (!business) {
      throw new NotFoundException('Estabelecimento não encontrado.');
    }

    if (business.ownerId !== ownerId) {
      throw new ForbiddenException('Sem permissão para upload neste estabelecimento.');
    }

    const filePath = `businesses/${businessId}/portfolio/${crypto.randomUUID()}.jpg`;
    return this.upload(filePath, dto);
  }

  async uploadReviewPhoto(userId: string, dto: UploadBase64Dto) {
    const filePath = `reviews/${userId}/${crypto.randomUUID()}.jpg`;
    return this.upload(filePath, dto);
  }

  async uploadItemPhoto(ownerId: string, itemId: string, dto: UploadBase64Dto) {
    const item = await this.prisma.item.findUnique({
      where: { id: itemId },
      include: {
        business: {
          select: {
            id: true,
            ownerId: true,
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Item não encontrado.');
    }

    if (item.business.ownerId !== ownerId) {
      throw new ForbiddenException('Sem permissão para upload neste item.');
    }

    const filePath = `${UPLOAD_FOLDERS.module(item.business.id, 'di', itemId)}/${crypto.randomUUID()}.jpg`;
    return this.upload(filePath, dto);
  }

  async uploadRoomTypePhoto(ownerId: string, roomTypeId: string, dto: UploadBase64Dto) {
    const roomType = await this.prisma.htRoomType.findUnique({
      where: { id: roomTypeId },
      include: {
        business: {
          select: {
            id: true,
            ownerId: true,
          },
        },
      },
    });

    if (!roomType) {
      throw new NotFoundException('Tipo de quarto não encontrado.');
    }

    if (roomType.business.ownerId !== ownerId) {
      throw new ForbiddenException('Sem permissão para upload neste tipo de quarto.');
    }

    const filePath = `${UPLOAD_FOLDERS.module(roomType.business.id, 'ht', roomTypeId)}/${crypto.randomUUID()}.jpg`;
    return this.upload(filePath, dto);
  }

  async createSignedUploadUrl(
    requesterId: string,
    requesterRole: string,
    dto: {
      businessId: string;
      module: string;
      entityId?: string;
      fileName: string;
    },
  ): Promise<{ signedUrl: string; publicUrl: string; filePath: string }> {
    if (!VALID_MODULES.includes(dto.module as MediaModule)) {
      throw new BadRequestException(`Módulo inválido: ${dto.module}`);
    }

    const business = await this.prisma.business.findUnique({
      where: { id: dto.businessId },
      select: { id: true, ownerId: true },
    });

    if (!business) {
      throw new NotFoundException('Estabelecimento não encontrado.');
    }

    const isOwner = requesterRole === 'OWNER' && business.ownerId === requesterId;

    let isAllowedStaff = false;
    if (requesterRole === 'STAFF') {
      const staffAccess = await this.prisma.coreBusinessStaff.findFirst({
        where: {
          businessId: dto.businessId,
          userId: requesterId,
          revokedAt: null,
          OR: [
            { role: StaffRole.GENERAL_MANAGER },
            ...(dto.module === 'ht' ? [{ role: StaffRole.HT_MANAGER }] : []),
          ],
        },
        select: { id: true },
      });
      isAllowedStaff = !!staffAccess;
    }

    if (!isOwner && !isAllowedStaff) {
      throw new ForbiddenException('Sem permissão.');
    }

    if (!this.supabase) {
      throw new ServiceUnavailableException('Storage não configurado.');
    }

    const ext = dto.fileName.includes('.')
      ? `.${dto.fileName.split('.').pop()!.toLowerCase()}`
      : '.jpg';

    const folder = UPLOAD_FOLDERS.module(dto.businessId, dto.module, dto.entityId);
    const filePath = `${folder}/${crypto.randomUUID()}${ext}`;

    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .createSignedUploadUrl(filePath);

    if (error || !data) {
      throw new Error('Erro ao gerar signed URL.');
    }

    const { data: urlData } = this.supabase.storage
      .from(this.bucket)
      .getPublicUrl(filePath);

    return {
      signedUrl: data.signedUrl,
      publicUrl: urlData.publicUrl,
      filePath,
    };
  }

  private async uploadToLocalDisk(
    filePath: string,
    dto: UploadBase64Dto,
  ): Promise<{ path: string; publicUrl: string }> {
    const uploadsBase = nodePath.join(process.cwd(), 'uploads');
    const fullPath = nodePath.join(uploadsBase, filePath);
    await fs.mkdir(nodePath.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, Buffer.from(dto.base64, 'base64'));
    const backendUrl = (process.env.BACKEND_URL ?? '').replace(/\/$/, '')
      || `http://localhost:${process.env.PORT ?? 3000}`;
    return { path: filePath, publicUrl: `${backendUrl}/uploads/${filePath}` };
  }

  private async upload(filePath: string, dto: UploadBase64Dto) {
    if (!this.supabase) {
      return this.uploadToLocalDisk(filePath, dto);
    }

    const fileBuffer = Buffer.from(dto.base64, 'base64');

    const { error } = await this.supabase.storage
      .from(this.bucket)
      .upload(filePath, fileBuffer, {
        contentType: dto.mimeType,
        upsert: false,
      });

    if (error) {
      throw new Error(`Erro no upload para Supabase Storage: ${error.message}`);
    }

    const { data } = this.supabase.storage.from(this.bucket).getPublicUrl(filePath);

    return {
      path: filePath,
      publicUrl: data.publicUrl,
    };
  }
}
