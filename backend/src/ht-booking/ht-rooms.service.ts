// backend/src/ht-booking/ht-rooms.service.ts
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HtRoomsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertOwnership(businessId: string, ownerId: string) {
    const b = await this.prisma.business.findFirst({
      where: { id: businessId, OR: [{ ownerId }, { ownerId: null, id: businessId }] },
    });
    if (!b) throw new ForbiddenException('Sem permissão para este estabelecimento.');
  }

  async getAll(businessId: string, ownerId: string) {
    await this.assertOwnership(businessId, ownerId);
    return this.prisma.htRoom.findMany({
      where: { businessId },
      include: {
        roomType: { select: { name: true, pricePerNight: true } },
        bookings: {
          where: { status: 'CHECKED_IN' },
          select: { guestName: true, endDate: true },
          take: 1,
        },
      },
      orderBy: [{ floor: 'asc' }, { number: 'asc' }],
    });
  }

  /** Gera HtRooms físicos a partir dos HtRoomTypes existentes.
   *  Idempotente: não duplica quartos já existentes para um tipo. */
  async seedFromRoomTypes(businessId: string, ownerId: string) {
    await this.assertOwnership(businessId, ownerId);

    const roomTypes = await this.prisma.htRoomType.findMany({
      where: { businessId },
      include: { rooms: true },
    });

    if (!roomTypes.length) {
      return { created: 0, message: 'Nenhum tipo de quarto encontrado.' };
    }

    let created = 0;
    let counter = 100; // base para numeração: 101, 102...

    // Obter o maior número já existente para continuar a sequência
    const existing = await this.prisma.htRoom.findMany({
      where: { businessId },
      select: { number: true },
    });
    const nums = existing.map(r => parseInt(r.number, 10)).filter(n => !isNaN(n));
    if (nums.length) counter = Math.max(...nums);

    for (const rt of roomTypes) {
      const existingCount = rt.rooms.length;
      const missing = rt.totalRooms - existingCount;

      for (let i = 0; i < missing; i++) {
        counter++;
        await this.prisma.htRoom.create({
          data: {
            businessId,
            roomTypeId: rt.id,
            number:     String(counter),
            floor:      1,
            status:     'CLEAN',
          },
        });
        created++;
      }
    }

    return {
      created,
      message: created > 0
        ? `${created} quarto(s) físico(s) criado(s).`
        : 'Todos os quartos já estavam criados.',
    };
  }

  async updateStatus(id: string, status: string, ownerId: string) {
    const room = await this.prisma.htRoom.findUnique({
      where: { id },
      include: { business: { select: { ownerId: true } } },
    });
    if (!room) throw new NotFoundException('Quarto não encontrado.');
    if (room.business.ownerId !== ownerId)
      throw new ForbiddenException('Sem permissão.');

    const validStatuses = ['CLEAN', 'DIRTY', 'CLEANING', 'MAINTENANCE', 'INSPECTING'];
    if (!validStatuses.includes(status))
      throw new ForbiddenException(`Estado inválido. Use: ${validStatuses.join(', ')}`);

    return this.prisma.htRoom.update({ where: { id }, data: { status: status as any } });
  }
}
