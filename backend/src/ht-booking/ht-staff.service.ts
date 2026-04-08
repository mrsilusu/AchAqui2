import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppModule, HtStaffDepartment, HtShift, StaffRole, UserRole } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

type CreateStaffDto = {
  businessId: string;
  fullName: string;
  email: string;
  phone?: string;
  department: HtStaffDepartment;
  position?: string;
  documentType?: string;
  documentNumber?: string;
  pin?: string;
  shift?: HtShift;
  workDays?: number[];
  startTime?: string;
  endTime?: string;
  assignedFloors?: number[];
  maxRoomsPerDay?: number;
  emergencyName?: string;
  emergencyPhone?: string;
  canCancelBookings?: boolean;
  canApplyDiscounts?: boolean;
  canViewFinancials?: boolean;
  employmentStart?: string;
  employmentEnd?: string;
  notes?: string;
  createAppAccount?: boolean;
  accountPassword?: string;
};

type UpdateStaffDto = Partial<CreateStaffDto> & {
  pin?: string;
  isActive?: boolean;
};

@Injectable()
export class HtStaffService {
  constructor(private readonly prisma: PrismaService) {}

  private isSchemaDriftError(error: unknown) {
    if (!(error instanceof PrismaClientKnownRequestError)) return false;
    if (error.code === 'P2021' || error.code === 'P2022') return true;
    if (error.code === 'P2010') {
      const message = String((error.meta as any)?.message || '');
      return message.includes('ht_staff') || message.includes('HtStaff') || message.includes('HtStaffDepartment') || message.includes('HtShift');
    }
    return false;
  }

  private mapLegacyRoleToDepartment(role?: StaffRole | null): HtStaffDepartment {
    if (role === StaffRole.HT_MANAGER) return HtStaffDepartment.MANAGEMENT;
    if (role === StaffRole.HT_RECEPTIONIST) return HtStaffDepartment.RECEPTION;
    return HtStaffDepartment.HOUSEKEEPING;
  }

  private async getLegacyStaff(businessId: string, includeInactive = true) {
    const rows = await this.prisma.coreBusinessStaff.findMany({
      where: {
        businessId,
        OR: [{ module: AppModule.HT }, { role: { in: [StaffRole.HT_MANAGER, StaffRole.HT_RECEPTIONIST, StaffRole.HT_HOUSEKEEPER] } }],
        ...(includeInactive ? {} : { revokedAt: null }),
      },
      include: {
        user: { select: { id: true, name: true, email: true, updatedAt: true } },
      },
      orderBy: [{ revokedAt: 'asc' }, { createdAt: 'asc' }],
    });

    return rows.map((row) => ({
      id: row.id,
      businessId: row.businessId,
      userId: row.userId,
      fullName: row.user?.name || row.user?.email || 'Staff',
      email: row.user?.email || '',
      phone: null,
      department: this.mapLegacyRoleToDepartment(row.role),
      position: null,
      documentType: null,
      documentNumber: null,
      shift: HtShift.FLEXIBLE,
      shiftNotes: null,
      assignedFloors: [],
      emergencyName: null,
      emergencyPhone: null,
      canCancelBookings: row.role === StaffRole.HT_MANAGER,
      canApplyDiscounts: row.role === StaffRole.HT_MANAGER,
      canViewFinancials: row.role === StaffRole.HT_MANAGER,
      employmentStart: row.createdAt,
      employmentEnd: null,
      notes: null,
      isActive: !row.revokedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      user: row.user,
    }));
  }

  private async assertOwnership(businessId: string, ownerId: string) {
    const business = await this.prisma.business.findFirst({ where: { id: businessId, ownerId } });
    if (!business) throw new ForbiddenException('Sem permissão para este estabelecimento.');
  }

  private normalizeEmail(email?: string | null) {
    return String(email || '').trim().toLowerCase();
  }

  private normalizePin(pin?: string | null) {
    const raw = String(pin || '').trim();
    if (!raw) return null;
    if (!/^\d{4,8}$/.test(raw)) {
      throw new BadRequestException('PIN deve ter entre 4 e 8 dígitos numéricos.');
    }
    return raw;
  }

