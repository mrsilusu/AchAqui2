import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { StaffRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HtRoomsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertAccess(
    businessId: string,
    actorId: string,
    actorRole: string = 'OWNER',
    actorBusinessId?: string,
  ): Promise<string> {
    const scopedBusinessId = String(businessId || '').trim();
    if (!scopedBusinessId) throw new BadRequestException('businessId é obrigatório.');
    if (String(actorRole) === 'STAFF') {
      if (!actorBusinessId || actorBusinessId !== scopedBusinessId) {
        throw new ForbiddenException('Sem permissão para este estabelecimento.');
      }
      return scopedBusinessId;
    }
    return this.assertOwnership(businessId, actorId);
  }

  private async assertOwnership(businessId: string, ownerId: string) {
    const scopedBusinessId = String(businessId || '').trim();
    if (!scopedBusinessId) {
      throw new BadRequestException('businessId é obrigatório.');
    }

    const b = await this.prisma.business.findUnique({
      where: { id: scopedBusinessId },
      select: { id: true, ownerId: true },
    });
    if (!b) throw new ForbiddenException('Sem permissão para este estabelecimento.');
    if (b.ownerId !== ownerId) {
      const staff = await this.prisma.coreBusinessStaff.findFirst({
        where: {
          businessId: scopedBusinessId,
          userId: ownerId,
          revokedAt: null,
          OR: [
            { role: StaffRole.GENERAL_MANAGER },
            {
              role: { in: [StaffRole.HT_MANAGER, StaffRole.HT_RECEPTIONIST, StaffRole.HT_HOUSEKEEPER] },
              OR: [{ module: 'HT' }, { module: null }],
            },
          ],
        },
        select: { id: true },
      });
      if (!staff) throw new ForbiddenException('Sem permissão para este estabelecimento.');
    }
    return scopedBusinessId;
  }

  async getAll(businessId: string, actorId: string, actorRole: string = 'OWNER', actorBusinessId?: string) {
    const scopedBusinessId = await this.assertAccess(businessId, actorId, actorRole, actorBusinessId);
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
            assignedTo: {
              select: {
                id: true,
                fullName: true,
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: [{ floor: 'asc' }, { number: 'asc' }],
    });
  }

  async create(ownerId: string, dto: { businessId: string; roomTypeId: string; number: string; floor?: number; notes?: string }, actorRole: string = 'OWNER', actorBusinessId?: string) {
    const scopedBusinessId = await this.assertAccess(dto.businessId, ownerId, actorRole, actorBusinessId);
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

  async update(id: string, ownerId: string, dto: { number?: string; floor?: number; notes?: string; status?: string }, actorRole: string = 'OWNER', actorBusinessId?: string) {
    const room = await this.prisma.htRoom.findUnique({ where: { id }, include: { business: { select: { id: true } } } });
    if (!room) throw new NotFoundException('Quarto não encontrado.');
    await this.assertAccess(room.business.id, ownerId, actorRole, actorBusinessId);
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

    // Marcação manual como DIRTY deve seguir o fluxo do checkout:
    // 1) quarto fica DIRTY
    // 2) cria tarefa pendente de housekeeping quando não existe tarefa aberta
    if (dto.status === 'DIRTY') {
      return this.prisma.$transaction(async (tx) => {
        const openTask = await tx.htHousekeepingTask.findFirst({
          where: { roomId: id, completedAt: null },
          select: { id: true },
        });

        if (!openTask) {
          await tx.htHousekeepingTask.create({
            data: {
              roomId: id,
              priority: 'NORMAL',
              notes: 'Quarto marcado manualmente como sujo no mapa',
            },
          });
        }

        return tx.htRoom.update({
          where: { id },
          data: {
            ...(dto.number !== undefined && { number: dto.number }),
            ...(dto.floor  !== undefined && { floor:  dto.floor }),
            ...(dto.notes  !== undefined && { notes:  dto.notes }),
            status: 'DIRTY' as any,
          },
          include: { roomType: { select: { id: true, name: true } } },
        });
      });
    }

    // Marcação para INSPECTING sem tarefa prévia:
    // cria tarefa e marca como concluída para permitir aprovação da inspeção.
    if (dto.status === 'INSPECTING') {
      return this.prisma.$transaction(async (tx) => {
        const now = new Date();
        const pendingTask = await tx.htHousekeepingTask.findFirst({
          where: { roomId: id, completedAt: null },
          orderBy: { createdAt: 'desc' },
          select: { id: true, startedAt: true },
        });

        if (pendingTask) {
          await tx.htHousekeepingTask.update({
            where: { id: pendingTask.id },
            data: {
              startedAt: pendingTask.startedAt ?? now,
              completedAt: now,
            },
          });
        } else {
          await tx.htHousekeepingTask.create({
            data: {
              roomId: id,
              priority: 'NORMAL',
              notes: 'Limpeza concluída manualmente no painel de housekeeping',
              startedAt: now,
              completedAt: now,
            },
          });
        }

        return tx.htRoom.update({
          where: { id },
          data: {
            ...(dto.number !== undefined && { number: dto.number }),
            ...(dto.floor  !== undefined && { floor:  dto.floor }),
            ...(dto.notes  !== undefined && { notes:  dto.notes }),
            status: 'INSPECTING' as any,
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

  async remove(id: string, ownerId: string, actorRole: string = 'OWNER', actorBusinessId?: string) {
    const room = await this.prisma.htRoom.findUnique({
      where: { id },
      include: {
        business: { select: { id: true } },
        bookings: { where: { status: { in: ['CHECKED_IN', 'CONFIRMED', 'PENDING'] } } },
      },
    });
    if (!room) throw new NotFoundException('Quarto não encontrado.');
    await this.assertAccess(room.business.id, ownerId, actorRole, actorBusinessId);
    if (room.bookings.length > 0) throw new BadRequestException('Não é possível remover um quarto com reservas activas.');

    await this.prisma.htRoom.delete({ where: { id } });
    return { message: 'Quarto removido.' };
  }
}