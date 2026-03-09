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

  // ─────────────────────────────────────────────────────
  // MENU ITEM METHODS (Secção 2 — Menu Editor)
  // ─────────────────────────────────────────────────────

  findMenuItemsByBusiness(businessId: string) {
    if (!businessId) {
      throw new BadRequestException('businessId é obrigatório.');
    }

    return this.prisma.item.findMany({
      where: { 
        businessId,
        // In future: add itemType='MENU' filter
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createMenuItem(ownerId: string, createMenuItemDto: any) {
    const business = await this.prisma.business.findUnique({
      where: { id: createMenuItemDto.businessId },
      select: { id: true, ownerId: true },
    });

    if (!business) {
      throw new NotFoundException('Estabelecimento não encontrado.');
    }

    if (business.ownerId !== ownerId) {
      throw new ForbiddenException(
        'Apenas o proprietário do estabelecimento pode adicionar itens ao menu.',
      );
    }

    // Store menu-specific metadata
    const itemData = {
      name: createMenuItemDto.name,
      description: createMenuItemDto.description || '',
      price: createMenuItemDto.price,
      businessId: createMenuItemDto.businessId,
      capacity: 1, // placeholder for menu items
      // metadata.category e .available podem ser armazenados aqui em futuro,
      // ou adicionar coluna específica ao schema
    };

    return this.prisma.item.create({
      data: itemData,
    });
  }

  async updateMenuItem(id: string, ownerId: string, updateMenuItemDto: any) {
    const item = await this.prisma.item.findUnique({
      where: { id },
      include: {
        business: {
          select: { ownerId: true },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Item do menu não encontrado.');
    }

    if (item.business.ownerId !== ownerId) {
      throw new ForbiddenException(
        'Apenas o proprietário do estabelecimento pode editar itens do menu.',
      );
    }

    const dataToUpdate: any = {};
    if (updateMenuItemDto.name) dataToUpdate.name = updateMenuItemDto.name;
    if (updateMenuItemDto.description) dataToUpdate.description = updateMenuItemDto.description;
    if (updateMenuItemDto.price !== undefined) dataToUpdate.price = updateMenuItemDto.price;

    return this.prisma.item.update({
      where: { id },
      data: dataToUpdate,
    });
  }

  async removeMenuItem(id: string, ownerId: string) {
    const item = await this.prisma.item.findUnique({
      where: { id },
      include: {
        business: {
          select: { ownerId: true },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Item do menu não encontrado.');
    }

    if (item.business.ownerId !== ownerId) {
      throw new ForbiddenException(
        'Apenas o proprietário do estabelecimento pode remover itens do menu.',
      );
    }

    await this.prisma.item.delete({
      where: { id },
    });

    return { message: 'Item do menu removido com sucesso.' };
  }

  // ─────────────────────────────────────────────────────
  // INVENTORY ITEM METHODS (Secção 5 — Inventory Editor)
  // ─────────────────────────────────────────────────────

  findInventoryItemsByBusiness(businessId: string) {
    if (!businessId) {
      throw new BadRequestException('businessId é obrigatório.');
    }

    return this.prisma.item.findMany({
      where: { 
        businessId,
        // In future: add itemType='INVENTORY' filter
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createInventoryItem(ownerId: string, createInventoryItemDto: any) {
    const business = await this.prisma.business.findUnique({
      where: { id: createInventoryItemDto.businessId },
      select: { id: true, ownerId: true },
    });

    if (!business) {
      throw new NotFoundException('Estabelecimento não encontrado.');
    }

    if (business.ownerId !== ownerId) {
      throw new ForbiddenException(
        'Apenas o proprietário do estabelecimento pode adicionar itens ao inventário.',
      );
    }

    const itemData = {
      name: createInventoryItemDto.name,
      description: createInventoryItemDto.category || '',
      price: createInventoryItemDto.price,
      businessId: createInventoryItemDto.businessId,
      capacity: Math.floor(createInventoryItemDto.stock) || 0, // Use capacity field for stock count
    };

    return this.prisma.item.create({
      data: itemData,
    });
  }

  async updateInventoryItem(id: string, ownerId: string, updateInventoryItemDto: any) {
    const item = await this.prisma.item.findUnique({
      where: { id },
      include: {
        business: {
          select: { ownerId: true },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Item do inventário não encontrado.');
    }

    if (item.business.ownerId !== ownerId) {
      throw new ForbiddenException(
        'Apenas o proprietário do estabelecimento pode editar itens do inventário.',
      );
    }

    const dataToUpdate: any = {};
    if (updateInventoryItemDto.name) dataToUpdate.name = updateInventoryItemDto.name;
    if (updateInventoryItemDto.price !== undefined) dataToUpdate.price = updateInventoryItemDto.price;
    if (updateInventoryItemDto.stock !== undefined) dataToUpdate.capacity = Math.floor(updateInventoryItemDto.stock);
    if (updateInventoryItemDto.category) dataToUpdate.description = updateInventoryItemDto.category;

    return this.prisma.item.update({
      where: { id },
      data: dataToUpdate,
    });
  }

  async removeInventoryItem(id: string, ownerId: string) {
    const item = await this.prisma.item.findUnique({
      where: { id },
      include: {
        business: {
          select: { ownerId: true },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Item do inventário não encontrado.');
    }

    if (item.business.ownerId !== ownerId) {
      throw new ForbiddenException(
        'Apenas o proprietário do estabelecimento pode remover itens do inventário.',
      );
    }

    await this.prisma.item.delete({
      where: { id },
    });

    return { message: 'Item do inventário removido com sucesso.' };
  }

  // ─────────────────────────────────────────────────────
  // SERVICES METHODS (Secção 6 — Services Editor)
  // ─────────────────────────────────────────────────────

  findServicesByBusiness(businessId: string) {
    if (!businessId) {
      throw new BadRequestException('businessId é obrigatório.');
    }

    return this.prisma.item.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createService(ownerId: string, createServiceDto: any) {
    const business = await this.prisma.business.findUnique({
      where: { id: createServiceDto.businessId },
      select: { id: true, ownerId: true },
    });

    if (!business) {
      throw new NotFoundException('Estabelecimento não encontrado.');
    }

    if (business.ownerId !== ownerId) {
      throw new ForbiddenException('Apenas o proprietário pode adicionar serviços.');
    }

    return this.prisma.item.create({
      data: {
        name: createServiceDto.name,
        description: createServiceDto.description || createServiceDto.duration || '',
        price: createServiceDto.basePrice,
        businessId: createServiceDto.businessId,
        capacity: 1,
      },
    });
  }

  async updateService(id: string, ownerId: string, updateServiceDto: any) {
    const item = await this.prisma.item.findUnique({
      where: { id },
      include: { business: { select: { ownerId: true } } },
    });

    if (!item) throw new NotFoundException('Serviço não encontrado.');
    if (item.business.ownerId !== ownerId)
      throw new ForbiddenException('Apenas o proprietário pode editar serviços.');

    const dataToUpdate: any = {};
    if (updateServiceDto.name) dataToUpdate.name = updateServiceDto.name;
    if (updateServiceDto.description) dataToUpdate.description = updateServiceDto.description;
    if (updateServiceDto.basePrice !== undefined) dataToUpdate.price = updateServiceDto.basePrice;

    return this.prisma.item.update({ where: { id }, data: dataToUpdate });
  }

  async removeService(id: string, ownerId: string) {
    const item = await this.prisma.item.findUnique({
      where: { id },
      include: { business: { select: { ownerId: true } } },
    });

    if (!item) throw new NotFoundException('Serviço não encontrado.');
    if (item.business.ownerId !== ownerId)
      throw new ForbiddenException('Apenas o proprietário pode remover serviços.');

    await this.prisma.item.delete({ where: { id } });
    return { message: 'Serviço removido com sucesso.' };
  }

  // ─────────────────────────────────────────────────────
  // ROOMS METHODS (Secção 7 — Rooms Editor)
  // ─────────────────────────────────────────────────────

  // ─────────────────────────────────────────────────────────────────────────
  // ROOM TYPES — tabela dedicada room_types
  // ─────────────────────────────────────────────────────────────────────────

  async getRoomsByBusiness(businessId: string) {
    if (!businessId) throw new BadRequestException('businessId é obrigatório.');
    return this.prisma.roomType.findMany({
      where: { businessId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createRoomType(ownerId: string, dto: any) {
    const business = await this.prisma.business.findUnique({
      where: { id: dto.businessId },
      select: { id: true, ownerId: true },
    });
    if (!business) throw new NotFoundException('Estabelecimento não encontrado.');
    if (business.ownerId !== ownerId)
      throw new ForbiddenException('Apenas o proprietário pode adicionar tipos de quarto.');

    return this.prisma.roomType.create({
      data: {
        businessId:        dto.businessId,
        name:              dto.name,
        description:       dto.description       ?? '',
        pricePerNight:     dto.pricePerNight,
        maxGuests:         dto.maxGuests          ?? 2,
        totalRooms:        dto.totalRooms         ?? 1,
        available:         dto.available          !== false,
        amenities:         dto.amenities          ?? [],
        minNights:         dto.minNights          ?? 1,
        taxRate:           dto.taxRate            ?? 0,
        weekendMultiplier: dto.weekendMultiplier  ?? 1.0,
        seasonalRates:     dto.seasonalRates      ?? undefined,
        photos:            dto.photos             ?? [],
      },
    });
  }

  async updateRoomType(id: string, ownerId: string, dto: any) {
    const room = await this.prisma.roomType.findUnique({
      where: { id },
      include: { business: { select: { ownerId: true } } },
    });
    if (!room) throw new NotFoundException('Tipo de quarto não encontrado.');
    if (room.business.ownerId !== ownerId)
      throw new ForbiddenException('Apenas o proprietário pode editar tipos de quarto.');

    const data: any = {};
    if (dto.name              !== undefined) data.name              = dto.name;
    if (dto.description       !== undefined) data.description       = dto.description;
    if (dto.pricePerNight     !== undefined) data.pricePerNight     = dto.pricePerNight;
    if (dto.maxGuests         !== undefined) data.maxGuests         = dto.maxGuests;
    if (dto.totalRooms        !== undefined) data.totalRooms        = dto.totalRooms;
    if (dto.available         !== undefined) data.available         = dto.available;
    if (dto.amenities         !== undefined) data.amenities         = dto.amenities;
    if (dto.minNights         !== undefined) data.minNights         = dto.minNights;
    if (dto.taxRate           !== undefined) data.taxRate           = dto.taxRate;
    if (dto.weekendMultiplier !== undefined) data.weekendMultiplier = dto.weekendMultiplier;
    if (dto.seasonalRates     !== undefined) data.seasonalRates     = dto.seasonalRates as any;
    if (dto.photos            !== undefined) data.photos            = dto.photos;

    return this.prisma.roomType.update({ where: { id }, data });
  }

  async removeRoomType(id: string, ownerId: string) {
    const room = await this.prisma.roomType.findUnique({
      where: { id },
      include: { business: { select: { ownerId: true } } },
    });
    if (!room) throw new NotFoundException('Tipo de quarto não encontrado.');
    if (room.business.ownerId !== ownerId)
      throw new ForbiddenException('Apenas o proprietário pode remover tipos de quarto.');

    await this.prisma.roomType.delete({ where: { id } });
    return { message: 'Tipo de quarto removido com sucesso.' };
  }
}
