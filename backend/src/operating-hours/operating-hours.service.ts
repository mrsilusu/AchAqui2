import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOperatingHourDto } from './dto/create-operating-hour.dto';
import { UpdateOperatingHourDto } from './dto/update-operating-hour.dto';

@Injectable()
export class OperatingHoursService {
  constructor(private readonly prisma: PrismaService) {}

  private timeToMinutes(time: string) {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private validateTimeRange(openTime: string, closeTime: string, isClosed: boolean) {
    if (isClosed) {
      return;
    }

    if (this.timeToMinutes(openTime) >= this.timeToMinutes(closeTime)) {
      throw new BadRequestException('openTime deve ser menor que closeTime.');
    }
  }

  private async ensureBusinessOwner(businessId: string, ownerId: string) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, ownerId: true },
    });

    if (!business) {
      throw new NotFoundException('Estabelecimento não encontrado.');
    }

    if (business.ownerId !== ownerId) {
      throw new ForbiddenException(
        'Apenas o proprietário do estabelecimento pode gerir horários.',
      );
    }
  }

  findAllByBusiness(businessId: string) {
    return this.prisma.operatingHour.findMany({
      where: { businessId },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  async findOne(businessId: string, id: string) {
    const entry = await this.prisma.operatingHour.findFirst({
      where: { id, businessId },
    });

    if (!entry) {
      throw new NotFoundException('Horário não encontrado.');
    }

    return entry;
  }

  async create(
    businessId: string,
    ownerId: string,
    createOperatingHourDto: CreateOperatingHourDto,
  ) {
    await this.ensureBusinessOwner(businessId, ownerId);

    this.validateTimeRange(
      createOperatingHourDto.openTime,
      createOperatingHourDto.closeTime,
      createOperatingHourDto.isClosed ?? false,
    );

    const existingDay = await this.prisma.operatingHour.findUnique({
      where: {
        businessId_dayOfWeek: {
          businessId,
          dayOfWeek: createOperatingHourDto.dayOfWeek,
        },
      },
    });

    if (existingDay) {
      throw new ConflictException('Já existe horário definido para este dia.');
    }

    return this.prisma.operatingHour.create({
      data: {
        ...createOperatingHourDto,
        businessId,
      },
    });
  }

  async update(
    businessId: string,
    id: string,
    ownerId: string,
    updateOperatingHourDto: UpdateOperatingHourDto,
  ) {
    const existing = await this.prisma.operatingHour.findFirst({
      where: { id, businessId },
      include: {
        business: {
          select: { ownerId: true },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Horário não encontrado.');
    }

    if (existing.business.ownerId !== ownerId) {
      throw new ForbiddenException(
        'Apenas o proprietário do estabelecimento pode gerir horários.',
      );
    }

    const nextDayOfWeek = updateOperatingHourDto.dayOfWeek ?? existing.dayOfWeek;
    const nextOpenTime = updateOperatingHourDto.openTime ?? existing.openTime;
    const nextCloseTime = updateOperatingHourDto.closeTime ?? existing.closeTime;
    const nextIsClosed = updateOperatingHourDto.isClosed ?? existing.isClosed;

    this.validateTimeRange(nextOpenTime, nextCloseTime, nextIsClosed);

    if (nextDayOfWeek !== existing.dayOfWeek) {
      const dayConflict = await this.prisma.operatingHour.findUnique({
        where: {
          businessId_dayOfWeek: {
            businessId,
            dayOfWeek: nextDayOfWeek,
          },
        },
      });

      if (dayConflict && dayConflict.id !== existing.id) {
        throw new ConflictException('Já existe horário definido para este dia.');
      }
    }

    return this.prisma.operatingHour.update({
      where: { id },
      data: updateOperatingHourDto,
    });
  }

  async remove(businessId: string, id: string, ownerId: string) {
    const existing = await this.prisma.operatingHour.findFirst({
      where: { id, businessId },
      include: {
        business: {
          select: { ownerId: true },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Horário não encontrado.');
    }

    if (existing.business.ownerId !== ownerId) {
      throw new ForbiddenException(
        'Apenas o proprietário do estabelecimento pode gerir horários.',
      );
    }

    await this.prisma.operatingHour.delete({
      where: { id },
    });

    return { message: 'Horário removido com sucesso.' };
  }
}
