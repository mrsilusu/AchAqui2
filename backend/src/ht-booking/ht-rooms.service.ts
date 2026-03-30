import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HtRoomsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertOwnership(businessId: string, ownerId: string) {
    const scopedBusinessId = String(businessId || '').trim();
    if (!scopedBusinessId) {
      throw new BadRequestException('businessId é obrigatório.');
    }

    const b = await this.prisma.business.findFirst({ where: { id: scopedBusinessId, ownerId } });
    if (!b) throw new ForbiddenException('Sem permissão para este estabelecimento.');
    return scopedBusinessId;
  }

  async getAll(businessId: string, ownerId: string) {
    const scopedBusinessId = await this.assertOwnership(businessId, ownerId);
    return this.prisma.htRoom.findMany({
      where: { businessId: scopedBusinessId },
      include: {
        roomType: { select: { id: true, name: true, pricePerNight: true } },
        bookings: {
          where: { status: { in: ['CHECKED_IN', 'CONFIRMED', 'PENDING'] } },
          select: { id: true, status: true, guestName: true },
          take: 1,
        },
        tasks: {
          where: {
            OR: [
              { completedAt: null },
              { completedAt: { not: null }, inspectedAt: null },
            ],
          },
          select: {
            id: true,
            priority: true,
            createdAt: true,
            startedAt: true,
            completedAt: true,
            inspectedAt: true,
            assignedToId: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: [{ floor: 'asc' }, { number: 'asc' }],
    });
  }

  async create(ownerId: string, dto: { businessId: string; roomTypeId: string; number: string; floor?: number; notes?: string }) {
    const scopedBusinessId = await this.assertOwnership(dto.businessId, ownerId);
    const rt = await this.prisma.htRoomType.findFirst({ where: { id: dto.roomTypeId, businessId: scopedBusinessId } });
    if (!rt) throw new NotFoundException('Tipo de quarto não encontrado.');
    // Verificar número único no estabelecimento
    const exists = await this.prisma.htRoom.findFirst({ where: { businessId: scopedBusinessId, number: dto.number } });
    if (exists) throw new BadRequestException(`Quarto nº ${dto.number} já existe neste estabelecimento.`);

    return this.prisma.htRoom.create({
      data: { businessId: scopedBusinessId, roomTypeId: dto.roomTypeId, number: dto.number, floor: dto.floor ?? 1, notes: dto.notes ?? null, status: 'CLEAN' },
      include: { roomType: { select: { id: true, name: true } } },
    });
  }

  async update(id: string, ownerId: string, dto: { number?: string; floor?: number; notes?: string; status?: string }) {
    const room = await this.prisma.htRoom.findUnique({ where: { id }, include: { business: { select: { id: true } } } });
    if (!room) throw new NotFoundException('Quarto não encontrado.');
    await this.assertOwnership(room.business.id, ownerId);
    if (dto.number && dto.number !== room.number) {
      const exists = await this.prisma.htRoom.findFirst({ where: { businessId: room.business.id, number: dto.number } });
      if (exists) throw new BadRequestException(`Quarto nº ${dto.number} já existe.`);
    }
    // Se está a marcar como CLEAN, completar todas as tasks pendentes deste quarto
    if (dto.status === 'CLEAN') {
      return this.prisma.$transaction(async (tx) => {
        await tx.htHousekeepingTask.updateMany({
          where: { roomId: id, completedAt: null },
          data:  { completedAt: new Date() },
        });
        return tx.htRoom.update({
          where: { id },
          data: {
            ...(dto.number !== undefined && { number: dto.number }),
            ...(dto.floor  !== undefined && { floor:  dto.floor }),
            ...(dto.notes  !== undefined && { notes:  dto.notes }),
            status: 'CLEAN' as any,
          },
          include: { roomType: { select: { id: true, name: true } } },
        });
      });
    }
    if (dto.status === 'CLEANING') {
      return this.prisma.$transaction(async (tx) => {
        await tx.htHousekeepingTask.updateMany({
          where: { roomId: id, completedAt: null, startedAt: null },
          data: { startedAt: new Date() },
        });
        return tx.htRoom.update({
          where: { id },
          data: {
            ...(dto.number !== undefined && { number: dto.number }),
            ...(dto.floor  !== undefined && { floor:  dto.floor }),
            ...(dto.notes  !== undefined && { notes:  dto.notes }),
            status: 'CLEANING' as any,
          },
          include: { roomType: { select: { id: true, name: true } } },
        });
      });
    }

    return this.prisma.htRoom.update({
      where: { id },
      data: {
        ...(dto.number !== undefined && { number: dto.number }),
        ...(dto.floor  !== undefined && { floor:  dto.floor }),
        ...(dto.notes  !== undefined && { notes:  dto.notes }),
        ...(dto.status !== undefined && { status: dto.status as any }),
      },
      include: { roomType: { select: { id: true, name: true } } },
    });
  }

  async remove(id: string, ownerId: string) {
    const room = await this.prisma.htRoom.findUnique({
      where: { id },
      include: {
        business: { select: { id: true } },
        bookings: { where: { status: { in: ['CHECKED_IN', 'CONFIRMED', 'PENDING'] } } },
      },
    });
    if (!room) throw new NotFoundException('Quarto não encontrado.');
    await this.assertOwnership(room.business.id, ownerId);
    if (room.bookings.length > 0) throw new BadRequestException('Não é possível remover um quarto com reservas activas.');

    await this.prisma.htRoom.delete({ where: { id } });
    return { message: 'Quarto removido.' };
  }
}