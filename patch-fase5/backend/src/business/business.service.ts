import { BadRequestException, NotFoundException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';

@Injectable()
export class BusinessService {
  constructor(private readonly prisma: PrismaService) {}

  private asMetadataObject(value: Prisma.JsonValue | null | undefined): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  async searchNearby(params: {
    latitude: string;
    longitude: string;
    radiusKm?: string;
  }) {
    const latitude = Number(params.latitude);
    const longitude = Number(params.longitude);
    const radiusKm = params.radiusKm ? Number(params.radiusKm) : 10;

    if (
      Number.isNaN(latitude) ||
      Number.isNaN(longitude) ||
      Number.isNaN(radiusKm)
    ) {
      throw new BadRequestException('latitude, longitude e radiusKm devem ser numéricos.');
    }

    if (radiusKm <= 0) {
      throw new BadRequestException('radiusKm deve ser maior que 0.');
    }

    const radiusMeters = radiusKm * 1000;

    return this.prisma.$queryRaw<
      Array<{
        id: string;
        name: string;
        category: string;
        description: string;
        latitude: number;
        longitude: number;
        distance_meters: number;
      }>
    >(
      Prisma.sql`
        SELECT
          b."id",
          b."name",
          b."category",
          b."description",
          b."latitude",
          b."longitude",
          ST_DistanceSphere(
            ST_MakePoint(b."longitude", b."latitude"),
            ST_MakePoint(${longitude}, ${latitude})
          ) AS distance_meters
        FROM "Business" b
        WHERE ST_DistanceSphere(
          ST_MakePoint(b."longitude", b."latitude"),
          ST_MakePoint(${longitude}, ${latitude})
        ) <= ${radiusMeters}
        AND b."isActive" = true
        ORDER BY distance_meters ASC
      `,
    );
  }

  findAll() {
    return this.prisma.business.findMany({
      where: { isActive: true },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            // email e role são privados — não expor publicamente
          },
        },
      },
    });
  }

  searchByName(q: string, municipality?: string) {
    return this.prisma.business.findMany({
      where: {
        isActive: true,
        name: { contains: q, mode: 'insensitive' },
        ...(municipality ? { municipality: { contains: municipality, mode: 'insensitive' } } : {}),
      },
      select: {
        id: true,
        name: true,
        category: true,
        description: true,
        municipality: true,
        isClaimed: true,
        source: true,
        metadata: true,
      },
      take: 20,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const business = await this.prisma.business.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            // email e role são privados — não expor publicamente
          },
        },
      },
    });

    if (!business) {
      throw new NotFoundException('Estabelecimento não encontrado.');
    }

    return business;
  }

  create(ownerId: string, createBusinessDto: CreateBusinessDto) {
    const { metadata, ...baseData } = createBusinessDto;

    return this.prisma.business.create({
      data: {
        ...baseData,
        ...(metadata !== undefined
          ? { metadata: metadata as Prisma.InputJsonValue }
          : {}),
        ownerId,
      },
    });
  }

  async update(id: string, ownerId: string, updateBusinessDto: UpdateBusinessDto) {
    const business = await this.prisma.business.findFirst({
      where: {
        id,
        ownerId,
      },
    });

    if (!business) {
      throw new NotFoundException(
        'Estabelecimento não encontrado para este proprietário.',
      );
    }

    const { metadata, ...baseData } = updateBusinessDto;

    return this.prisma.business.update({
      where: { id },
      data: {
        ...baseData,
        ...(metadata !== undefined
          ? { metadata: metadata as Prisma.InputJsonValue }
          : {}),
      },
    });
  }

  async updateStatus(id: string, ownerId: string, isOpen: boolean) {
    const business = await this.prisma.business.findFirst({
      where: {
        id,
        ownerId,
      },
      select: {
        id: true,
        metadata: true,
      },
    });

    if (!business) {
      throw new NotFoundException(
        'Estabelecimento não encontrado para este proprietário.',
      );
    }

    const currentMetadata =
      business.metadata && typeof business.metadata === 'object'
        ? (business.metadata as Record<string, unknown>)
        : {};

    const metadata: Prisma.InputJsonValue = {
      ...currentMetadata,
      isOpen,
      statusText: isOpen ? 'Aberto agora' : 'Fechado',
    };

    return this.prisma.business.update({
      where: { id },
      data: { metadata },
    });
  }

  async updateInfo(id: string, ownerId: string, updateBusinessInfoDto: any) {
    const business = await this.prisma.business.findFirst({
      where: { id, ownerId },
      select: { id: true, metadata: true },
    });

    if (!business) {
      throw new NotFoundException(
        'Estabelecimento não encontrado para este proprietário.',
      );
    }

    const dataToUpdate: any = {};
    if (updateBusinessInfoDto.name) dataToUpdate.name = updateBusinessInfoDto.name;
    if (updateBusinessInfoDto.description) dataToUpdate.description = updateBusinessInfoDto.description;
    if (updateBusinessInfoDto.latitude !== undefined) dataToUpdate.latitude = updateBusinessInfoDto.latitude;
    if (updateBusinessInfoDto.longitude !== undefined) dataToUpdate.longitude = updateBusinessInfoDto.longitude;

    // Store contact info in metadata
    const currentMetadata = this.asMetadataObject(business.metadata);

    if (updateBusinessInfoDto.phone || updateBusinessInfoDto.email || updateBusinessInfoDto.website || updateBusinessInfoDto.address) {
      const metadata: Prisma.InputJsonValue = {
        ...currentMetadata,
        ...(updateBusinessInfoDto.phone && { phone: updateBusinessInfoDto.phone }),
        ...(updateBusinessInfoDto.email && { email: updateBusinessInfoDto.email }),
        ...(updateBusinessInfoDto.website && { website: updateBusinessInfoDto.website }),
        ...(updateBusinessInfoDto.address && { address: updateBusinessInfoDto.address }),
      };
      dataToUpdate.metadata = metadata;
    }

    return this.prisma.business.update({
      where: { id },
      data: dataToUpdate,
    });
  }

  async remove(id: string, ownerId: string) {
    const business = await this.prisma.business.findFirst({
      where: {
        id,
        ownerId,
      },
    });

    if (!business) {
      throw new NotFoundException(
        'Estabelecimento não encontrado para este proprietário.',
      );
    }

    await this.prisma.business.delete({
      where: { id },
    });

    return { message: 'Estabelecimento removido com sucesso.' };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PROMOTIONS METHODS (Secção 11 — Promo Manager)
  // ─────────────────────────────────────────────────────────────────────────

  async getPromosByBusiness(businessId: string) {
    if (!businessId) {
      throw new BadRequestException('businessId é obrigatório.');
    }

    // Store promos in business metadata for simplicity
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { metadata: true },
    });

    if (!business) throw new NotFoundException('Estabelecimento não encontrado.');

    const metadata = business.metadata && typeof business.metadata === 'object'
      ? (business.metadata as Record<string, unknown>)
      : {};

    return (metadata.promos as any[]) || [];
  }

  async createPromo(businessId: string, ownerId: string, createPromoDto: any) {
    const business = await this.prisma.business.findFirst({
      where: { id: businessId, ownerId },
      select: { metadata: true },
    });

    if (!business) {
      throw new NotFoundException('Estabelecimento não encontrado para este proprietário.');
    }

    const metadata = business.metadata && typeof business.metadata === 'object'
      ? (business.metadata as Record<string, unknown>)
      : {};

    const promos = (metadata.promos as any[]) || [];
    const newPromo = {
      // SEGURANÇA: UUID v4 em vez de Date.now() — previne enumeração/timing attacks.
      id: randomUUID(),
      ...createPromoDto,
      createdAt: new Date().toISOString(),
    };

    promos.push(newPromo);

    await this.prisma.business.update({
      where: { id: businessId },
      data: {
        metadata: {
          ...metadata,
          promos,
        },
      },
    });

    return newPromo;
  }

  async updatePromo(promoId: string, ownerId: string, updatePromoDto: any) {
    // SEGURANÇA: Cross-Tenant check — filtramos SEMPRE por ownerId antes de qualquer
    // operação. Um Owner A nunca consegue modificar promoções de Owner B,
    // mesmo que conheça o promoId (IDOR prevenido ao nível da query).
    const businesses = await this.prisma.business.findMany({
      where: { ownerId },
      select: { id: true, metadata: true },
    });

    let targetBusiness: { id: string; metadata: Prisma.JsonValue | null } | null = null;
    let promos: any[] = [];

    for (const biz of businesses) {
      const bizMetadata = this.asMetadataObject(biz.metadata);
      const bizPromos = (bizMetadata.promos as any[]) || [];

      if (bizPromos.find(p => p.id === promoId)) {
        targetBusiness = biz;
        promos = bizPromos;
        break;
      }
    }

    if (!targetBusiness) {
      throw new NotFoundException('Promoção não encontrada para este proprietário.');
    }

    promos = promos.map(p =>
      p.id === promoId ? { ...p, ...updatePromoDto, updatedAt: new Date().toISOString() } : p
    );

    const metadata = this.asMetadataObject(targetBusiness.metadata);

    await this.prisma.business.update({
      where: { id: targetBusiness.id },
      data: {
        metadata: {
          ...metadata,
          promos,
        },
      },
    });

    return promos.find(p => p.id === promoId);
  }

  async deletePromo(promoId: string, ownerId: string) {
    // SEGURANÇA: Cross-Tenant check — mesmo padrão de updatePromo.
    // A query where: { ownerId } garante isolamento entre tenants.
    const businesses = await this.prisma.business.findMany({
      where: { ownerId },
      select: { id: true, metadata: true },
    });

    let targetBusiness: { id: string; metadata: Prisma.JsonValue | null } | null = null;
    let promos: any[] = [];

    for (const biz of businesses) {
      const bizMetadata = this.asMetadataObject(biz.metadata);
      const bizPromos = (bizMetadata.promos as any[]) || [];

      if (bizPromos.find(p => p.id === promoId)) {
        targetBusiness = biz;
        promos = bizPromos;
        break;
      }
    }

    if (!targetBusiness) {
      throw new NotFoundException('Promoção não encontrada para este proprietário.');
    }

    promos = promos.filter(p => p.id !== promoId);

    const metadata = this.asMetadataObject(targetBusiness.metadata);

    await this.prisma.business.update({
      where: { id: targetBusiness.id },
      data: {
        metadata: {
          ...metadata,
          promos,
        },
      },
    });

    return { message: 'Promoção removida com sucesso.' };
  }
}
