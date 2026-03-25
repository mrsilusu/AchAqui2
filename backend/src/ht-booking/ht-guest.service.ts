import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HtGuestService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeDocumentNumber(value?: string | null): string | null {
    const raw = String(value || '').trim();
    if (!raw) return null;
    return raw.replace(/\s+/g, '').toUpperCase();
  }

  private async assertOwnership(businessId: string, ownerId: string) {
    const b = await this.prisma.business.findFirst({ where: { id: businessId, ownerId } });
    if (!b) throw new ForbiddenException('Sem permissão para este estabelecimento.');
  }

  // ─── Listar hóspedes ──────────────────────────────────────────────────────
  async list(businessId: string, ownerId: string, search?: string) {
    await this.assertOwnership(businessId, ownerId);
    const normalizedSearch = this.normalizeDocumentNumber(search);
    return this.prisma.htGuestProfile.findMany({
      where: {
        businessId,
        ...(search ? {
          OR: [
            { fullName:       { contains: search, mode: 'insensitive' } },
            { phone:          { contains: search } },
            { documentNumber: { contains: search } },
            ...(normalizedSearch ? [{ documentNumber: { contains: normalizedSearch } }] : []),
            { companyName:    { contains: search, mode: 'insensitive' } },
            { nif:            { contains: search } },
          ],
        } : {}),
      },
      include: {
        bookings: {
          select: { id: true, startDate: true, endDate: true, status: true },
          orderBy: { startDate: 'desc' },
          take: 5,
        },
      },
      orderBy: { fullName: 'asc' },
    });
  }

  // ─── Buscar hóspede por id ────────────────────────────────────────────────
  async findOne(id: string, businessId: string, ownerId: string) {
    await this.assertOwnership(businessId, ownerId);
    const guest = await this.prisma.htGuestProfile.findFirst({
      where: { id, businessId },
      include: {
        bookings: {
          select: {
            id: true, startDate: true, endDate: true, status: true,
            totalPrice: true, roomType: { select: { name: true } },
          },
          orderBy: { startDate: 'desc' },
        },
      },
    });
    if (!guest) throw new NotFoundException('Hóspede não encontrado.');
    return guest;
  }

  // ─── Criar perfil ─────────────────────────────────────────────────────────
  async create(businessId: string, ownerId: string, dto: {
    fullName: string; phone?: string; email?: string;
    documentType?: string; documentNumber?: string;
    companyName?: string; nif?: string;
    nationality?: string; dateOfBirth?: string;
    address?: string; preferences?: string; notes?: string; isVip?: boolean;
  }) {
    await this.assertOwnership(businessId, ownerId);
    const normalizedDocument = this.normalizeDocumentNumber(dto.documentNumber);
    if (!normalizedDocument) {
      throw new BadRequestException('Documento de identificação é obrigatório para criar perfil de hóspede.');
    }
    const exists = await this.prisma.htGuestProfile.findFirst({
      where: { businessId, documentNumber: normalizedDocument },
      select: { id: true },
    });
    if (exists) throw new BadRequestException('Número de documento já registado para outro hóspede neste estabelecimento.');

    return this.prisma.htGuestProfile.create({
      data: {
        businessId,
        fullName:       dto.fullName,
        phone:          dto.phone          ?? null,
        email:          dto.email          ?? null,
        documentType:   dto.documentType   ?? null,
        documentNumber: normalizedDocument,
        companyName:    dto.companyName    ?? null,
        nif:            dto.nif            ?? null,
        nationality:    dto.nationality    ?? null,
        dateOfBirth:    dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        address:        dto.address        ?? null,
        preferences:    dto.preferences    ?? null,
        notes:          dto.notes          ?? null,
        isVip:          dto.isVip          ?? false,
      },
    });
  }

  // ─── Actualizar perfil ────────────────────────────────────────────────────
  async update(id: string, businessId: string, ownerId: string, dto: {
    fullName?: string; phone?: string; email?: string;
    documentType?: string; documentNumber?: string;
    companyName?: string; nif?: string;
    nationality?: string; dateOfBirth?: string;
    address?: string; preferences?: string; notes?: string; isVip?: boolean;
    isBlacklisted?: boolean;
  }) {
    await this.assertOwnership(businessId, ownerId);
    const guest = await this.prisma.htGuestProfile.findFirst({ where: { id, businessId } });
    if (!guest) throw new NotFoundException('Hóspede não encontrado.');

    const normalizedDocument = dto.documentNumber !== undefined
      ? this.normalizeDocumentNumber(dto.documentNumber)
      : undefined;

    if (normalizedDocument !== undefined) {
      if (!normalizedDocument) {
        throw new BadRequestException('Documento de identificação é obrigatório.');
      }
      const exists = await this.prisma.htGuestProfile.findFirst({
        where: {
          businessId,
          documentNumber: normalizedDocument,
          id: { not: id },
        },
        select: { id: true },
      });
      if (exists) {
        throw new BadRequestException('Número de documento já registado para outro hóspede neste estabelecimento.');
      }
    }

    return this.prisma.htGuestProfile.update({
      where: { id },
      data: {
        ...(dto.fullName       !== undefined && { fullName:       dto.fullName }),
        ...(dto.phone          !== undefined && { phone:          dto.phone }),
        ...(dto.email          !== undefined && { email:          dto.email }),
        ...(dto.documentType   !== undefined && { documentType:   dto.documentType }),
        ...(normalizedDocument !== undefined && { documentNumber: normalizedDocument }),
        ...(dto.companyName    !== undefined && { companyName:    dto.companyName }),
        ...(dto.nif            !== undefined && { nif:            dto.nif }),
        ...(dto.nationality    !== undefined && { nationality:    dto.nationality }),
        ...(dto.dateOfBirth    !== undefined && { dateOfBirth:    dto.dateOfBirth ? new Date(dto.dateOfBirth) : null }),
        ...(dto.address        !== undefined && { address:        dto.address }),
        ...(dto.preferences    !== undefined && { preferences:    dto.preferences }),
        ...(dto.notes          !== undefined && { notes:          dto.notes }),
        ...(dto.isVip          !== undefined && { isVip:          dto.isVip }),
        ...(dto.isBlacklisted  !== undefined && { isBlacklisted:  dto.isBlacklisted }),
      },
    });
  }

  // ─── Ligar hóspede a uma reserva ─────────────────────────────────────────
  async linkToBooking(guestId: string, bookingId: string, businessId: string, ownerId: string) {
    await this.assertOwnership(businessId, ownerId);
    const guest = await this.prisma.htGuestProfile.findFirst({ where: { id: guestId, businessId } });
    if (!guest) throw new NotFoundException('Hóspede não encontrado.');
    const booking = await this.prisma.htRoomBooking.findFirst({
      where: { id: bookingId, businessId },
    });
    if (!booking) throw new NotFoundException('Reserva não encontrada.');
    return this.prisma.htRoomBooking.update({
      where: { id: bookingId },
      data: { guestProfileId: guestId, guestName: guest.fullName, guestPhone: guest.phone ?? booking.guestPhone },
    });
  }
}
