import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ImportService } from '../import/import.service';
import { ClaimStatus, UserRole } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly importService: ImportService,
    private readonly jwtService: JwtService,
  ) {}

  private isSuspensionColumnMissing(error: unknown): boolean {
    if (!(error instanceof PrismaClientKnownRequestError)) return false;
    if (error.code === 'P2022' || error.code === 'P2021') return true;
    if (error.code === 'P2010') {
      const message = String((error.meta as { message?: string } | undefined)?.message ?? '');
      return (
        message.includes('isSuspended') ||
        message.includes('suspendedAt') ||
        message.includes('suspensionReason')
      );
    }
    return false;
  }
  // ─── Stats ───────────────────────────────────────────────────────────────────

  async updateBusinessMetadata(id: string, metadata: Record<string, unknown>) {
    return this.prisma.business.update({
      where: { id },
      data:  { metadata: metadata as any },
      select: { id: true, name: true, category: true, metadata: true },
    });
  }

  async getStats() {
    const now = new Date();
    const periodDays = 7;
    const currentStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const previousStart = new Date(now.getTime() - periodDays * 2 * 24 * 60 * 60 * 1000);
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(now);
    const day = weekStart.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    weekStart.setDate(weekStart.getDate() - diffToMonday);
    weekStart.setHours(0, 0, 0, 0);

    const pctChange = (current: number, previous: number) => {
      if (previous <= 0) return current > 0 ? 100 : 0;
      return Number((((current - previous) / previous) * 100).toFixed(1));
    };

    const [
      totalUsers,
      totalBusinesses,
      claimedBusinesses,
      pendingClaims,
      approvedClaims,
      rejectedClaims,
      googleBusinesses,
      premiumBusinesses,
      newUsersCurrent,
      newUsersPrevious,
      newBusinessesCurrent,
      newBusinessesPrevious,
      newClaimsCurrent,
      newClaimsPrevious,
      usersToday,
      usersWeek,
      recentClaims,
      recentBusinesses,
      recentUsers,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.business.count(),
      this.prisma.business.count({ where: { isClaimed: true } }),
      this.prisma.claimRequest.count({ where: { status: 'PENDING' } }),
      this.prisma.claimRequest.count({ where: { status: 'APPROVED' } }),
      this.prisma.claimRequest.count({ where: { status: 'REJECTED' } }),
      this.prisma.business.count({ where: { source: 'GOOGLE' } }),
      this.prisma.business.count({ where: { metadata: { path: ['isPremium'], equals: true } } }),
      this.prisma.user.count({ where: { createdAt: { gte: currentStart } } }),
      this.prisma.user.count({ where: { createdAt: { gte: previousStart, lt: currentStart } } }),
      this.prisma.business.count({ where: { createdAt: { gte: currentStart } } }),
      this.prisma.business.count({ where: { createdAt: { gte: previousStart, lt: currentStart } } }),
      this.prisma.claimRequest.count({ where: { createdAt: { gte: currentStart } } }),
      this.prisma.claimRequest.count({ where: { createdAt: { gte: previousStart, lt: currentStart } } }),
      this.prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.user.count({ where: { createdAt: { gte: weekStart } } }),
      this.prisma.claimRequest.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: { business: { select: { id: true, name: true } }, user: { select: { id: true, name: true } } },
      }),
      this.prisma.business.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, source: true, createdAt: true },
      }),
      this.prisma.user.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, email: true, createdAt: true },
      }),
    ]);

    const recentActivity = [
      ...recentClaims.map((claim) => ({
        id: claim.id,
        type: 'CLAIM',
        title: `Claim ${claim.status.toLowerCase()}`,
        subtitle: `${claim.business?.name ?? 'Negócio'} · ${claim.user?.name ?? 'Utilizador'}`,
        createdAt: claim.createdAt,
      })),
      ...recentBusinesses.map((biz) => ({
        id: biz.id,
        type: 'BUSINESS_CREATED',
        title: 'Negócio importado/criado',
        subtitle: `${biz.name} · ${biz.source}`,
        createdAt: biz.createdAt,
      })),
      ...recentUsers.map((user) => ({
        id: user.id,
        type: 'USER_CREATED',
        title: 'Novo utilizador',
        subtitle: `${user.name || user.email}`,
        createdAt: user.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 12);

    return {
      generatedAt: now,
      periodDays,
      users: { total: totalUsers },
      businesses: {
        total: totalBusinesses,
        claimed: claimedBusinesses,
        unclaimed: totalBusinesses - claimedBusinesses,
        claimedPercent: totalBusinesses > 0 ? Math.round((claimedBusinesses / totalBusinesses) * 100) : 0,
        fromGoogle: googleBusinesses,
        manual: totalBusinesses - googleBusinesses,
        premium: premiumBusinesses,
      },
      claims: {
        pending: pendingClaims,
        approved: approvedClaims,
        rejected: rejectedClaims,
        total: pendingClaims + approvedClaims + rejectedClaims,
      },
      growth: {
        users: {
          current: newUsersCurrent,
          previous: newUsersPrevious,
          changePct: pctChange(newUsersCurrent, newUsersPrevious),
        },
        businesses: {
          current: newBusinessesCurrent,
          previous: newBusinessesPrevious,
          changePct: pctChange(newBusinessesCurrent, newBusinessesPrevious),
        },
        claims: {
          current: newClaimsCurrent,
          previous: newClaimsPrevious,
          changePct: pctChange(newClaimsCurrent, newClaimsPrevious),
        },
      },
      usersNew: {
        today: usersToday,
        week: usersWeek,
      },
      recentActivity,
    };
  }

  async getAdvancedAnalytics(days = 30) {
    const safeDays = Number.isFinite(days) ? Math.max(7, Math.min(120, Math.floor(days))) : 30;
    const start = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);

    const [users, businesses, claims, claimsByStatus] = await Promise.all([
      this.prisma.user.findMany({ where: { createdAt: { gte: start } }, select: { createdAt: true, role: true } }),
      this.prisma.business.findMany({ where: { createdAt: { gte: start } }, select: { createdAt: true, source: true } }),
      this.prisma.claimRequest.findMany({ where: { createdAt: { gte: start } }, select: { createdAt: true, status: true } }),
      this.prisma.claimRequest.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);

    const makeKey = (d: Date) => d.toISOString().slice(0, 10);
    const byDay = new Map<string, { users: number; businesses: number; claims: number }>();

    for (const row of users) {
      const key = makeKey(row.createdAt);
      const cur = byDay.get(key) || { users: 0, businesses: 0, claims: 0 };
      cur.users += 1;
      byDay.set(key, cur);
    }
    for (const row of businesses) {
      const key = makeKey(row.createdAt);
      const cur = byDay.get(key) || { users: 0, businesses: 0, claims: 0 };
      cur.businesses += 1;
      byDay.set(key, cur);
    }
    for (const row of claims) {
      const key = makeKey(row.createdAt);
      const cur = byDay.get(key) || { users: 0, businesses: 0, claims: 0 };
      cur.claims += 1;
      byDay.set(key, cur);
    }

    const trends = [...byDay.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, values]) => ({ date, ...values }));

    const byRole = Object.values(UserRole).map((role) => ({
      role,
      count: users.filter((u) => u.role === role).length,
    }));

    const bySource = ['GOOGLE', 'MANUAL'].map((source) => ({
      source,
      count: businesses.filter((b) => b.source === source).length,
    }));

    const totalClaims = claimsByStatus.reduce((acc, c) => acc + c._count._all, 0);
    const approved = claimsByStatus.find((c) => c.status === 'APPROVED')?._count._all ?? 0;

    return {
      rangeDays: safeDays,
      trends,
      funnel: {
        claimsSubmitted: totalClaims,
        claimsApproved: approved,
        claimApprovalRate: totalClaims > 0 ? Number(((approved / totalClaims) * 100).toFixed(1)) : 0,
      },
      segmentation: {
        usersByRole: byRole,
        businessesBySource: bySource,
      },
    };
  }

  async getRecentActivity(limit = 20) {
    const safeLimit = Math.max(5, Math.min(50, limit));
    const stats = await this.getStats();
    return stats.recentActivity.slice(0, safeLimit);
  }

  async getAuditLogs(params?: { limit?: number; module?: string; actorId?: string }) {
    const safeLimit = Math.max(10, Math.min(200, params?.limit ?? 40));
    const where: any = {};

    if (params?.module?.trim()) {
      where.module = params.module.trim().toUpperCase();
    }
    if (params?.actorId?.trim()) {
      where.actorId = params.actorId.trim();
    }

    try {
      const rows = await this.prisma.coreAuditLog.findMany({
        where,
        take: safeLimit,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: { select: { id: true, name: true, email: true } },
          business: { select: { id: true, name: true } },
        },
      });

      return {
        total: rows.length,
        items: rows.map((row) => ({
          id: row.id,
          module: row.module,
          action: row.action,
          actorId: row.actorId,
          actorName: row.actor?.name || row.actor?.email || 'Sistema',
          businessId: row.businessId,
          businessName: row.business?.name || null,
          resourceType: row.resourceType,
          resourceId: row.resourceId,
          note: row.note || null,
          createdAt: row.createdAt,
        })),
      };
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && (error.code === 'P2021' || error.code === 'P2022')) {
        return { total: 0, items: [] };
      }
      throw error;
    }
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
        business: { select: { id: true, name: true, category: true, description: true } },
        user:     { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPendingClaims() { return this.getAllClaims('PENDING'); }

  async updateClaimNote(claimId: string, adminNote: string | null) {
    const claim = await this.prisma.claimRequest.findUnique({ where: { id: claimId }, select: { id: true } });
    if (!claim) throw new NotFoundException('Pedido de claim não encontrado.');
    return this.prisma.claimRequest.update({
      where: { id: claimId },
      data: { adminNote: adminNote?.trim() ? adminNote.trim() : null },
      include: {
        business: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async reviewClaim(claimId: string, adminId: string, decision: 'APPROVED' | 'REJECTED', adminNote?: string) {
    const claim = await this.prisma.claimRequest.findUnique({
      where: { id: claimId },
      include: { business: true },
    });
    if (!claim) throw new NotFoundException('Pedido de claim não encontrado.');
    if (claim.status !== ClaimStatus.PENDING) throw new BadRequestException('Este claim já foi revisto.');

    const updatedClaim = await this.prisma.claimRequest.update({
      where: { id: claimId },
      data: { status: decision, adminNote: adminNote ?? null, reviewedBy: adminId, reviewedAt: new Date() },
      include: {
        business: { select: { id: true, name: true } },
        user:     { select: { id: true, name: true, email: true } },
      },
    });

    if (decision === 'APPROVED') {
      await this.prisma.business.update({
        where: { id: claim.businessId },
        data: { ownerId: claim.userId, isClaimed: true, claimedAt: new Date() },
      });
    }
    return updatedClaim;
  }

  // ─── Business Management ─────────────────────────────────────────────────────

  async getAllBusinesses(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;
    const where: any = search ? { name: { contains: search, mode: 'insensitive' } } : {};
    const [businesses, total] = await Promise.all([
      this.prisma.business.findMany({
        where, skip, take: limit,
        include: {
          owner: { select: { id: true, name: true, email: true } },
          _count: { select: { claimRequests: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.business.count({ where }),
    ]);
    return { data: businesses, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getBusinessClaimHistory(businessId: string) {
    const business = await this.prisma.business.findUnique({ where: { id: businessId }, select: { id: true, name: true } });
    if (!business) throw new NotFoundException('Negócio não encontrado.');

    const claims = await this.prisma.claimRequest.findMany({
      where: { businessId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { business, claims };
  }

  async updateBusinessData(
    id: string,
    payload: { name?: string; category?: string; description?: string; isActive?: boolean },
  ) {
    const existing = await this.prisma.business.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException('Negócio não encontrado.');

    return this.prisma.business.update({
      where: { id },
      data: {
        name: payload.name?.trim() || undefined,
        category: payload.category?.trim() || undefined,
        description: payload.description?.trim() || undefined,
        ...(typeof payload.isActive === 'boolean' ? { isActive: payload.isActive } : {}),
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async toggleBusinessActive(id: string) {
    const biz = await this.prisma.business.findUnique({ where: { id }, select: { isActive: true } });
    if (!biz) throw new NotFoundException('Negócio não encontrado.');
    return this.prisma.business.update({
      where: { id },
      data: { isActive: !biz.isActive },
      select: { id: true, name: true, isActive: true },
    });
  }

  async toggleBusinessPremium(id: string) {
    const biz = await this.prisma.business.findUnique({ where: { id }, select: { metadata: true } });
    if (!biz) throw new NotFoundException('Negócio não encontrado.');
    const meta: any = (biz.metadata as any) || {};
    meta.isPremium = !meta.isPremium;
    return this.prisma.business.update({
      where: { id },
      data: { metadata: meta },
      select: { id: true, name: true, metadata: true },
    });
  }

  async unclaimBusiness(id: string) {
    const biz = await this.prisma.business.findUnique({ where: { id }, select: { isClaimed: true } });
    if (!biz) throw new NotFoundException('Negócio não encontrado.');
    return this.prisma.business.update({
      where: { id },
      data: { ownerId: null, isClaimed: false, claimedAt: null },
      select: { id: true, name: true, isClaimed: true, ownerId: true },
    });
  }

  async impersonateBusinessOwner(adminUserId: string, businessId: string, durationMinutes?: number) {
    const ttlMinutes = Number.isFinite(durationMinutes as number)
      ? Math.max(5, Math.min(60, Math.floor(durationMinutes as number)))
      : 20;

    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: {
        id: true,
        name: true,
        ownerId: true,
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
    });

    if (!business) {
      throw new NotFoundException('Negócio não encontrado.');
    }

    if (!business.ownerId || !business.owner) {
      throw new BadRequestException('Este negócio não tem dono associado para impersonação.');
    }

    if (business.owner.role !== UserRole.OWNER) {
      throw new BadRequestException('O utilizador associado ao negócio não tem role OWNER.');
    }

    const accessToken = await this.jwtService.signAsync(
      {
        sub: business.owner.id,
        email: business.owner.email,
        role: business.owner.role,
        isImpersonation: true,
        impersonatedBy: adminUserId,
        impersonationBusinessId: business.id,
      },
      {
        secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
        expiresIn: `${ttlMinutes}m`,
      },
    );

    return {
      accessToken,
      refreshToken: null,
      user: {
        id: business.owner.id,
        email: business.owner.email,
        name: business.owner.name,
        role: business.owner.role,
      },
      impersonation: {
        active: true,
        adminUserId,
        businessId: business.id,
        businessName: business.name,
        expiresInMinutes: ttlMinutes,
      },
    };
  }

  async deleteBusiness(id: string) {
    const biz = await this.prisma.business.findUnique({ where: { id } });
    if (!biz) throw new NotFoundException('Negócio não encontrado.');
    await this.prisma.business.delete({ where: { id } });
    return { deleted: true, id };
  }

  // ─── Outscraper Import ────────────────────────────────────────────────────────

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
      fields: 'query,name,place_id,google_id,full_address,street,city,borough,postal_code,country,country_code,latitude,longitude,phone,site,email,rating,reviews,photo,logo,working_hours,working_hours_old_format,description,about,business_status,category,subtypes,type,located_in,verified',
    });

    // Usar endpoint síncrono -- aguarda resultado imediato
    const response = await fetch(
      `https://api.outscraper.cloud/google-maps-search?${params}&async=false`,
      { headers: { 'X-API-KEY': apiKey } },
    );

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new BadRequestException(`Outscraper API erro ${response.status}: ${body.slice(0, 200)}`);
    }

    const json = await response.json();

    // Se ainda estiver pendente (pedido grande), tentar buscar o resultado
    if (json.status === 'Pending' && json.id) {
      // Aguardar até 30 segundos pelo resultado
      for (let i = 0; i < 6; i++) {
        await new Promise(r => setTimeout(r, 5000));
        const poll = await fetch(
          `https://api.outscraper.cloud/requests/${json.id}`,
          { headers: { 'X-API-KEY': apiKey } },
        );
        const pollData = await poll.json();
        if (pollData.status === 'Success') {
          return this.importService.importRows((pollData.data ?? []).flat());
        }
      }
      throw new BadRequestException('Outscraper: timeout — tenta com um limite menor (ex: 20).');
    }

    if (json.status !== 'Success') {
      throw new BadRequestException(`Outscraper: status "${json.status}"`);
    }

    return this.importService.importRows((json.data ?? []).flat());
  }

  // ─── Google Places Import ─────────────────────────────────────────────────────

  async importFromGooglePlaces(query: string, location: string, apiKey?: string) {
    if (!apiKey) throw new BadRequestException('GOOGLE_PLACES_API_KEY não configurada.');

    const endpoint = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query + ' ' + location)}&key=${apiKey}`;
    const response = await fetch(endpoint);
    const data = await response.json();

    if (data.status !== 'OK') throw new BadRequestException(`Google Places API: ${data.status}`);

    const imported: any[] = [];
    const skipped: any[]  = [];

    for (const place of data.results ?? []) {
      const existing = await this.prisma.business.findUnique({ where: { googlePlaceId: place.place_id } });
      if (existing) { skipped.push({ placeId: place.place_id, name: place.name }); continue; }

      const created = await this.prisma.business.create({
        data: {
          name: place.name, category: 'other', description: place.formatted_address,
          latitude: place.geometry.location.lat, longitude: place.geometry.location.lng,
          source: 'GOOGLE', googlePlaceId: place.place_id, isClaimed: false,
          metadata: { address: place.formatted_address, rating: place.rating,
            userRatingsTotal: place.user_ratings_total, types: place.types },
        },
      });
      imported.push({ id: created.id, name: created.name });
    }
    return { imported: imported.length, skipped: skipped.length, businesses: imported };
  }

  // ─── User Management ─────────────────────────────────────────────────────────

  async getAllUsers(
    page = 1,
    limit = 20,
    search?: string,
    role?: string,
    suspended?: string,
    hasBusinesses?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = { AND: [] as any[] };

    if (search?.trim()) {
      where.AND.push({
        OR: [
          { name: { contains: search.trim(), mode: 'insensitive' } },
          { email: { contains: search.trim(), mode: 'insensitive' } },
        ],
      });
    }

    if (role && Object.values(UserRole).includes(role as UserRole)) {
      where.AND.push({ role: role as UserRole });
    }

    const wantsSuspended = suspended === 'true' || suspended === 'false';
    if (wantsSuspended) {
      where.AND.push({ isSuspended: suspended === 'true' });
    }

    if (hasBusinesses === 'true') {
      where.AND.push({ businesses: { some: {} } });
    } else if (hasBusinesses === 'false') {
      where.AND.push({ businesses: { none: {} } });
    }

    if (where.AND.length === 0) {
      delete where.AND;
    }

    let users: any[] = [];
    let total = 0;

    try {
      [users, total] = await Promise.all([
        this.prisma.user.findMany({
          where,
          skip, take: limit,
          select: {
            id: true, name: true, email: true, role: true, createdAt: true, isSuspended: true, suspendedAt: true,
            _count: { select: { businesses: true, claimRequests: true } },
          } as any,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.user.count({ where }),
      ]);
    } catch (error) {
      if (!this.isSuspensionColumnMissing(error)) throw error;
      if (wantsSuspended) {
        throw new BadRequestException('Filtro por suspensão indisponível até aplicar a migration de utilizadores.');
      }

      [users, total] = await Promise.all([
        this.prisma.user.findMany({
          where,
          skip, take: limit,
          select: {
            id: true, name: true, email: true, role: true, createdAt: true,
            _count: { select: { businesses: true, claimRequests: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.user.count({ where }),
      ]);
      users = users.map((user) => ({ ...user, isSuspended: false, suspendedAt: null }));
    }

    return { data: users, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async changeUserRole(id: string, role: UserRole) {
    if (!Object.values(UserRole).includes(role)) throw new BadRequestException('Role inválido.');
    const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) throw new NotFoundException('Utilizador não encontrado.');
    return this.prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });
  }

  async deleteUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Utilizador não encontrado.');
    await this.prisma.user.delete({ where: { id } });
    return { deleted: true, id };
  }

  async toggleUserSuspended(id: string, suspended: boolean, reason?: string) {
    let user: any = null;
    try {
      user = await this.prisma.user.findUnique({ where: { id }, select: { id: true, isSuspended: true } as any });
    } catch (error) {
      if (!this.isSuspensionColumnMissing(error)) throw error;
      user = await this.prisma.user.findUnique({ where: { id }, select: { id: true } });
      if (user) user.isSuspended = false;
    }

    if (!user) throw new NotFoundException('Utilizador não encontrado.');

    if (suspended) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    try {
      return await this.prisma.user.update({
        where: { id },
        data: {
          isSuspended: suspended,
          suspendedAt: suspended ? new Date() : null,
          suspensionReason: suspended ? (reason?.trim() || 'Suspensa pelo administrador') : null,
        } as any,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isSuspended: true,
          suspendedAt: true,
          suspensionReason: true,
        } as any,
      });
    } catch (error) {
      if (!this.isSuspensionColumnMissing(error)) throw error;
      throw new BadRequestException('Suspensão indisponível até aplicar a migration de utilizadores.');
    }
  }

  async getUserBusinesses(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });
    if (!user) throw new NotFoundException('Utilizador não encontrado.');

    const [owned, claimed] = await Promise.all([
      this.prisma.business.findMany({
        where: { ownerId: userId },
        select: { id: true, name: true, category: true, isClaimed: true, isActive: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.claimRequest.findMany({
        where: { userId },
        include: { business: { select: { id: true, name: true, category: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    return {
      user,
      ownedBusinesses: owned,
      claimHistory: claimed,
    };
  }

  async getContentModeration(type: 'all' | 'reviews' | 'questions' = 'all') {
    const keywords = ['scam', 'fraude', 'roubo', 'burla', 'odio', 'racista', 'sexo', 'violencia'];

    const [reviews, questions, reviewReportNotifications] = await Promise.all([
      type === 'questions'
        ? Promise.resolve([])
        : this.prisma.review.findMany({
            take: 120,
            orderBy: { createdAt: 'desc' },
            include: {
              business: { select: { id: true, name: true } },
              user: { select: { id: true, name: true, email: true } },
            },
          }),
      type === 'reviews'
        ? Promise.resolve([])
        : this.prisma.businessQuestion.findMany({
            take: 120,
            orderBy: { createdAt: 'desc' },
            include: {
              business: { select: { id: true, name: true } },
              user: { select: { id: true, name: true, email: true } },
            },
          }),
      type === 'questions'
        ? Promise.resolve([])
        : this.prisma.notification.findMany({
            take: 300,
            orderBy: { createdAt: 'desc' },
            where: {
              data: {
                path: ['type'],
                equals: 'REVIEW_REPORTED',
              },
            },
          }).catch(() => []),
    ]);

    const reportedReviewIds = new Set(
      (reviewReportNotifications || [])
        .map((n: any) => {
          const payload = (n.data || {}) as any;
          const reviewId = payload?.reviewId;
          return typeof reviewId === 'string' ? reviewId : null;
        })
        .filter(Boolean),
    );

    const flaggedReviews = reviews
      .filter((r) => {
        const text = `${r.comment}`.toLowerCase();
        return reportedReviewIds.has(r.id) || r.rating <= 2 || keywords.some((k) => text.includes(k));
      })
      .map((r) => ({
        id: r.id,
        itemType: 'REVIEW',
        text: r.comment,
        severity: r.rating <= 1 ? 'high' : 'medium',
        source: reportedReviewIds.has(r.id) ? 'REPORT' : 'HEURISTIC',
        rating: r.rating,
        business: r.business,
        user: r.user,
        createdAt: r.createdAt,
      }));

    const flaggedQuestions = questions
      .filter((q) => {
        const text = `${q.question}`.toLowerCase();
        return keywords.some((k) => text.includes(k));
      })
      .map((q) => ({
        id: q.id,
        itemType: 'QUESTION',
        text: q.question,
        severity: 'medium',
        business: q.business,
        user: q.user,
        createdAt: q.createdAt,
        answeredAt: q.answeredAt,
      }));

    const items = [...flaggedReviews, ...flaggedQuestions].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return {
      total: items.length,
      items,
    };
  }

  async removeReview(id: string) {
    const review = await this.prisma.review.findUnique({ where: { id }, select: { id: true } });
    if (!review) throw new NotFoundException('Review não encontrada.');
    await this.prisma.review.delete({ where: { id } });
    return { deleted: true, id };
  }

  async removeQuestion(id: string) {
    const question = await this.prisma.businessQuestion.findUnique({ where: { id }, select: { id: true } });
    if (!question) throw new NotFoundException('Pergunta não encontrada.');
    await this.prisma.businessQuestion.delete({ where: { id } });
    return { deleted: true, id };
  }

  async reportMissingBusiness(userId: string, note: string, businessName?: string) {
    return this.prisma.notification.create({
      data: {
        userId,
        title:   '📍 Negócio em falta reportado',
        message: `Um dono reportou um negócio em falta${businessName ? `: "${businessName}"` : ''}. Nota: ${note}`,
        data:    { type: 'MISSING_BUSINESS', reportedBy: userId, businessName, note },
        isRead:  false,
      },
    });
  }
}