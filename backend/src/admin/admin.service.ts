import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { BusinessCategory, BusinessSource } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReviewClaimDto, ReviewDecision } from './dto/review-claim.dto';
import { ImportGooglePlacesDto } from './dto/import-google-places.dto';

// Mapa de categorias AcheiAqui → tipo Google Places
const CATEGORY_TO_GOOGLE_TYPE: Record<BusinessCategory, string> = {
  HOSPITALITY: 'lodging',
  DINING:      'restaurant',
  BEAUTY:      'beauty_salon',
  PROFESSIONAL: 'lawyer', // fallback genérico para serviços profissionais
};

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Claim Management ────────────────────────────────────────────────────

  /**
   * Admin lista todos os pedidos de claim pendentes.
   */
  findPendingClaims() {
    return this.prisma.claimRequest.findMany({
      where: { status: 'PENDING' },
      include: {
        business: {
          select: { id: true, name: true, category: true, isClaimed: true, googlePlaceId: true },
        },
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: 'asc' }, // mais antigo primeiro
    });
  }

  /**
   * Admin lista todos os pedidos (qualquer estado) — para histórico.
   */
  findAllClaims(status?: string) {
    return this.prisma.claimRequest.findMany({
      where: status ? { status: status as any } : undefined,
      include: {
        business: {
          select: { id: true, name: true, category: true },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Admin aprova ou rejeita um pedido de claim.
   * Se aprovado:
   *   - ClaimRequest.status = APPROVED
   *   - Business.ownerId = userId do dono
   *   - Business.isClaimed = true
   *   - Business.claimedAt = now()
   *   - Todos os outros pedidos PENDING para o mesmo negócio são rejeitados automaticamente
   * Se rejeitado:
   *   - ClaimRequest.status = REJECTED
   *   - Business não é alterado
   */
  async reviewClaim(claimId: string, adminId: string, dto: ReviewClaimDto) {
    const claim = await this.prisma.claimRequest.findUnique({
      where: { id: claimId },
      include: {
        business: { select: { id: true, name: true, isClaimed: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!claim) {
      throw new NotFoundException('Pedido de claim não encontrado.');
    }

    if (claim.status !== 'PENDING') {
      throw new BadRequestException(
        `Este pedido já foi ${claim.status === 'APPROVED' ? 'aprovado' : 'rejeitado'}.`,
      );
    }

    if (dto.decision === ReviewDecision.APPROVED) {
      // Transacção: aprovar este + rejeitar outros pendentes + actualizar Business
      await this.prisma.$transaction([
        // Aprovar este pedido
        this.prisma.claimRequest.update({
          where: { id: claimId },
          data: {
            status: 'APPROVED',
            adminNote: dto.adminNote ?? null,
            reviewedAt: new Date(),
            reviewedBy: adminId,
          },
        }),
        // Rejeitar automaticamente outros pedidos pendentes para o mesmo negócio
        this.prisma.claimRequest.updateMany({
          where: {
            businessId: claim.businessId,
            id: { not: claimId },
            status: 'PENDING',
          },
          data: {
            status: 'REJECTED',
            adminNote: 'Rejeitado automaticamente — outro pedido foi aprovado.',
            reviewedAt: new Date(),
            reviewedBy: adminId,
          },
        }),
        // Transferir propriedade do negócio
        this.prisma.business.update({
          where: { id: claim.businessId },
          data: {
            ownerId: claim.userId,
            isClaimed: true,
            claimedAt: new Date(),
          },
        }),
        // Notificar o dono aprovado
        this.prisma.notification.create({
          data: {
            userId: claim.userId,
            title: '✅ Claim Aprovado!',
            message: `O teu pedido para gerir "${claim.business.name}" foi aprovado. Já podes aceder ao painel de gestão.`,
            data: { claimId, businessId: claim.businessId, decision: 'APPROVED' },
          },
        }),
      ]);

      this.logger.log(
        `Claim ${claimId} aprovado por admin ${adminId} → negócio ${claim.businessId} transferido para user ${claim.userId}`,
      );
    } else {
      // Rejeitar
      await this.prisma.$transaction([
        this.prisma.claimRequest.update({
          where: { id: claimId },
          data: {
            status: 'REJECTED',
            adminNote: dto.adminNote ?? null,
            reviewedAt: new Date(),
            reviewedBy: adminId,
          },
        }),
        // Notificar o dono sobre a rejeição
        this.prisma.notification.create({
          data: {
            userId: claim.userId,
            title: '❌ Claim Rejeitado',
            message: dto.adminNote
              ? `O teu pedido para "${claim.business.name}" foi rejeitado. Motivo: ${dto.adminNote}`
              : `O teu pedido para "${claim.business.name}" foi rejeitado.`,
            data: { claimId, businessId: claim.businessId, decision: 'REJECTED' },
          },
        }),
      ]);

      this.logger.log(
        `Claim ${claimId} rejeitado por admin ${adminId}`,
      );
    }

    return this.prisma.claimRequest.findUnique({
      where: { id: claimId },
      include: {
        business: { select: { id: true, name: true, isClaimed: true, ownerId: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }

  // ─── Google Places Import ────────────────────────────────────────────────

  /**
   * Admin importa negócios do Google Places API para popular o app.
   * Negócios já existentes (mesmo googlePlaceId) são ignorados (upsert).
   *
   * NOTA: Requer GOOGLE_PLACES_API_KEY no .env
   */
  async importFromGooglePlaces(dto: ImportGooglePlacesDto) {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;

    if (!apiKey) {
      throw new BadRequestException(
        'GOOGLE_PLACES_API_KEY não configurada. Adiciona ao .env do backend.',
      );
    }

    const googleType = CATEGORY_TO_GOOGLE_TYPE[dto.category];
    const radius = dto.radiusMeters ?? 5000;
    const limit = dto.limit ?? 20;

    // Passo 1: Geocodificar a cidade para obter coordenadas
    const geocodeUrl =
      `https://maps.googleapis.com/maps/api/geocode/json` +
      `?address=${encodeURIComponent(dto.city)}&key=${apiKey}`;

    const geocodeRes = await fetch(geocodeUrl);
    const geocodeData = (await geocodeRes.json()) as any;

    if (geocodeData.status !== 'OK' || !geocodeData.results?.[0]) {
      throw new BadRequestException(
        `Não foi possível geocodificar a cidade "${dto.city}". Verifica o nome e a API key.`,
      );
    }

    const { lat, lng } = geocodeData.results[0].geometry.location;

    // Passo 2: Nearby Search
    const placesUrl =
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
      `?location=${lat},${lng}` +
      `&radius=${radius}` +
      `&type=${googleType}` +
      `&key=${apiKey}`;

    const placesRes = await fetch(placesUrl);
    const placesData = (await placesRes.json()) as any;

    if (placesData.status !== 'OK' && placesData.status !== 'ZERO_RESULTS') {
      this.logger.error(`Google Places API error: ${placesData.status}`, placesData.error_message);
      throw new BadRequestException(
        `Google Places API retornou: ${placesData.status}. ${placesData.error_message ?? ''}`,
      );
    }

    const results = (placesData.results ?? []).slice(0, limit);

    if (results.length === 0) {
      return { imported: 0, skipped: 0, total: 0, message: 'Nenhum negócio encontrado para esta pesquisa.' };
    }

    // Passo 3: Upsert no Prisma — ignorar duplicados via googlePlaceId
    let imported = 0;
    let skipped = 0;

    for (const place of results) {
      const googlePlaceId: string = place.place_id;
      const placeLat: number = place.geometry?.location?.lat ?? lat;
      const placeLng: number = place.geometry?.location?.lng ?? lng;

      // Verificar se já existe
      const existing = await this.prisma.business.findUnique({
        where: { googlePlaceId },
        select: { id: true },
      });

      if (existing) {
        skipped++;
        continue;
      }

      // Criar negócio "órfão" (sem dono) com dados do Google
      await this.prisma.business.create({
        data: {
          name:         place.name ?? 'Sem nome',
          category:     dto.category,
          description:  place.vicinity ?? place.formatted_address ?? '',
          latitude:     placeLat,
          longitude:    placeLng,
          googlePlaceId,
          source:       BusinessSource.GOOGLE,
          isClaimed:    false,
          ownerId:      null, // sem dono até ser reclamado
          metadata: {
            googleRating:      place.rating ?? null,
            googleUserRatings: place.user_ratings_total ?? 0,
            googlePhotoRef:    place.photos?.[0]?.photo_reference ?? null,
            googleTypes:       place.types ?? [],
            vicinity:          place.vicinity ?? '',
          },
        },
      });

      imported++;
    }

    this.logger.log(
      `Import Google Places: ${imported} importados, ${skipped} ignorados (duplicados) de ${results.length} resultados`,
    );

    return {
      imported,
      skipped,
      total: results.length,
      message: `${imported} negócios importados com sucesso. ${skipped} já existiam.`,
    };
  }

  /**
   * Admin vê estatísticas gerais do SaaS.
   */
  async getStats() {
    const [
      totalUsers,
      totalBusinesses,
      claimedBusinesses,
      unclaimedBusinesses,
      googleBusinesses,
      manualBusinesses,
      pendingClaims,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.business.count(),
      this.prisma.business.count({ where: { isClaimed: true } }),
      this.prisma.business.count({ where: { isClaimed: false } }),
      this.prisma.business.count({ where: { source: BusinessSource.GOOGLE } }),
      this.prisma.business.count({ where: { source: BusinessSource.MANUAL } }),
      this.prisma.claimRequest.count({ where: { status: 'PENDING' } }),
    ]);

    return {
      users: { total: totalUsers },
      businesses: {
        total: totalBusinesses,
        claimed: claimedBusinesses,
        unclaimed: unclaimedBusinesses,
        bySource: { google: googleBusinesses, manual: manualBusinesses },
      },
      claims: { pending: pendingClaims },
    };
  }
}
