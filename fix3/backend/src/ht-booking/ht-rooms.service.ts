// backend/src/ht-booking/ht-rooms.service.ts
import {
  BadRequestException, ForbiddenException,
  Injectable, NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HtRoomsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertOwnership(businessId: string, ownerId: string) {
    const b = await this.prisma.business.findFirst({
      where: { id: businessId, ownerId },
    });
    if (!b) throw new ForbiddenException('Sem permissão para este estabelecimento.');
  }

  /** Lista todos os HtRooms físicos de um negócio, agrupados por tipo */
  async getAll(businessId: string, ownerId: string) {
    await this.assertOwnership(businessId, ownerId);
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

  /** Cria um quarto físico individual */
  async create(ownerId: string, dto: {
    businessId: string; roomTypeId: string;
    number: string; floor?: number; notes?: string;
  }) {
    await this.assertOwnership(dto.businessId, ownerId);

    // Validar que o roomType pertence ao negócio
    const rt = await this.prisma.htRoomType.findFirst({
      where: { id: dto.roomTypeId, businessId: dto.businessId },
    });
    if (!rt) throw new NotFoundException('Tipo de quarto não encontrado.');

    // Verificar número único por negócio
    const exists = await this.prisma.htRoom.findFirst({
      where: { businessId: dto.businessId, number: dto.number },
    });
    if (exists) throw new BadRequestException(`Quarto nº ${dto.number} já existe neste estabelecimento.`);

    return this.prisma.htRoom.create({
      data: {
        businessId: dto.businessId,
        roomTypeId: dto.roomTypeId,
        number:     dto.number,
        floor:      dto.floor ?? 1,
        notes:      dto.notes ?? null,
        status:     'CLEAN',
      },
      include: {
        roomType: { select: { id: true, name: true } },
      },
    });
  }

  /** Actualiza número, piso, notas ou estado de um quarto */
  async update(id: string, ownerId: string, dto: {
    number?: string; floor?: number; notes?: string; status?: string;
  }) {
    const room = await this.prisma.htRoom.findUnique({
      where: { id },
      include: { business: { select: { ownerId: true, id: true } } },
    });
    if (!room) throw new NotFoundException('Quarto não encontrado.');
    if (room.business.ownerId !== ownerId) throw new ForbiddenException('Sem permissão.');

    // Se mudar número, verificar unicidade
    if (dto.number && dto.number !== room.number) {
      const exists = await this.prisma.htRoom.findFirst({
        where: { businessId: room.business.id, number: dto.number },
      });
      if (exists) throw new BadRequestException(`Quarto nº ${dto.number} já existe.`);
    }

    const validStatuses = ['CLEAN', 'DIRTY', 'CLEANING', 'MAINTENANCE', 'INSPECTING'];
    if (dto.status && !validStatuses.includes(dto.status)) {
      throw new BadRequestException(`Estado inválido. Use: ${validStatuses.join(', ')}`);
    }

    return this.prisma.htRoom.update({
      where: { id },
      data: {
        ...(dto.number  !== undefined && { number: dto.number }),
        ...(dto.floor   !== undefined && { floor:  dto.floor  }),
        ...(dto.notes   !== undefined && { notes:  dto.notes  }),
        ...(dto.status  !== undefined && { status: dto.status as any }),
      },
      include: { roomType: { select: { id: true, name: true } } },
    });
  }

  /** Remove um quarto físico (só se não tiver reservas activas) */
  async remove(id: string, ownerId: string) {
    const room = await this.prisma.htRoom.findUnique({
      where: { id },
      include: {
        business: { select: { ownerId: true } },
        bookings: { where: { status: { in: ['CHECKED_IN', 'CONFIRMED', 'PENDING'] } } },
      },
    });
    if (!room) throw new NotFoundException('Quarto não encontrado.');
    if (room.business.ownerId !== ownerId) throw new ForbiddenException('Sem permissão.');
    if (room.bookings.length > 0)
      throw new BadRequestException('Não é possível remover um quarto com reservas activas.');

    await this.prisma.htRoom.delete({ where: { id } });
    return { message: 'Quarto removido com sucesso.' };
  }
}
