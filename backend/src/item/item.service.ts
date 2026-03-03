import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

@Injectable()
export class ItemService {
  constructor(private readonly prisma: PrismaService) {}

  findAllByBusiness(businessId: string) {
    if (!businessId) {
      throw new BadRequestException('businessId é obrigatório.');
    }

    return this.prisma.item.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.item.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException('Item não encontrado.');
    }

    return item;
  }

  async create(ownerId: string, createItemDto: CreateItemDto) {
    const business = await this.prisma.business.findUnique({
      where: { id: createItemDto.businessId },
      select: { id: true, ownerId: true },
    });

    if (!business) {
      throw new NotFoundException('Estabelecimento não encontrado.');
    }

    if (business.ownerId !== ownerId) {
      throw new ForbiddenException(
        'Apenas o proprietário do estabelecimento pode adicionar itens.',
      );
    }

    return this.prisma.item.create({
      data: createItemDto,
    });
  }

  async update(id: string, ownerId: string, updateItemDto: UpdateItemDto) {
    const item = await this.prisma.item.findUnique({
      where: { id },
      include: {
        business: {
          select: { ownerId: true },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Item não encontrado.');
    }

    if (item.business.ownerId !== ownerId) {
      throw new ForbiddenException(
        'Apenas o proprietário do estabelecimento pode editar itens.',
      );
    }

    return this.prisma.item.update({
      where: { id },
      data: updateItemDto,
    });
  }

  async remove(id: string, ownerId: string) {
    const item = await this.prisma.item.findUnique({
      where: { id },
      include: {
        business: {
          select: { ownerId: true },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Item não encontrado.');
    }

    if (item.business.ownerId !== ownerId) {
      throw new ForbiddenException(
        'Apenas o proprietário do estabelecimento pode remover itens.',
      );
    }

    await this.prisma.item.delete({
      where: { id },
    });

    return { message: 'Item removido com sucesso.' };
  }
}
