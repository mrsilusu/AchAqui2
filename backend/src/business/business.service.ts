import { NotFoundException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';

@Injectable()
export class BusinessService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.business.findMany({
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const business = await this.prisma.business.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
    });

    if (!business) {
      throw new NotFoundException('Estabelecimento não encontrado.');
    }

    return business;
  }

  create(ownerId: string, createBusinessDto: CreateBusinessDto) {
    const { metadata, ...baseData } = createBusinessDto;

    return this.prisma.business.create({
      data: {
        ...baseData,
        ...(metadata !== undefined
          ? { metadata: metadata as Prisma.InputJsonValue }
          : {}),
        ownerId,
      },
    });
  }

  async update(id: string, ownerId: string, updateBusinessDto: UpdateBusinessDto) {
    const business = await this.prisma.business.findFirst({
      where: {
        id,
        ownerId,
      },
    });

    if (!business) {
      throw new NotFoundException(
        'Estabelecimento não encontrado para este proprietário.',
      );
    }

    const { metadata, ...baseData } = updateBusinessDto;

    return this.prisma.business.update({
      where: { id },
      data: {
        ...baseData,
        ...(metadata !== undefined
          ? { metadata: metadata as Prisma.InputJsonValue }
          : {}),
      },
    });
  }

  async remove(id: string, ownerId: string) {
    const business = await this.prisma.business.findFirst({
      where: {
        id,
        ownerId,
      },
    });

    if (!business) {
      throw new NotFoundException(
        'Estabelecimento não encontrado para este proprietário.',
      );
    }

    await this.prisma.business.delete({
      where: { id },
    });

    return { message: 'Estabelecimento removido com sucesso.' };
  }
}
