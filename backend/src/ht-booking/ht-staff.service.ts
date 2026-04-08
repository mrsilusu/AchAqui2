// backend/src/ht-booking/ht-staff.service.ts
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { HtStaffDepartment, HtShift } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

// [TENANT] Todas as queries incluem businessId validado contra o ownerId do JWT.
// [SECURITY] pinHash nunca é devolvido pela API — select explícito exclui o campo.
// [GDPR] documentNumber nunca aparece no audit log.

export class CreateHtStaffDto {
  fullName:             string;
  department:           HtStaffDepartment;
  phone?:               string;
  email?:               string;
  position?:            string;
  photoUrl?:            string;
  documentType?:        string;
  documentNumber?:      string;
  shift?:               HtShift;
  workDays?:            number[];
  startTime?:           string;
  endTime?:             string;
  assignedFloors?:      number[];
  maxRoomsPerDay?:      number;
  pin?:                 string; // PIN em texto — convertido para bcrypt antes de guardar
  canCancelBookings?:   boolean;
  canApplyDiscounts?:   boolean;
  canViewFinancials?:   boolean;
  employmentStart?:     string;
  employmentEnd?:       string;
  emergencyName?:       string;
  emergencyPhone?:      string;
  notes?:               string;
  businessId:           string;
}

export class UpdateHtStaffDto {
  fullName?:            string;
  department?:          HtStaffDepartment;
  phone?:               string;
  email?:               string;
  position?:            string;
  photoUrl?:            string;
  documentType?:        string;
  documentNumber?:      string;
  shift?:               HtShift;
  workDays?:            number[];
  startTime?:           string;
  endTime?:             string;
  assignedFloors?:      number[];
  maxRoomsPerDay?:      number;
  pin?:                 string; // PIN novo em texto — hash no service
  canCancelBookings?:   boolean;
  canApplyDiscounts?:   boolean;
  canViewFinancials?:   boolean;
  employmentStart?:     string;
  employmentEnd?:       string;
  emergencyName?:       string;
  emergencyPhone?:      string;
  notes?:               string;
}

// Campos devolvidos pela API — sem pinHash
const STAFF_SELECT = {
  id:                 true,
  businessId:         true,
  userId:             true,
  coreStaffId:        true,
  fullName:           true,
  phone:              true,
  email:              true,
  position:           true,
  department:         true,
  photoUrl:           true,
  documentType:       true,
  documentNumber:     true,
  shift:              true,
  workDays:           true,
  startTime:          true,
  endTime:            true,
  assignedFloors:     true,
  maxRoomsPerDay:     true,
  canCancelBookings:  true,
  canApplyDiscounts:  true,
  canViewFinancials:  true,
  employmentStart:    true,
  employmentEnd:      true,
  isActive:           true,
  emergencyName:      true,
  emergencyPhone:     true,
  notes:              true,
  addedById:          true,
  createdAt:          true,
  updatedAt:          true,
  // pinHash:         false — nunca exposto
} as const;

@Injectable()
export class HtStaffService {
  constructor(private readonly prisma: PrismaService) {}

