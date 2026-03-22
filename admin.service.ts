import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ImportService } from '../import/import.service';
import { ClaimStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly importService: ImportService,
  ) {}

  // ─── Stats ───────────────────────────────────────────────────────────────────

  async getStats() {
    const [
      totalUsers,
      totalBusinesses,
      claimedBusinesses,
      pendingClaims,
      approvedClaims,
      rejectedClaims,
      googleBusinesses,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.business.count(),
      this.prisma.business.count({ where: { isClaimed: true } }),
      this.prisma.claimRequest.count({ where: { status: 'PENDING' } }),
      this.prisma.claimRequest.count({ where: { status: 'APPROVED' } }),
      this.prisma.claimRequest.count({ where: { status: 'REJECTED' } }),
      this.prisma.business.count({ where: { source: 'GOOGLE' } }),
    ]);

    return {
      users: {
        total: totalUsers,
      },
      businesses: {
        total: totalBusinesses,
        claimed: claimedBusinesses,
        unclaimed: totalBusinesses - claimedBusinesses,
        claimedPercent:
          totalBusinesses > 0
            ? Math.round((claimedBusinesses / totalBusinesses) * 100)
            : 0,
        fromGoogle: googleBusinesses,
        manual: totalBusinesses - googleBusinesses,
      },
      claims: {
        pending: pendingClaims,
        approved: approvedClaims,
        rejected: rejectedClaims,
        total: pendingClaims + approvedClaims + rejectedClaims,
      },
    };
  }

  // ─── Claims Management ───────────────────────────────────────────────────────

  async getAllClaims(status?: string) {
    const where: any = {};
    if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status.toUpperCase())) {
      where.status = status.toUpperCase() as ClaimStatus;
    }

    return this.prisma.claimRequest.findMany({
      where,
      include: {
        business: {
          select: { id: true, name: true, category: true, description: true },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPendingClaims() {
    return this.getAllClaims('PENDING');
  }

  async reviewClaim(
    claimId: string,
    adminId: string,
    decision: 'APPROVED' | 'REJECTED',
    adminNote?: string,
  ) {
    const claim = await this.prisma.claimRequest.findUnique({
      where: { id: claimId },
      include: { business: true },
    });

    if (!claim) {
      throw new NotFoundException('Pedido de claim não encontrado.');
    }

    if (claim.status !== ClaimStatus.PENDING) {
      throw new BadRequestException('Este claim já foi revisto.');
    }

    // Update claim
    const updatedClaim = await this.prisma.claimRequest.update({
      where: { id: claimId },
      data: {
        status: decision,
        adminNote: adminNote ?? null,
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
      include: {
        business: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    // If approved → assign business ownership
    if (decision === 'APPROVED') {
      await this.prisma.business.update({
        where: { id: claim.businessId },
        data: {
          ownerId: claim.userId,
          isClaimed: true,
          claimedAt: new Date(),
        },
      });
    }

    return updatedClaim;
  }

  // ─── Business Management ─────────────────────────────────────────────────────

  async getAllBusinesses(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;
    const where: any = search
      ? { name: { contains: search, mode: 'insensitive' } }
      : {};

    const [businesses, total] = await Promise.all([
      this.prisma.business.findMany({
        where,
        skip,
        take: limit,
        include: {
          owner: { select: { id: true, name: true, email: true } },
          _count: { select: { claimRequests: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.business.count({ where }),
    ]);

    return {
      data: businesses,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── Outscraper API Import ────────────────────────────────────────────────────
  async importFromOutscraper(
    query: string,
    limit: number,
    apiKey: string,
    coordinates?: string,
    language = 'pt',
    region   = 'ao',
  ) {
    const params = new URLSearchParams({
      query,
      limit:    String(Math.min(limit, 500)),
      language,
      region,
      ...(coordinates ? { coordinates } : {}),
      fields: [
        'query','name','place_id','google_id','full_address','street','city',
        'borough','postal_code','country','country_code','latitude','longitude',
        'phone','site','email','rating','reviews','photo','logo',
        'working_hours','working_hours_old_format','description','about',
        'business_status','category','subtypes','type','located_in','verified',
      ].join(','),
    });

    const response = await fetch(
      `https://api.outscraper.cloud/google-maps-search?${params}`,
      { headers: { 'X-API-KEY': apiKey } },
    );

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new BadRequestException(`Outscraper API erro ${response.status}: ${body.slice(0, 200)}`);
    }

    const json = await response.json();
    if (json.status !== 'Success' && json.status !== 'Pending') {
      throw new BadRequestException(`Outscraper: status "${json.status}"`);
    }

    const rows: any[] = (json.data ?? []).flat();
    return this.importService.importRows(rows);
  }

  // ─── Google Places Import ─────────────────────────────────────────────────────

  async importFromGooglePlaces(query: string, location: string, apiKey?: string) {
    if (!apiKey) {
      throw new BadRequestException(
        'GOOGLE_PLACES_API_KEY não configurada. Adiciona ao .env do backend.',
      );
    }

    const endpoint = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query + ' ' + location)}&key=${apiKey}`;

    const response = await fetch(endpoint);
    const data = await response.json();

    if (data.status !== 'OK') {
      throw new BadRequestException(`Google Places API: ${data.status}`);
    }

    const imported: any[] = [];
    const skipped: any[] = [];

    for (const place of data.results ?? []) {
      const existing = await this.prisma.business.findUnique({
        where: { googlePlaceId: place.place_id },
      });

      if (existing) {
        skipped.push({ placeId: place.place_id, name: place.name });
        continue;
      }

      const created = await this.prisma.business.create({
        data: {
          name: place.name,
          category: 'other',
          description: place.formatted_address,
          latitude: place.geometry.location.lat,
          longitude: place.geometry.location.lng,
          source: 'GOOGLE',
          googlePlaceId: place.place_id,
          isClaimed: false,
          metadata: {
            address: place.formatted_address,
            rating: place.rating,
            userRatingsTotal: place.user_ratings_total,
            types: place.types,
          },
        },
      });

      imported.push({ id: created.id, name: created.name });
    }

    return {
      imported: imported.length,
      skipped: skipped.length,
      businesses: imported,
    };
  }

  // ─── User Management ─────────────────────────────────────────────────────────

  async getAllUsers(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          _count: { select: { businesses: true, claimRequests: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ]);

    return {
      data: users,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── Report Business (owner requests admin to add it) ────────────────────────

  async reportMissingBusiness(userId: string, note: string, businessName?: string) {
    // Store as a notification for admin — we use the notifications table
    return this.prisma.notification.create({
      data: {
        userId,
        title: '📍 Negócio em falta reportado',
        message: `Um dono reportou um negócio em falta${businessName ? `: "${businessName}"` : ''}. Nota: ${note}`,
        data: { type: 'MISSING_BUSINESS', reportedBy: userId, businessName, note },
        isRead: false,
      },
    });
  }
}
