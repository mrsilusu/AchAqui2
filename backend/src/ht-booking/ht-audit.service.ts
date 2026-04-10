import { ForbiddenException, Injectable } from '@nestjs/common';
import { AppModule, HtStaffDepartment, StaffRole, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type LogParams = {
  businessId: string;
  module: AppModule;
  action: string;
  actorId: string;
  actorName?: string;
  actorRole?: string;
  resourceType: string;
  resourceId: string;
  resourceName?: string;
  previousData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  note?: string;
  ipAddress?: string;
};

type LogFilters = {
  businessId: string;
  from?: string;
  to?: string;
  action?: string;
  actorId?: string;
  resourceType?: string;
  page?: number;
  limit?: number;
};

type RequestContext = {
  userId: string;
  userRole: string;
  jwtStaffRole?: string;
  jwtBusinessId?: string;
};

@Injectable()
export class HtAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: LogParams) {
    const actor = params.actorId
      ? await this.prisma.user.findUnique({
          where: { id: params.actorId },
          select: { id: true, name: true, email: true },
        }).catch(() => null)
      : null;

    const role = params.actorRole || await this.resolveActorRole(params.businessId, params.actorId);

    return this.prisma.coreAuditLog.create({
      data: {
        businessId: params.businessId,
        module: params.module,
        action: params.action as any,
        actorId: params.actorId,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        previousData: (params.previousData || {}) as any,
        newData: {
          ...(params.newData || {}),
          _meta: {
            actorName: params.actorName || actor?.name || null,
            actorEmail: actor?.email || null,
            actorRole: role || null,
            resourceName: params.resourceName || null,
            note: params.note || null,
          },
        } as any,
        ipAddress: params.ipAddress,
        note: params.note,
      },
    });
  }

  async getLog(filters: LogFilters, context: RequestContext) {
    const businessId = String(filters.businessId || '').trim();
    if (!businessId) throw new ForbiddenException('Negócio inválido.');

    const role = await this.resolveAccessRole(businessId, context);
    const limit = Math.max(1, Math.min(50, Number(filters.limit || 50)));
    const page = Math.max(1, Number(filters.page || 1));
    const skip = (page - 1) * limit;

    const where: any = {
      businessId,
      module: AppModule.HT,
    };

    if (filters.action) where.action = String(filters.action);
    if (filters.resourceType) where.resourceType = String(filters.resourceType);

    const fromDate = filters.from ? new Date(filters.from) : undefined;
    const toDate = filters.to ? new Date(filters.to) : undefined;
    if (fromDate || toDate) {
      where.createdAt = {
        ...(fromDate && !Number.isNaN(fromDate.getTime()) ? { gte: fromDate } : {}),
        ...(toDate && !Number.isNaN(toDate.getTime()) ? { lte: toDate } : {}),
      };
    }

    let actorIdFilter: string | undefined;
    if (filters.actorId) {
      actorIdFilter = String(filters.actorId);
      const maybeStaff = await this.prisma.htStaff.findFirst({
        where: { id: actorIdFilter, businessId },
        select: { userId: true },
      });
      if (maybeStaff?.userId) actorIdFilter = maybeStaff.userId;
    }

    if (role === StaffRole.HT_RECEPTIONIST) {
      where.actorId = context.userId;
    } else if (actorIdFilter) {
      where.actorId = actorIdFilter;
    }

    const [items, total] = await Promise.all([
      this.prisma.coreAuditLog.findMany({
        where,
        include: {
          actor: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.coreAuditLog.count({ where }),
    ]);

    return {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      canViewAll: role === 'OWNER' || role === StaffRole.HT_MANAGER || role === StaffRole.GENERAL_MANAGER,
      items,
    };
  }

  private async resolveActorRole(businessId: string, actorId?: string) {
    if (!actorId) return null;
    const business = await this.prisma.business.findUnique({ where: { id: businessId }, select: { ownerId: true } });
    if (business?.ownerId === actorId) return 'OWNER';

    const coreRole = await this.prisma.coreBusinessStaff.findFirst({
      where: {
        businessId,
        userId: actorId,
        revokedAt: null,
      },
      select: { role: true },
    });
    if (coreRole?.role) return coreRole.role;

    const htStaff = await this.prisma.htStaff.findFirst({
      where: { businessId, userId: actorId, isActive: true },
      select: { department: true },
    });
    if (!htStaff) return null;

    if (htStaff.department === HtStaffDepartment.RECEPTION) return StaffRole.HT_RECEPTIONIST;
    if (htStaff.department === HtStaffDepartment.MANAGEMENT) return StaffRole.HT_MANAGER;
    return StaffRole.HT_HOUSEKEEPER;
  }

  private async resolveAccessRole(businessId: string, context: RequestContext) {
    if (String(context.userRole) === UserRole.OWNER) {
      const owned = await this.prisma.business.findFirst({ where: { id: businessId, ownerId: context.userId }, select: { id: true } });
      if (!owned) throw new ForbiddenException('Sem permissão para este estabelecimento.');
      return 'OWNER';
    }

    if (String(context.userRole) !== 'STAFF') {
      throw new ForbiddenException('Sem permissão para o log de actividade.');
    }

    if (!context.jwtBusinessId || context.jwtBusinessId !== businessId) {
      throw new ForbiddenException('Sem permissão para este estabelecimento.');
    }

    const jwtRole = String(context.jwtStaffRole || '');
    if (jwtRole === StaffRole.HT_MANAGER || jwtRole === StaffRole.GENERAL_MANAGER || jwtRole === StaffRole.HT_RECEPTIONIST) {
      return jwtRole;
    }

    const inferredRole = await this.resolveActorRole(businessId, context.userId);
    if (inferredRole === StaffRole.HT_MANAGER || inferredRole === StaffRole.GENERAL_MANAGER || inferredRole === StaffRole.HT_RECEPTIONIST) {
      return inferredRole;
    }

    throw new ForbiddenException('Sem permissão para o log de actividade.');
  }
}
