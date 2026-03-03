import { BadRequestException, NotFoundException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';

@Injectable()
export class BusinessService {
  constructor(private readonly prisma: PrismaService) {}

  async searchNearby(params: {
    latitude: string;
    longitude: string;
    radiusKm?: string;
  }) {
    const latitude = Number(params.latitude);
    const longitude = Number(params.longitude);
    const radiusKm = params.radiusKm ? Number(params.radiusKm) : 10;

    if (
      Number.isNaN(latitude) ||
      Number.isNaN(longitude) ||
      Number.isNaN(radiusKm)
    ) {
      throw new BadRequestException('latitude, longitude e radiusKm devem ser numéricos.');
    }

    if (radiusKm <= 0) {
      throw new BadRequestException('radiusKm deve ser maior que 0.');
    }

    const radiusMeters = radiusKm * 1000;

    return this.prisma.$queryRaw<
      Array<{
        id: string;
        name: string;
        category: string;
        description: string;
        latitude: number;
        longitude: number;
        distance_meters: number;
      }>
    >(
      Prisma.sql`
        SELECT
          b."id",
          b."name",
          b."category",
          b."description",
          b."latitude",
          b."longitude",
          ST_DistanceSphere(
            ST_MakePoint(b."longitude", b."latitude"),
            ST_MakePoint(${longitude}, ${latitude})
          ) AS distance_meters
        FROM "Business" b
        WHERE ST_DistanceSphere(
          ST_MakePoint(b."longitude", b."latitude"),
          ST_MakePoint(${longitude}, ${latitude})
        ) <= ${radiusMeters}
        ORDER BY distance_meters ASC
      `,
    );
  }

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
