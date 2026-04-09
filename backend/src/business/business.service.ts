import { BadRequestException, NotFoundException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma, InteractionType } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';

@Injectable()
export class BusinessService {
  constructor(private readonly prisma: PrismaService) {}

  private clamp01(value: number): number {
    if (!Number.isFinite(value)) return 0;
    if (value <= 0) return 0;
    if (value >= 1) return 1;
    return value;
  }

  private parseNumber(value: unknown, fallback = 0): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  private parseBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const v = value.trim().toLowerCase();
      return v === 'true' || v === '1' || v === 'yes';
    }
    if (typeof value === 'number') return value === 1;
    return false;
  }

  private categoryMatchesNow(category: string, now: Date): boolean {
    const hour = now.getHours();
    const cat = (category || '').toLowerCase();

    const isCafe = /(cafe|caf[ée]|padaria|pastelaria|breakfast)/.test(cat);
    if (isCafe && hour >= 7 && hour < 10) return true;

    const isRestaurant = /(restaurante|restaurant|comida|food|pizza|churrasc)/.test(cat);
    if (isRestaurant && hour >= 19 && hour < 22) return true;

    const isBarNight = /(bar|pub|lounge|discoteca|night)/.test(cat);
    if (isBarNight && hour >= 21 && hour <= 23) return true;

    const isBeauty = /(beleza|beauty|barbearia|barber|spa|wellness|sal[aã]o)/.test(cat);
    if (isBeauty && hour >= 10 && hour < 18) return true;

    const isHealth = /(sa[úu]de|health|clinic|cl[ií]nica|farm[áa]cia|pharmacy)/.test(cat);
    if (isHealth && hour >= 8 && hour < 17) return true;

    return false;
  }

  private isPromoActive(meta: Record<string, unknown>, now: Date): boolean {
    if (meta.promo || this.parseBoolean(meta.hasPromo)) return true;

    const deals = Array.isArray(meta.deals) ? meta.deals : [];
    if (deals.length > 0) return true;

    const promos = Array.isArray(meta.promos) ? meta.promos : [];
    for (const promo of promos) {
      if (!promo || typeof promo !== 'object') continue;
      const p = promo as Record<string, unknown>;
      const enabled = p.isActive === undefined ? true : this.parseBoolean(p.isActive);
      if (!enabled) continue;

      const start = p.startDate ? new Date(String(p.startDate)) : null;
      const end = p.endDate ? new Date(String(p.endDate)) : null;

      if (start && Number.isNaN(start.getTime())) continue;
      if (end && Number.isNaN(end.getTime())) continue;

      if (start && now < start) continue;
      if (end && now > end) continue;

      return true;
    }

    return false;
  }

  private isSponsored(meta: Record<string, unknown>): boolean {
    return this.parseBoolean(meta.isPatrocinado)
      || this.parseBoolean(meta.isSponsored)
      || this.parseBoolean(meta.sponsored)
      || this.parseBoolean(meta.isPremium);
  }

  private formatDistance(km: number): string {
    if (!Number.isFinite(km)) return '—';
    if (km < 1) return `${Math.round(km * 1000)}m`;
    return `${km.toFixed(1)}km`;
  }

  private pickNext<T extends { id: string }>(
    source: T[],
    used: Set<string>,
    predicate?: (item: T) => boolean,
  ): T | null {
    for (const item of source) {
      if (used.has(item.id)) continue;
      if (predicate && !predicate(item)) continue;
      used.add(item.id);
      return item;
    }
    return null;
  }

  async getHybridHomeFeed(params: {
    latitude: string;
    longitude: string;
    radiusKm?: string;
    limit?: string;
  }) {
    const latitude = Number(params.latitude);
    const longitude = Number(params.longitude);
    const radiusKm = params.radiusKm ? Number(params.radiusKm) : 20;
    const limit = params.limit ? Number(params.limit) : 15;
    const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(30, Math.floor(limit))) : 15;
    const bufferSize = 40;

    if (Number.isNaN(latitude) || Number.isNaN(longitude) || Number.isNaN(radiusKm)) {
      throw new BadRequestException('latitude, longitude e radiusKm devem ser numéricos.');
    }
    if (radiusKm <= 0) {
      throw new BadRequestException('radiusKm deve ser maior que 0.');
    }

    const radiusMeters = radiusKm * 1000;
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const buffer = await this.prisma.$queryRaw<Array<{
      id: string;
      name: string;
      category: string;
      description: string;
      municipality: string | null;
      metadata: Prisma.JsonValue | null;
      latitude: number;
      longitude: number;
      createdAt: Date;
      distance_meters: number;
    }>>(
      Prisma.sql`
        SELECT
          b."id",
          b."name",
          b."category",
          b."description",
          b."municipality",
          b."metadata",
          b."latitude",
          b."longitude",
          b."createdAt",
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
        LIMIT ${bufferSize}
      `,
    );

    if (buffer.length === 0) {
      return {
        items: [],
        meta: {
          latitude,
          longitude,
          radiusKm,
          bufferSize: 0,
          returned: 0,
          strategy: 'HYBRID_DYNAMIC_V1',
        },
      };
    }

    const businessIds = buffer.map((b) => b.id);

    const trendingInteractions = new Map<string, number>();
    const trendingReviews = new Map<string, number>();
    const activeStatusSet = new Set<string>();

    try {
      const interactionRows = await this.prisma.userBusinessInteraction.groupBy({
        by: ['businessId'],
        where: {
          businessId: { in: businessIds },
          createdAt: { gte: sevenDaysAgo },
        },
        _count: { businessId: true },
      });
      for (const row of interactionRows) {
        trendingInteractions.set(row.businessId, row._count.businessId);
      }
    } catch (error) {
      if (!this.isSocialStorageMissing(error)) {
        throw error;
      }
    }

    try {
      const reviewRows = await this.prisma.review.groupBy({
        by: ['businessId'],
        where: {
          businessId: { in: businessIds },
          createdAt: { gte: sevenDaysAgo },
        },
        _count: { businessId: true },
      });
      for (const row of reviewRows) {
        trendingReviews.set(row.businessId, row._count.businessId);
      }
    } catch (error) {
      if (!this.isReviewStorageMissing(error)) {
        throw error;
      }
    }

    try {
      const activeStatusRows = await this.prisma.businessFeedPost.findMany({
        where: {
          businessId: { in: businessIds },
          createdAt: { gte: oneDayAgo },
        },
        select: { businessId: true },
        distinct: ['businessId'],
      });

      for (const row of activeStatusRows) {
        activeStatusSet.add(row.businessId);
      }
    } catch (error) {
      if (!this.isFeedStorageMissing(error)) {
        throw error;
      }
    }

    const maxDistanceKm = Math.max(...buffer.map((b) => Number(b.distance_meters || 0) / 1000), 0.1);
    const maxTrendRaw = Math.max(
      ...buffer.map((b) => (trendingInteractions.get(b.id) ?? 0) + (trendingReviews.get(b.id) ?? 0)),
      1,
    );

    const ranked = buffer.map((business) => {
      const meta = this.asMetadataObject(business.metadata);
      const distanceKm = Number(business.distance_meters || 0) / 1000;
      const recencyDays = (now.getTime() - new Date(business.createdAt).getTime()) / (24 * 60 * 60 * 1000);
      const trendRaw = (trendingInteractions.get(business.id) ?? 0) + (trendingReviews.get(business.id) ?? 0);

      const proximityScore = this.clamp01(1 - (distanceKm / maxDistanceKm));
      const recencyScore = recencyDays <= 7 ? this.clamp01(1 - (recencyDays / 7)) : 0;
      const temporalScore = this.categoryMatchesNow(String(business.category || ''), now) ? 1 : 0;
      const engagementScore = this.clamp01(Math.log1p(trendRaw) / Math.log1p(maxTrendRaw));
      const randomScore = Math.random();

      const weightedScore =
        proximityScore * 40 +
        recencyScore * 20 +
        temporalScore * 20 +
        engagementScore * 10 +
        randomScore * 10;

      const rating = this.parseNumber(meta.rating, 0);
      const isNew = recencyDays <= 7;
      const hasPromo = this.isPromoActive(meta, now);

      return {
        ...business,
        metadata: meta,
        distanceKm,
        distanceText: this.formatDistance(distanceKm),
        rating,
        isSponsored: this.isSponsored(meta),
        hasActiveStatus: activeStatusSet.has(business.id),
        hasPromo,
        isNew,
        scoreBreakdown: {
          proximity: Number(proximityScore.toFixed(4)),
          recency: Number(recencyScore.toFixed(4)),
          temporal: Number(temporalScore.toFixed(4)),
          engagement: Number(engagementScore.toFixed(4)),
          random: Number(randomScore.toFixed(4)),
        },
        rankingScore: Number(weightedScore.toFixed(4)),
      };
    });

    const distanceRank = [...ranked].sort((a, b) => {
      if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
      return b.rankingScore - a.rankingScore;
    });

    const ranking = [...ranked].sort((a, b) => b.rankingScore - a.rankingScore);
    const sponsoredTemporal = ranked.filter((b) => b.isSponsored && b.scoreBreakdown.temporal > 0);
    const sponsoredAny = ranked.filter((b) => b.isSponsored);

    const shuffleLight = <T,>(items: T[]): T[] =>
      items
        .map((item) => ({ item, random: Math.random() }))
        .sort((a, b) => a.random - b.random)
        .map(({ item }) => item);

    const noveltyCandidate = [...ranked]
      .filter((b) => b.distanceKm <= 10)
      .sort((a, b) => {
        const t = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (t !== 0) return t;
        return b.rankingScore - a.rankingScore;
      })[0] ?? null;

    const exploreCandidates = [...ranked]
      .filter((b) => b.rating > 4.5 && b.distanceKm > 5)
      .sort((a, b) => b.rankingScore - a.rankingScore);

    const used = new Set<string>();
    const final: Array<any> = [];

    const pushFrom = (source: any[], count: number, slot: string, predicate?: (item: any) => boolean) => {
      for (let i = 0; i < count; i += 1) {
        const picked = this.pickNext(source, used, predicate);
        if (!picked) break;
        final.push({ ...picked, feedSlot: slot, position: final.length + 1 });
      }
    };

    pushFrom(distanceRank, 4, 'UTILITY_NEARBY');

    const sponsoredPool1 = sponsoredTemporal.length > 0 ? shuffleLight(sponsoredTemporal) : shuffleLight(sponsoredAny);
    pushFrom(sponsoredPool1, 1, 'SPONSORED_1');

    pushFrom(distanceRank, 2, 'UTILITY_NEARBY');

    if (noveltyCandidate && !used.has(noveltyCandidate.id)) {
      used.add(noveltyCandidate.id);
      final.push({ ...noveltyCandidate, feedSlot: 'NOVELTY_10KM', position: final.length + 1 });
    } else {
      pushFrom(ranking, 1, 'NOVELTY_FALLBACK');
    }

    pushFrom(ranking, 4, 'LOCAL_EXPLORATION');

    const firstSponsoredId = final.find((item) => item.feedSlot === 'SPONSORED_1')?.id;
    const sponsoredPool2 = shuffleLight(sponsoredAny);
    pushFrom(
      sponsoredPool2,
      1,
      'SPONSORED_2',
      (item) => item.id !== firstSponsoredId,
    );

    pushFrom(exploreCandidates, 2, 'EXPLORE_FAR_HIGH_RATING');

    if (final.length < safeLimit) {
      pushFrom(ranking, safeLimit - final.length, 'FILL_RANKING');
    }

    const items = final
      .slice(0, safeLimit)
      .map((item, index) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        description: item.description,
        municipality: item.municipality,
        latitude: item.latitude,
        longitude: item.longitude,
        createdAt: item.createdAt,
        metadata: item.metadata,
        distanceKm: Number(item.distanceKm.toFixed(3)),
        distanceText: item.distanceText,
        rankingScore: item.rankingScore,
        scoreBreakdown: item.scoreBreakdown,
        feedSlot: item.feedSlot,
        position: index + 1,
        isSponsored: item.isSponsored,
        hasActiveStatus: item.hasActiveStatus,
        isNew: item.isNew,
        hasPromo: item.hasPromo,
      }));

    return {
      items,
      meta: {
        latitude,
        longitude,
        radiusKm,
        bufferSize: buffer.length,
        returned: items.length,
        strategy: 'HYBRID_DYNAMIC_V1',
        weights: {
          proximity: 0.4,
          recency: 0.2,
          temporal: 0.2,
          engagement: 0.1,
          random: 0.1,
        },
      },
    };
  }

  private isStorageMissing(error: unknown, needles: string[] = []): boolean {
    const maybePrismaError = error as {
      code?: string;
      meta?: { message?: string; modelName?: string; table?: string };
      message?: string;
    };

    const code = maybePrismaError?.code;
    if (code === 'P2021' || code === 'P2022') {
      return true;
    }

    if (code === 'P2010') {
      const message = String(maybePrismaError?.meta?.message ?? maybePrismaError?.message ?? '');
      return needles.length === 0 || needles.some(needle => message.includes(needle));
    }

    // Fallback for environments where prisma error class identity differs.
    if (error instanceof PrismaClientKnownRequestError) {
      return false;
    }

    const combined = [
      String(maybePrismaError?.meta?.message ?? ''),
      String(maybePrismaError?.meta?.modelName ?? ''),
      String(maybePrismaError?.meta?.table ?? ''),
      String(maybePrismaError?.message ?? ''),
    ].join(' ');

    if (needles.length > 0 && needles.some(needle => combined.includes(needle))) {
      return true;
    }

    return false;
  }

  private isSocialStorageMissing(error: unknown): boolean {
    return this.isStorageMissing(error, ['InteractionType', 'UserBusinessInteraction']);
  }

  private isFeedStorageMissing(error: unknown): boolean {
    return this.isStorageMissing(error, ['business_feed_posts', 'BusinessFeedPost']);
  }

  private isLoyaltyStorageMissing(error: unknown): boolean {
    return this.isStorageMissing(error, ['loyalty_ledger', 'LoyaltyLedger']);
  }

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
          select: { id: true, name: true },
        },
        htRoomTypes: {
          where: { rooms: { some: {} } },
          select: {
            id: true, name: true, description: true,
            pricePerNight: true, maxGuests: true,
            totalRooms: true, available: true,
            amenities: true, photos: true,
            _count: { select: { rooms: true } },
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
          select: { id: true, name: true },
        },
        htRoomTypes: {
          where: { rooms: { some: {} } },
          select: {
            id: true, name: true, description: true,
            pricePerNight: true, maxGuests: true,
            totalRooms: true, available: true,
            amenities: true, photos: true,
            _count: { select: { rooms: true } },
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

  // ─────────────────────────────────────────────────────────────────────────
  // SPRINT A — Interacções sociais
  // Tabela UserBusinessInteraction — best practice com índices e integridade
  // ─────────────────────────────────────────────────────────────────────────

  async getSocialState(businessId: string, userId: string) {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const [bookmark, follow, checkInToday, checkInCount, followerCount] = await Promise.all([
        this.prisma.userBusinessInteraction.findFirst({
          where: { userId, businessId, type: InteractionType.BOOKMARK },
        }),
        this.prisma.userBusinessInteraction.findFirst({
          where: { userId, businessId, type: InteractionType.FOLLOW },
        }),
        this.prisma.userBusinessInteraction.findFirst({
          where: { userId, businessId, type: InteractionType.CHECKIN, date: today },
        }),
        this.prisma.userBusinessInteraction.count({
          where: { businessId, type: InteractionType.CHECKIN },
        }),
        this.prisma.userBusinessInteraction.count({
          where: { businessId, type: InteractionType.FOLLOW },
        }),
      ]);

      return {
        isBookmarked: !!bookmark,
        isFollowed: !!follow,
        followerCount,
        checkInCount,
        checkedInToday: !!checkInToday,
      };
    } catch (error) {
      if (this.isSocialStorageMissing(error)) {
        return {
          isBookmarked: false,
          isFollowed: false,
          followerCount: 0,
          checkInCount: 0,
          checkedInToday: false,
        };
      }
      throw error;
    }
  }

  async toggleFollow(businessId: string, userId: string) {
    try {
      const existing = await this.prisma.userBusinessInteraction.findFirst({
        where: { userId, businessId, type: InteractionType.FOLLOW },
      });
      if (existing) {
        await this.prisma.userBusinessInteraction.delete({ where: { id: existing.id } });
      } else {
        await this.prisma.userBusinessInteraction.create({
          data: { userId, businessId, type: InteractionType.FOLLOW },
        });
      }
      const followerCount = await this.prisma.userBusinessInteraction.count({
        where: { businessId, type: InteractionType.FOLLOW },
      });
      return { isFollowed: !existing, followerCount };
    } catch (error) {
      if (this.isSocialStorageMissing(error)) {
        return { isFollowed: false, followerCount: 0 };
      }
      throw error;
    }
  }

  async toggleBookmark(businessId: string, userId: string) {
    try {
      const existing = await this.prisma.userBusinessInteraction.findFirst({
        where: { userId, businessId, type: InteractionType.BOOKMARK },
      });
      if (existing) {
        await this.prisma.userBusinessInteraction.delete({ where: { id: existing.id } });
        return { isBookmarked: false };
      }
      await this.prisma.userBusinessInteraction.create({
        data: { userId, businessId, type: InteractionType.BOOKMARK },
      });
      return { isBookmarked: true };
    } catch (error) {
      if (this.isSocialStorageMissing(error)) {
        return { isBookmarked: false };
      }
      throw error;
    }
  }

  async checkIn(businessId: string, userId: string) {
    const today = new Date().toISOString().slice(0, 10);
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { ownerId: true, name: true },
    });
    if (!business) throw new NotFoundException('Negócio não encontrado.');

    try {
      const alreadyToday = await this.prisma.userBusinessInteraction.findFirst({
        where: { userId, businessId, type: InteractionType.CHECKIN, date: today },
      });
      if (alreadyToday) {
        const count = await this.prisma.userBusinessInteraction.count({
          where: { businessId, type: InteractionType.CHECKIN },
        });
        return { checkedIn: false, message: 'Já fizeste check-in hoje neste negócio.', checkInCount: count };
      }

      await this.prisma.userBusinessInteraction.create({
        data: { userId, businessId, type: InteractionType.CHECKIN, date: today },
      });

      await this.prisma.loyaltyLedger.create({
        data: {
          userId,
          businessId,
          pointsDelta: 10,
          reason: 'CHECKIN_DAILY',
          metadata: { date: today } as Prisma.InputJsonValue,
        },
      }).catch((error) => {
        if (!this.isLoyaltyStorageMissing(error)) {
          throw error;
        }
      });

      const checkInCount = await this.prisma.userBusinessInteraction.count({
        where: { businessId, type: InteractionType.CHECKIN },
      });

      if (business.ownerId) {
        await this.prisma.notification.create({
          data: {
            userId: business.ownerId,
            title: '📍 Novo Check-in',
            message: `Um cliente fez check-in em "${business.name}".`,
            data: { type: 'CHECKIN', businessId } as any,
            isRead: false,
          },
        }).catch(() => {});
      }
      return { checkedIn: true, message: 'Check-in feito com sucesso!', checkInCount };
    } catch (error) {
      if (this.isSocialStorageMissing(error)) {
        return {
          checkedIn: false,
          message: 'Check-in indisponível temporariamente. Atualize as migrations do backend.',
          checkInCount: 0,
        };
      }
      throw error;
    }
  }

  async getFeed(businessId: string, limit = 20) {
    const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(50, Math.floor(limit))) : 20;

    try {
      return await this.prisma.businessFeedPost.findMany({
        where: { businessId },
        include: {
          author: {
            select: { id: true, name: true },
          },
        },
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        take: safeLimit,
      });
    } catch (error) {
      if (this.isFeedStorageMissing(error)) {
        return [];
      }
      throw error;
    }
  }

  async createFeedPost(
    businessId: string,
    userId: string,
    payload: { content: string; mediaUrl?: string; isPinned?: boolean },
  ) {
    const content = payload.content?.trim();
    if (!content || content.length < 3) {
      throw new BadRequestException('O conteúdo do post deve ter pelo menos 3 caracteres.');
    }

    const business = await this.prisma.business.findFirst({
      where: { id: businessId, ownerId: userId },
      select: { id: true },
    });

    if (!business) {
      throw new NotFoundException('Negócio não encontrado para este proprietário.');
    }

    try {
      return await this.prisma.businessFeedPost.create({
        data: {
          businessId,
          authorId: userId,
          content,
          mediaUrl: payload.mediaUrl,
          isPinned: !!payload.isPinned,
        },
      });
    } catch (error) {
      if (this.isFeedStorageMissing(error)) {
        throw new BadRequestException('Feed indisponível temporariamente. Aplique as migrations da Fase 6.');
      }
      throw error;
    }
  }

  async getLoyaltyState(businessId: string, userId: string) {
    try {
      const [aggregate, lastTransactions] = await Promise.all([
        this.prisma.loyaltyLedger.aggregate({
          where: { userId, businessId },
          _sum: { pointsDelta: true },
          _count: { id: true },
        }),
        this.prisma.loyaltyLedger.findMany({
          where: { userId, businessId },
          orderBy: { createdAt: 'desc' },
          take: 6,
        }),
      ]);

      const points = aggregate._sum.pointsDelta ?? 0;
      const tier = points >= 500 ? 'platinum' : points >= 250 ? 'gold' : points >= 100 ? 'silver' : 'bronze';

      return {
        points,
        tier,
        totalTransactions: aggregate._count.id,
        lastTransactions,
      };
    } catch (error) {
      if (this.isLoyaltyStorageMissing(error)) {
        return {
          points: 0,
          tier: 'bronze',
          totalTransactions: 0,
          lastTransactions: [],
        };
      }
      throw error;
    }
  }

  async redeemLoyalty(businessId: string, userId: string, points: number, rewardCode?: string) {
    if (!Number.isFinite(points) || points <= 0) {
      throw new BadRequestException('points deve ser um número maior que zero.');
    }

    const state = await this.getLoyaltyState(businessId, userId);
    if (state.points < points) {
      throw new BadRequestException('Pontos insuficientes para resgate.');
    }

    try {
      await this.prisma.loyaltyLedger.create({
        data: {
          userId,
          businessId,
          pointsDelta: -Math.floor(points),
          reason: 'REDEEM',
          metadata: {
            rewardCode: rewardCode || null,
          } as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      if (this.isLoyaltyStorageMissing(error)) {
        throw new BadRequestException('Fidelização indisponível temporariamente. Aplique as migrations da Fase 6.');
      }
      throw error;
    }

    const updated = await this.getLoyaltyState(businessId, userId);
    return {
      redeemed: Math.floor(points),
      rewardCode: rewardCode || null,
      currentPoints: updated.points,
      tier: updated.tier,
    };
  }

  async getRecommendations(userId: string, limit = 20) {
    const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(30, Math.floor(limit))) : 20;

    const businesses = await this.prisma.business.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        category: true,
        municipality: true,
        metadata: true,
      },
      take: 200,
    });

    if (businesses.length === 0) {
      return [];
    }

    let interactionsByBusiness = new Map<string, { bookmarked: boolean; checkedIn: boolean }>();
    let popularityByBusiness = new Map<string, number>();
    let preferredCategories = new Map<string, number>();

    try {
      const [myInteractions, allCheckins] = await Promise.all([
        this.prisma.userBusinessInteraction.findMany({
          where: { userId },
          select: { businessId: true, type: true },
        }),
        this.prisma.userBusinessInteraction.groupBy({
          by: ['businessId'],
          where: { type: InteractionType.CHECKIN },
          _count: { businessId: true },
        }),
      ]);

      for (const item of allCheckins) {
        popularityByBusiness.set(item.businessId, item._count.businessId);
      }

      for (const interaction of myInteractions) {
        const current = interactionsByBusiness.get(interaction.businessId) || { bookmarked: false, checkedIn: false };
        if (interaction.type === InteractionType.BOOKMARK) current.bookmarked = true;
        if (interaction.type === InteractionType.CHECKIN) current.checkedIn = true;
        interactionsByBusiness.set(interaction.businessId, current);

        const category = businesses.find(b => b.id === interaction.businessId)?.category;
        if (category) {
          preferredCategories.set(category, (preferredCategories.get(category) ?? 0) + 1);
        }
      }
    } catch (error) {
      if (!this.isSocialStorageMissing(error)) {
        throw error;
      }
    }

    const topCategory = [...preferredCategories.entries()]
      .sort((a, b) => b[1] - a[1])[0]?.[0];

    const ranked = businesses.map((business) => {
      const interaction = interactionsByBusiness.get(business.id) || { bookmarked: false, checkedIn: false };
      const rating = Number(this.asMetadataObject(business.metadata).rating ?? 0);
      const checkins = popularityByBusiness.get(business.id) ?? 0;
      const categoryMatch = topCategory && business.category === topCategory;

      const score =
        (categoryMatch ? 8 : 0) +
        (interaction.bookmarked ? 7 : 0) +
        (interaction.checkedIn ? 10 : 0) +
        Math.log1p(checkins) * 3 +
        Math.max(0, rating) * 1.8;

      return {
        ...business,
        recommendationScore: Number(score.toFixed(2)),
        reason: categoryMatch
          ? 'Com base nas tuas categorias favoritas'
          : interaction.bookmarked || interaction.checkedIn
            ? 'Com base nas tuas interacções recentes'
            : 'Tendência na tua área',
      };
    });

    return ranked
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, safeLimit);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SPRINT B — Reviews
  // ─────────────────────────────────────────────────────────────────────────

  private isReviewStorageMissing(error: unknown): boolean {
    return this.isStorageMissing(error, ['reviews', 'Review', 'review_helpful', 'ReviewHelpful']);
  }

  private isQAStorageMissing(error: unknown): boolean {
    return this.isStorageMissing(error, ['business_questions', 'BusinessQuestion', 'question_helpful', 'QuestionHelpful']);
  }

  async getReviews(businessId: string) {
    try {
      return await this.prisma.review.findMany({
        where: { businessId },
        include: { user: { select: { id: true, name: true } } },
        orderBy: [{ helpfulCount: 'desc' }, { createdAt: 'desc' }],
      });
    } catch (error) {
      if (this.isReviewStorageMissing(error)) return [];
      throw error;
    }
  }

  async createReview(businessId: string, userId: string, dto: { rating: number; comment: string }) {
    if (!Number.isFinite(dto.rating) || dto.rating < 1 || dto.rating > 5) {
      throw new BadRequestException('rating deve ser entre 1 e 5.');
    }
    if (!dto.comment?.trim() || dto.comment.trim().length < 5) {
      throw new BadRequestException('Comentário muito curto (mínimo 5 caracteres).');
    }

    try {
      const review = await this.prisma.review.upsert({
        where: { userId_businessId: { userId, businessId } },
        update: { rating: dto.rating, comment: dto.comment.trim() },
        create: { businessId, userId, rating: dto.rating, comment: dto.comment.trim() },
        include: { user: { select: { id: true, name: true } } },
      });

      const business = await this.prisma.business.findUnique({
        where: { id: businessId },
        select: { ownerId: true, name: true },
      });
      if (business?.ownerId && business.ownerId !== userId) {
        await this.prisma.notification.create({
          data: {
            userId: business.ownerId,
            title: '⭐ Nova avaliação',
            message: `${review.user.name} avaliou "${business.name}" com ${dto.rating} estrelas.`,
            data: { type: 'REVIEW', businessId, reviewId: review.id } as any,
            isRead: false,
          },
        }).catch(() => {});
      }

      await this.prisma.loyaltyLedger.create({
        data: {
          userId, businessId,
          pointsDelta: 15,
          reason: 'REVIEW_SUBMITTED',
          metadata: { reviewId: review.id } as Prisma.InputJsonValue,
        },
      }).catch((e) => { if (!this.isLoyaltyStorageMissing(e)) throw e; });

      return review;
    } catch (error) {
      if (this.isReviewStorageMissing(error)) {
        throw new BadRequestException('Reviews indisponíveis. Execute a migração da base de dados.');
      }
      throw error;
    }
  }

  async toggleReviewHelpful(reviewId: string, userId: string) {
    try {
      const existing = await this.prisma.reviewHelpful.findUnique({
        where: { reviewId_userId: { reviewId, userId } },
      });
      if (existing) {
        await this.prisma.reviewHelpful.delete({ where: { id: existing.id } });
      } else {
        await this.prisma.reviewHelpful.create({ data: { reviewId, userId } });
      }
      const helpfulCount = await this.prisma.reviewHelpful.count({ where: { reviewId } });
      await this.prisma.review.update({ where: { id: reviewId }, data: { helpfulCount } });
      return { isHelpful: !existing, helpfulCount };
    } catch (error) {
      if (this.isReviewStorageMissing(error)) return { isHelpful: false, helpfulCount: 0 };
      throw error;
    }
  }

  async addOwnerReply(reviewId: string, ownerId: string, reply: string) {
    if (!reply?.trim()) throw new BadRequestException('Resposta não pode estar vazia.');

    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      select: { businessId: true },
    });
    if (!review) throw new NotFoundException('Avaliação não encontrada.');

    const business = await this.prisma.business.findUnique({
      where: { id: review.businessId },
      select: { ownerId: true },
    });
    if (!business || business.ownerId !== ownerId) {
      throw new BadRequestException('Apenas o proprietário pode responder.');
    }

    return this.prisma.review.update({
      where: { id: reviewId },
      data: { ownerReply: reply.trim(), ownerReplyDate: new Date() },
      include: { user: { select: { id: true, name: true } } },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SPRINT B/C — Q&A
  // ─────────────────────────────────────────────────────────────────────────

  async getQuestions(businessId: string) {
    try {
      return await this.prisma.businessQuestion.findMany({
        where: { businessId },
        include: { user: { select: { id: true, name: true } } },
        orderBy: [{ helpfulCount: 'desc' }, { createdAt: 'desc' }],
      });
    } catch (error) {
      if (this.isQAStorageMissing(error)) return [];
      throw error;
    }
  }

  async askQuestion(businessId: string, userId: string, question: string) {
    if (!question?.trim() || question.trim().length < 5) {
      throw new BadRequestException('Pergunta muito curta (mínimo 5 caracteres).');
    }
    try {
      const biz = await this.prisma.business.findUnique({ where: { id: businessId }, select: { id: true } });
      if (!biz) throw new NotFoundException('Negócio não encontrado.');
      return await this.prisma.businessQuestion.create({
        data: { businessId, userId, question: question.trim() },
        include: { user: { select: { id: true, name: true } } },
      });
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
      if (this.isQAStorageMissing(error)) throw new BadRequestException('Q&A indisponíveis temporariamente.');
      throw error;
    }
  }

  async answerQuestion(questionId: string, ownerId: string, answer: string) {
    if (!answer?.trim()) throw new BadRequestException('Resposta não pode estar vazia.');

    const q = await this.prisma.businessQuestion.findUnique({
      where: { id: questionId },
      select: { businessId: true },
    });
    if (!q) throw new NotFoundException('Pergunta não encontrada.');

    const business = await this.prisma.business.findUnique({
      where: { id: q.businessId },
      select: { ownerId: true },
    });
    if (!business || business.ownerId !== ownerId) {
      throw new BadRequestException('Apenas o proprietário pode responder.');
    }

    return this.prisma.businessQuestion.update({
      where: { id: questionId },
      data: { answer: answer.trim(), answeredAt: new Date() },
      include: { user: { select: { id: true, name: true } } },
    });
  }

  async toggleQuestionHelpful(questionId: string, userId: string) {
    try {
      const existing = await this.prisma.questionHelpful.findUnique({
        where: { questionId_userId: { questionId, userId } },
      });
      if (existing) {
        await this.prisma.questionHelpful.delete({ where: { id: existing.id } });
      } else {
        await this.prisma.questionHelpful.create({ data: { questionId, userId } });
      }
      const helpfulCount = await this.prisma.questionHelpful.count({ where: { questionId } });
      await this.prisma.businessQuestion.update({ where: { id: questionId }, data: { helpfulCount } });
      return { isHelpful: !existing, helpfulCount };
    } catch (error) {
      if (this.isQAStorageMissing(error)) return { isHelpful: false, helpfulCount: 0 };
      throw error;
    }
  }
}