  private parseDate(value?: string | null) {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Data inválida.');
    }
    return parsed;
  }

  private mapDepartmentToRole(department: HtStaffDepartment): StaffRole {
    switch (department) {
      case HtStaffDepartment.RECEPTION:
        return StaffRole.HT_RECEPTIONIST;
      case HtStaffDepartment.MANAGEMENT:
        return StaffRole.HT_MANAGER;
      case HtStaffDepartment.HOUSEKEEPING:
      case HtStaffDepartment.MAINTENANCE:
      case HtStaffDepartment.SECURITY:
      case HtStaffDepartment.RESTAURANT:
      default:
        return StaffRole.HT_HOUSEKEEPER;
    }
  }

  private sanitizeStaff<T extends { pinHash?: string | null }>(staff: T) {
    const { pinHash, ...safe } = staff as any;
    return safe;
  }

  private async ensureUserForStaff(
    email: string,
    fullName: string,
    plainPassword?: string,
  ) {
    const normalizedEmail = this.normalizeEmail(email);
    let user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, name: true, role: true },
    });

    if (user) {
      const updates: Record<string, any> = {};
      if (user.role !== UserRole.STAFF) updates.role = UserRole.STAFF;
      if (String(plainPassword || '').trim().length >= 6) {
        updates.password = await bcrypt.hash(String(plainPassword).trim(), 10);
      }
      if (Object.keys(updates).length) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: updates,
          select: { id: true, email: true, name: true, role: true },
        });
      }
      return user;
    }

    const passwordRaw = String(plainPassword || '').trim();
    const passwordToHash = passwordRaw.length >= 6
      ? passwordRaw
      : `${normalizedEmail}:${Date.now()}`;
    const hashedPassword = await bcrypt.hash(passwordToHash, 10);
    user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        name: fullName,
        password: hashedPassword,
        role: UserRole.STAFF,
      },
      select: { id: true, email: true, name: true, role: true },
    });

    return user;
  }

  private async syncCoreBusinessRole(tx: any, params: { businessId: string; userId: string; department: HtStaffDepartment; isActive: boolean }) {
    const role = this.mapDepartmentToRole(params.department);
    const existing = await tx.coreBusinessStaff.findFirst({
      where: { businessId: params.businessId, userId: params.userId, module: AppModule.HT },
      select: { id: true },
    });

    if (!params.isActive) {
      if (existing?.id) {
        await tx.coreBusinessStaff.update({
          where: { id: existing.id },
          data: { revokedAt: new Date(), role },
        });
      }
      return;
    }

    if (existing?.id) {
      await tx.coreBusinessStaff.update({
        where: { id: existing.id },
        data: { role, revokedAt: null },
      });
      return;
    }

    await tx.coreBusinessStaff.create({
      data: {
        businessId: params.businessId,
        userId: params.userId,
        module: AppModule.HT,
        role,
      },
    });
  }

  private async getStaffOrThrow(id: string, businessId: string) {
    const staff = await this.prisma.htStaff.findFirst({
      where: { id, businessId },
      include: {
        user: { select: { id: true, name: true, email: true, updatedAt: true } },
      },
    });
    if (!staff) throw new NotFoundException('Funcionário não encontrado.');
    return staff;
  }

  async getStaff(businessId: string, ownerId: string, includeInactive = true) {
    await this.assertOwnership(businessId, ownerId);
    try {
      const list = await this.prisma.htStaff.findMany({
        where: {
          businessId,
          ...(includeInactive ? {} : { isActive: true }),
        },
        include: {
          user: { select: { id: true, name: true, email: true, updatedAt: true } },
        },
        orderBy: [{ isActive: 'desc' }, { fullName: 'asc' }],
      });
      return list.map((item) => this.sanitizeStaff(item));
    } catch (error) {
      if (!this.isSchemaDriftError(error)) throw error;
      return this.getLegacyStaff(businessId, includeInactive);
    }
  }

  async getAllStaff(businessId: string, ownerId: string) {
    return this.getStaff(businessId, ownerId, true);
  }

  async createStaff(ownerId: string, dto: CreateStaffDto) {
    await this.assertOwnership(dto.businessId, ownerId);

    const fullName = String(dto.fullName || '').trim();
    const email = this.normalizeEmail(dto.email);
    if (fullName.length < 2) throw new BadRequestException('Nome inválido.');
    if (!email.includes('@')) throw new BadRequestException('Email inválido.');

    const existing = await this.prisma.htStaff.findFirst({
      where: { businessId: dto.businessId, email },
      select: { id: true },
    });
    if (existing) throw new BadRequestException('Já existe um funcionário com este email neste negócio.');

    const pin = this.normalizePin(dto.pin);
    const pinHash = pin ? await bcrypt.hash(pin, 10) : null;
    const shouldCreateAppAccount = dto.createAppAccount !== false;
    const accountPassword = String(dto.accountPassword || '').trim();
    if (shouldCreateAppAccount && accountPassword.length < 6) {
      throw new BadRequestException('Password da conta App deve ter no mínimo 6 caracteres.');
    }
    const user = shouldCreateAppAccount
      ? await this.ensureUserForStaff(email, fullName, accountPassword)
      : null;

    const created = await this.prisma.$transaction(async (tx) => {
      const staff = await tx.htStaff.create({
        data: {
          businessId: dto.businessId,
          userId: user?.id || null,
          fullName,
          email,
          phone: dto.phone?.trim() || null,
          department: dto.department,
          position: dto.position?.trim() || null,
          documentType: dto.documentType?.trim() || null,
          documentNumber: dto.documentNumber?.trim() || null,
          pinHash,
          shift: dto.shift || HtShift.ROTATING,
          workDays: Array.isArray(dto.workDays) ? dto.workDays : [1, 2, 3, 4, 5],
          startTime: dto.startTime?.trim() || null,
          endTime: dto.endTime?.trim() || null,
          assignedFloors: Array.isArray(dto.assignedFloors) ? dto.assignedFloors : [],
          maxRoomsPerDay: dto.maxRoomsPerDay ?? null,
          emergencyName: dto.emergencyName?.trim() || null,
          emergencyPhone: dto.emergencyPhone?.trim() || null,
          canCancelBookings: !!dto.canCancelBookings,
          canApplyDiscounts: !!dto.canApplyDiscounts,
          canViewFinancials: !!dto.canViewFinancials,
          employmentStart: this.parseDate(dto.employmentStart),
          employmentEnd: this.parseDate(dto.employmentEnd),
          notes: dto.notes?.trim() || null,
          isActive: true,
        },
        include: {
          user: { select: { id: true, name: true, email: true, updatedAt: true } },
        },
      });

      if (user?.id) {
        await this.syncCoreBusinessRole(tx, {
          businessId: dto.businessId,
          userId: user.id,
          department: dto.department,
          isActive: true,
        });
      }

      await tx.coreAuditLog.create({
        data: {
          businessId: dto.businessId,
          module: AppModule.HT,
          action: 'CORE_STAFF_ADDED',
          actorId: ownerId,
          resourceType: 'HtStaff',
          resourceId: staff.id,
          newData: { department: dto.department, email },
        },
      });

      return staff;
    });

    return this.sanitizeStaff(created);
  }

  async updateStaff(id: string, businessId: string, ownerId: string, dto: UpdateStaffDto) {
    await this.assertOwnership(businessId, ownerId);
    const current = await this.getStaffOrThrow(id, businessId);

    const nextEmail = dto.email !== undefined ? this.normalizeEmail(dto.email) : current.email;
    if (!nextEmail.includes('@')) throw new BadRequestException('Email inválido.');
    if (dto.fullName !== undefined && String(dto.fullName).trim().length < 2) {
      throw new BadRequestException('Nome inválido.');
    }

    if (dto.email !== undefined && nextEmail !== current.email) {
      const exists = await this.prisma.htStaff.findFirst({
        where: { businessId, email: nextEmail, id: { not: id } },
        select: { id: true },
      });
      if (exists) throw new BadRequestException('Já existe um funcionário com este email neste negócio.');
    }

    const pin = dto.pin !== undefined ? this.normalizePin(dto.pin) : null;
    const pinHash = pin ? await bcrypt.hash(pin, 10) : undefined;
    const nextDepartment = dto.department || current.department;
    const nextIsActive = dto.isActive ?? current.isActive;

    const updated = await this.prisma.$transaction(async (tx) => {
      const staff = await tx.htStaff.update({
        where: { id },
        data: {
          ...(dto.fullName !== undefined && { fullName: String(dto.fullName).trim() }),
          ...(dto.email !== undefined && { email: nextEmail }),
          ...(dto.phone !== undefined && { phone: dto.phone?.trim() || null }),
          ...(dto.department !== undefined && { department: dto.department }),
          ...(dto.position !== undefined && { position: dto.position?.trim() || null }),
          ...(dto.documentType !== undefined && { documentType: dto.documentType?.trim() || null }),
          ...(dto.documentNumber !== undefined && { documentNumber: dto.documentNumber?.trim() || null }),
          ...(dto.shift !== undefined && { shift: dto.shift }),
          ...(dto.workDays !== undefined && { workDays: Array.isArray(dto.workDays) ? dto.workDays : [1, 2, 3, 4, 5] }),
          ...(dto.startTime !== undefined && { startTime: dto.startTime?.trim() || null }),
          ...(dto.endTime !== undefined && { endTime: dto.endTime?.trim() || null }),
          ...(dto.assignedFloors !== undefined && { assignedFloors: Array.isArray(dto.assignedFloors) ? dto.assignedFloors : [] }),
          ...(dto.maxRoomsPerDay !== undefined && { maxRoomsPerDay: dto.maxRoomsPerDay ?? null }),
          ...(dto.emergencyName !== undefined && { emergencyName: dto.emergencyName?.trim() || null }),
          ...(dto.emergencyPhone !== undefined && { emergencyPhone: dto.emergencyPhone?.trim() || null }),
          ...(dto.canCancelBookings !== undefined && { canCancelBookings: !!dto.canCancelBookings }),
          ...(dto.canApplyDiscounts !== undefined && { canApplyDiscounts: !!dto.canApplyDiscounts }),
          ...(dto.canViewFinancials !== undefined && { canViewFinancials: !!dto.canViewFinancials }),
          ...(dto.employmentStart !== undefined && { employmentStart: this.parseDate(dto.employmentStart) }),
          ...(dto.employmentEnd !== undefined && { employmentEnd: this.parseDate(dto.employmentEnd) }),
          ...(dto.notes !== undefined && { notes: dto.notes?.trim() || null }),
          ...(dto.isActive !== undefined && { isActive: !!dto.isActive }),
          ...(pinHash !== undefined && { pinHash }),
        },
        include: {
          user: { select: { id: true, name: true, email: true, updatedAt: true } },
        },
      });

      if (staff.userId) {
        await tx.user.update({
          where: { id: staff.userId },
          data: {
            ...(dto.fullName !== undefined && { name: String(dto.fullName).trim() }),
            ...(dto.email !== undefined && { email: nextEmail }),
          },
        }).catch(() => null);

        await this.syncCoreBusinessRole(tx, {
          businessId,
          userId: staff.userId,
          department: nextDepartment,
          isActive: nextIsActive,
        });
      }

      return staff;
    });

    return this.sanitizeStaff(updated);
  }

  async suspendStaff(id: string, businessId: string, ownerId: string, reason: string) {
    const reasonText = String(reason || '').trim();
    if (reasonText.length < 3) {
      throw new BadRequestException('Motivo da suspensão é obrigatório.');
    }
    const current = await this.getStaffOrThrow(id, businessId);
    if (!current.isActive) {
      throw new BadRequestException('Funcionário já está suspenso.');
    }

    const updated = await this.updateStaff(id, businessId, ownerId, {
      isActive: false,
      notes: reasonText,
    });

    await this.prisma.coreAuditLog.create({
      data: {
        businessId,
        module: AppModule.HT,
        action: 'CORE_STAFF_REVOKED',
        actorId: ownerId,
        resourceType: 'HtStaff',
        resourceId: id,
        previousData: { isActive: true },
        newData: { isActive: false },
        note: reasonText,
      },
    });

    return updated;
  }

  async reactivateStaff(id: string, businessId: string, ownerId: string) {
    const current = await this.getStaffOrThrow(id, businessId);
    if (current.isActive) {
      throw new BadRequestException('Funcionário já está activo.');
    }
    return this.updateStaff(id, businessId, ownerId, {
      isActive: true,
      notes: current.notes,
    });
  }

  async getStaffActivity(staffId: string, businessId: string, ownerId: string, from?: string, to?: string) {
    await this.assertOwnership(businessId, ownerId);
    const staff = await this.getStaffOrThrow(staffId, businessId);
    if (!staff.userId) return [];

    const fromDate = from ? this.parseDate(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = to ? this.parseDate(to) : new Date();

    return this.prisma.coreAuditLog.findMany({
      where: {
        businessId,
        actorId: staff.userId,
        createdAt: {
          gte: fromDate || undefined,
          lte: toDate || undefined,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async assignTask(taskId: string, staffId: string, businessId: string, ownerId: string) {
    await this.assertOwnership(businessId, ownerId);
    const staff = await this.prisma.htStaff.findFirst(
      { where: { id: staffId, businessId, isActive: true }, select: { id: true, department: true } });
    if (!staff) throw new NotFoundException('Funcionário não encontrado.');
    const task = await this.prisma.htHousekeepingTask.findFirst(
      { where: { id: taskId, room: { businessId } }, select: { id: true } });
    if (!task) throw new NotFoundException('Tarefa não encontrada.');
    return this.prisma.htHousekeepingTask.update({ where: { id: taskId }, data: { assignedToId: staff.id } });
  }

  async createStaffAccount(
    staffId: string,
    businessId: string,
    ownerId: string,
    dto?: { password?: string },
  ) {
    await this.assertOwnership(businessId, ownerId);
    const staff = await this.getStaffOrThrow(staffId, businessId);

    if (!staff.email) throw new BadRequestException('Funcionário não tem email definido.');
    const password = String(dto?.password || '').trim();
    if (password.length < 6) {
      throw new BadRequestException('Password da conta App deve ter no mínimo 6 caracteres.');
    }

    const normalizedEmail = this.normalizeEmail(staff.email);
    let user = await this.ensureUserForStaff(normalizedEmail, staff.fullName, password);

    let isNew = false;
    if (!staff.userId) isNew = true;

    if (!staff.userId || staff.userId !== user.id) {
      await this.prisma.htStaff.update({
        where: { id: staffId },
        data: { userId: user.id },
      });
    }

    await this.syncCoreBusinessRole(this.prisma, {
      businessId,
      userId: user.id,
      department: staff.department,
      isActive: staff.isActive,
    });

    return { userId: user.id, email: user.email, fullName: staff.fullName, isNew };
  }
}
