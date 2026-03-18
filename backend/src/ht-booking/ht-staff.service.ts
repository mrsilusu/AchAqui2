import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HtStaffService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertOwnership(businessId: string, ownerId: string) {
    const b = await this.prisma.business.findFirst({ where: { id: businessId, ownerId } });
    if (!b) throw new ForbiddenException('Sem permissão para este estabelecimento.');
  }

  async list(businessId: string, ownerId: string) {
    await this.assertOwnership(businessId, ownerId);
    return this.prisma.coreBusinessStaff.findMany({
      where: { businessId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async add(businessId: string, ownerId: string, dto: { userId: string; role: string }) {
    await this.assertOwnership(businessId, ownerId);
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('Utilizador não encontrado.');
    const existing = await this.prisma.coreBusinessStaff.findFirst({
      where: { businessId, userId: dto.userId, role: dto.role as any },
    });
    if (existing) throw new BadRequestException('Este utilizador já tem este role.');
    return this.prisma.coreBusinessStaff.create({
      data: { businessId, userId: dto.userId, role: dto.role as any },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  }

  async remove(staffId: string, businessId: string, ownerId: string) {
    await this.assertOwnership(businessId, ownerId);
    const staff = await this.prisma.coreBusinessStaff.findFirst({
      where: { id: staffId, businessId },
    });
    if (!staff) throw new NotFoundException('Staff não encontrado.');
    await this.prisma.coreBusinessStaff.delete({ where: { id: staffId } });
    return { message: 'Staff removido.' };
  }

  async assignTask(taskId: string, userId: string, businessId: string, ownerId: string) {
    await this.assertOwnership(businessId, ownerId);
    // Verificar que o user é staff do negócio
    const isStaff = await this.prisma.coreBusinessStaff.findFirst({
      where: { businessId, userId, role: { in: ['HT_HOUSEKEEPER', 'HT_RECEPTIONIST', 'HT_MANAGER'] as any } },
    });
    if (!isStaff) throw new BadRequestException('Utilizador não é staff do estabelecimento.');
    const task = await this.prisma.htHousekeepingTask.findFirst({
      where: { id: taskId, room: { businessId } },
    });
    if (!task) throw new NotFoundException('Tarefa não encontrada.');
    return this.prisma.htHousekeepingTask.update({
      where: { id: taskId },
      data: { assignedToId: userId },
    });
  }
}
