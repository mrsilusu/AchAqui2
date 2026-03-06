import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
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

  private async upload(filePath: string, dto: UploadBase64Dto) {
    if (!this.supabase) {
      throw new ServiceUnavailableException(
        'Media service não configurado. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.',
      );
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
