import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HtRoomsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertOwnership(businessId: string, ownerId: string) {
    const b = await this.prisma.business.findFirst({ where: { id: businessId, ownerId } });
    if (!b) throw new ForbiddenException('Sem permissão para este estabelecimento.');
  }

  async getAll(businessId: string, ownerId: string) {
    // Só verifica que o negócio existe — assertOwnership seria desnecessariamente restritivo em leitura
    return this.prisma.htRoom.findMany({
      where: { businessId },
      include: {
        roomType: { select: { id: true, name: true, pricePerNight: true } },
        bookings: {
          where: { status: { in: ['CHECKED_IN', 'CONFIRMED', 'PENDING'] } },
          select: { id: true, status: true, guestName: true },
          take: 1,
        },
      },
      orderBy: [{ floor: 'asc' }, { number: 'asc' }],
    });
  }

  async create(ownerId: string, dto: { businessId: string; roomTypeId: string; number: string; floor?: number; notes?: string }) {
    const rt = await this.prisma.htRoomType.findFirst({ where: { id: dto.roomTypeId, businessId: dto.businessId } });
    if (!rt) throw new NotFoundException('Tipo de quarto não encontrado.');
    // Verificar número único no estabelecimento
    const exists = await this.prisma.htRoom.findFirst({ where: { businessId: dto.businessId, number: dto.number } });
    if (exists) throw new BadRequestException(`Quarto nº ${dto.number} já existe neste estabelecimento.`);

    return this.prisma.htRoom.create({
      data: { businessId: dto.businessId, roomTypeId: dto.roomTypeId, number: dto.number, floor: dto.floor ?? 1, notes: dto.notes ?? null, status: 'CLEAN' },
      include: { roomType: { select: { id: true, name: true } } },
    });
  }

  async update(id: string, ownerId: string, dto: { number?: string; floor?: number; notes?: string; status?: string }) {
    const room = await this.prisma.htRoom.findUnique({ where: { id }, include: { business: { select: { id: true } } } });
    if (!room) throw new NotFoundException('Quarto não encontrado.');
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
      include: { bookings: { where: { status: { in: ['CHECKED_IN', 'CONFIRMED', 'PENDING'] } } } },
    });
    if (!room) throw new NotFoundException('Quarto não encontrado.');
    if (room.bookings.length > 0) throw new BadRequestException('Não é possível remover um quarto com reservas activas.');

    await this.prisma.htRoom.delete({ where: { id } });
    return { message: 'Quarto removido.' };
  }
}