  // [TENANT] Valida que o negócio pertence ao owner autenticado.
  private async validateOwner(businessId: string, ownerId: string) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, ownerId: true },
    });
    if (!business) throw new NotFoundException('Negócio não encontrado.');
    if (business.ownerId !== ownerId)
      throw new ForbiddenException('Acesso negado.');
    return business;
  }

  // [TENANT] Valida que o staff pertence ao negócio do owner.
  private async findStaffForOwner(staffId: string, ownerId: string) {
    const staff = await this.prisma.htStaff.findUnique({
      where:  { id: staffId },
      select: { ...STAFF_SELECT, business: { select: { ownerId: true } } },
    });
    if (!staff) throw new NotFoundException('Funcionário não encontrado.');
    if (staff.business.ownerId !== ownerId)
      throw new ForbiddenException('Acesso negado.');
    return staff;
  }

  async getStaff(businessId: string, ownerId: string) {
    await this.validateOwner(businessId, ownerId);
    return this.prisma.htStaff.findMany({
      where:   { businessId, isActive: true },
      select:  STAFF_SELECT,
      orderBy: [{ department: 'asc' }, { fullName: 'asc' }],
    });
  }

  async getAllStaff(businessId: string, ownerId: string) {
    await this.validateOwner(businessId, ownerId);
    return this.prisma.htStaff.findMany({
      where:   { businessId },
      select:  STAFF_SELECT,
      orderBy: [{ isActive: 'desc' }, { department: 'asc' }, { fullName: 'asc' }],
    });
  }

  async createStaff(ownerId: string, dto: CreateHtStaffDto) {
    await this.validateOwner(dto.businessId, ownerId);

    if (!dto.fullName?.trim()) throw new BadRequestException('Nome obrigatório.');
    if (!dto.department)       throw new BadRequestException('Departamento obrigatório.');

    // [SECURITY] Hash do PIN antes de guardar — nunca armazenar em texto
    let pinHash: string | undefined;
    if (dto.pin) {
      if (dto.pin.length < 4 || dto.pin.length > 8 || !/^\d+$/.test(dto.pin))
        throw new BadRequestException('PIN deve ter entre 4 e 8 dígitos.');
      pinHash = await bcrypt.hash(dto.pin, 10);
    }

    return this.prisma.htStaff.create({
      data: {
        businessId:         dto.businessId,
        fullName:           dto.fullName.trim(),
        department:         dto.department,
        phone:              dto.phone?.trim()    || null,
        email:              dto.email?.trim()    || null,
        position:           dto.position?.trim() || null,
        photoUrl:           dto.photoUrl         || null,
        documentType:       dto.documentType     || null,
        documentNumber:     dto.documentNumber   || null,
        shift:              dto.shift            ?? 'ROTATING',
        workDays:           dto.workDays         ?? [1, 2, 3, 4, 5],
        startTime:          dto.startTime        || null,
        endTime:            dto.endTime          || null,
        assignedFloors:     dto.assignedFloors   ?? [],
        maxRoomsPerDay:     dto.maxRoomsPerDay   ?? null,
        pinHash:            pinHash              ?? null,
        canCancelBookings:  dto.canCancelBookings  ?? false,
        canApplyDiscounts:  dto.canApplyDiscounts  ?? false,
        canViewFinancials:  dto.canViewFinancials  ?? false,
        employmentStart:    dto.employmentStart ? new Date(dto.employmentStart) : null,
        employmentEnd:      dto.employmentEnd   ? new Date(dto.employmentEnd)   : null,
        emergencyName:      dto.emergencyName   || null,
        emergencyPhone:     dto.emergencyPhone  || null,
        notes:              dto.notes           || null,
        addedById:          ownerId,
      },
      select: STAFF_SELECT,
    });
  }

  async updateStaff(staffId: string, ownerId: string, dto: UpdateHtStaffDto) {
    await this.findStaffForOwner(staffId, ownerId);

    let pinHash: string | undefined;
    if (dto.pin) {
      if (dto.pin.length < 4 || dto.pin.length > 8 || !/^\d+$/.test(dto.pin))
        throw new BadRequestException('PIN deve ter entre 4 e 8 dígitos.');
      pinHash = await bcrypt.hash(dto.pin, 10);
    }

    const data: Record<string, any> = { updatedById: ownerId };

    if (dto.fullName      !== undefined) data.fullName      = dto.fullName.trim();
    if (dto.department    !== undefined) data.department    = dto.department;
    if (dto.phone         !== undefined) data.phone         = dto.phone?.trim() || null;
    if (dto.email         !== undefined) data.email         = dto.email?.trim() || null;
    if (dto.position      !== undefined) data.position      = dto.position?.trim() || null;
    if (dto.photoUrl      !== undefined) data.photoUrl      = dto.photoUrl || null;
    if (dto.documentType  !== undefined) data.documentType  = dto.documentType || null;
    if (dto.documentNumber!== undefined) data.documentNumber= dto.documentNumber || null;
    if (dto.shift         !== undefined) data.shift         = dto.shift;
    if (dto.workDays      !== undefined) data.workDays      = dto.workDays;
    if (dto.startTime     !== undefined) data.startTime     = dto.startTime || null;
    if (dto.endTime       !== undefined) data.endTime       = dto.endTime || null;
    if (dto.assignedFloors!== undefined) data.assignedFloors= dto.assignedFloors;
    if (dto.maxRoomsPerDay!== undefined) data.maxRoomsPerDay= dto.maxRoomsPerDay ?? null;
    if (pinHash           !== undefined) data.pinHash       = pinHash;
    if (dto.canCancelBookings !== undefined) data.canCancelBookings = dto.canCancelBookings;
    if (dto.canApplyDiscounts !== undefined) data.canApplyDiscounts = dto.canApplyDiscounts;
    if (dto.canViewFinancials !== undefined) data.canViewFinancials = dto.canViewFinancials;
    if (dto.employmentStart   !== undefined) data.employmentStart = dto.employmentStart ? new Date(dto.employmentStart) : null;
    if (dto.employmentEnd     !== undefined) data.employmentEnd   = dto.employmentEnd   ? new Date(dto.employmentEnd)   : null;
    if (dto.emergencyName     !== undefined) data.emergencyName   = dto.emergencyName || null;
    if (dto.emergencyPhone    !== undefined) data.emergencyPhone  = dto.emergencyPhone || null;
    if (dto.notes             !== undefined) data.notes           = dto.notes || null;

    return this.prisma.htStaff.update({
      where:  { id: staffId },
      data,
      select: STAFF_SELECT,
    });
  }

  async suspendStaff(staffId: string, ownerId: string) {
    await this.findStaffForOwner(staffId, ownerId);
    return this.prisma.htStaff.update({
      where:  { id: staffId },
      data:   { isActive: false, updatedById: ownerId },
      select: STAFF_SELECT,
    });
  }

  async reactivateStaff(staffId: string, ownerId: string) {
    // Allow reactivation even for inactive staff — query without isActive filter
    const staff = await this.prisma.htStaff.findUnique({
      where:  { id: staffId },
      select: { ...STAFF_SELECT, business: { select: { ownerId: true } } },
    });
    if (!staff) throw new NotFoundException('Funcionário não encontrado.');
    if (staff.business.ownerId !== ownerId)
      throw new ForbiddenException('Acesso negado.');

    return this.prisma.htStaff.update({
      where:  { id: staffId },
      data:   { isActive: true, updatedById: ownerId },
      select: STAFF_SELECT,
    });
  }
}
