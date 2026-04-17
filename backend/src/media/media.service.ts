import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { StaffRole } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs/promises';
import * as nodePath from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { UploadBase64Dto } from './dto/upload-base64.dto';

@Injectable()
export class MediaService {
  private readonly bucket = process.env.SUPABASE_STORAGE_BUCKET ?? 'achaqui-public';
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

    const filePath = `business/${businessId}/${Date.now()}-${dto.fileName}`;
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

    const filePath = `item/${itemId}/${Date.now()}-${dto.fileName}`;
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

    const filePath = `room-type/${roomTypeId}/${Date.now()}-${dto.fileName}`;
    return this.upload(filePath, dto);
  }

  async createRoomPhotoSignedUrl(
    requesterId: string,
    requesterRole: string,
    dto: { roomTypeId: string; businessId: string; fileName: string },
  ) {
    if (!this.supabase) {
      throw new ServiceUnavailableException('Storage não configurado.');
    }

    if (!dto?.roomTypeId || !dto?.businessId || !dto?.fileName) {
      throw new BadRequestException('roomTypeId, businessId e fileName são obrigatórios.');
    }

    const roomType = await this.prisma.htRoomType.findFirst({
      where: { id: dto.roomTypeId, businessId: dto.businessId },
      include: { business: { select: { ownerId: true } } },
    });

    if (!roomType) {
      throw new NotFoundException('Tipo de quarto não encontrado.');
    }

    const isOwner = requesterRole === 'OWNER' && roomType.business.ownerId === requesterId;

    let isManager = false;
    if (requesterRole === 'STAFF') {
      const staffAccess = await this.prisma.coreBusinessStaff.findFirst({
        where: {
          businessId: dto.businessId,
          userId: requesterId,
          revokedAt: null,
          OR: [
            { role: StaffRole.GENERAL_MANAGER },
            { role: StaffRole.HT_MANAGER, OR: [{ module: 'HT' }, { module: null }] },
          ],
        },
        select: { id: true },
      });
      isManager = !!staffAccess;
    }

    if (!isOwner && !isManager) {
      throw new ForbiddenException('Sem permissão.');
    }

    if ((roomType.photos ?? []).length >= 10) {
      throw new BadRequestException('Máximo de 10 fotos por tipo de quarto atingido.');
    }

    const safeFileName = dto.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `rooms/${dto.businessId}/${dto.roomTypeId}/${Date.now()}-${safeFileName}`;

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
      filePath,
      publicUrl: urlData.publicUrl,
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
