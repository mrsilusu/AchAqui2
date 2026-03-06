import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { ItemService } from './item.service';

@Controller('items')
export class ItemController {
  constructor(private readonly itemService: ItemService) {}

  @Get()
  @Public()
  findAllByBusiness(@Query('businessId') businessId: string) {
    return this.itemService.findAllByBusiness(businessId);
  }

  @Get(':id')
  @Public()
  findOne(@Param('id') id: string) {
    return this.itemService.findOne(id);
  }

  @Post()
  @Roles(UserRole.OWNER)
  create(
    @Req() req: { user: { userId: string } },
    @Body() createItemDto: CreateItemDto,
  ) {
    return this.itemService.create(req.user.userId, createItemDto);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER)
  update(
    @Param('id') id: string,
    @Req() req: { user: { userId: string } },
    @Body() updateItemDto: UpdateItemDto,
  ) {
    return this.itemService.update(id, req.user.userId, updateItemDto);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER)
  remove(@Param('id') id: string, @Req() req: { user: { userId: string } }) {
    return this.itemService.remove(id, req.user.userId);
  }

  // ─────────────────────────────────────────────────────
  // MENU ITEMS ENDPOINTS (Secção 2 — Menu Editor)
  // ─────────────────────────────────────────────────────

  @Get('menu/by-business')
  @Public()
  findMenuItemsByBusiness(@Query('businessId') businessId: string) {
    return this.itemService.findMenuItemsByBusiness(businessId);
  }

  @Post('menu')
  @Roles(UserRole.OWNER)
  createMenuItem(
    @Req() req: { user: { userId: string } },
    @Body() createMenuItemDto: CreateMenuItemDto,
  ) {
    return this.itemService.createMenuItem(req.user.userId, createMenuItemDto);
  }

  @Patch('menu/:id')
  @Roles(UserRole.OWNER)
  updateMenuItem(
    @Param('id') id: string,
    @Req() req: { user: { userId: string } },
    @Body() updateMenuItemDto: UpdateMenuItemDto,
  ) {
    return this.itemService.updateMenuItem(id, req.user.userId, updateMenuItemDto);
  }

  @Delete('menu/:id')
  @Roles(UserRole.OWNER)
  removeMenuItem(
    @Param('id') id: string,
    @Req() req: { user: { userId: string } }
  ) {
    return this.itemService.removeMenuItem(id, req.user.userId);
  }

  // ─────────────────────────────────────────────────────
  // INVENTORY ITEMS ENDPOINTS (Secção 5 — Inventory Editor)
  // ─────────────────────────────────────────────────────

  @Get('inventory/by-business')
  @Public()
  findInventoryItemsByBusiness(@Query('businessId') businessId: string) {
    return this.itemService.findInventoryItemsByBusiness(businessId);
  }

  @Post('inventory')
  @Roles(UserRole.OWNER)
  createInventoryItem(
    @Req() req: { user: { userId: string } },
    @Body() createInventoryItemDto: CreateInventoryItemDto,
  ) {
    return this.itemService.createInventoryItem(req.user.userId, createInventoryItemDto);
  }

  @Patch('inventory/:id')
  @Roles(UserRole.OWNER)
  updateInventoryItem(
    @Param('id') id: string,
    @Req() req: { user: { userId: string } },
    @Body() updateInventoryItemDto: UpdateInventoryItemDto,
  ) {
    return this.itemService.updateInventoryItem(id, req.user.userId, updateInventoryItemDto);
  }

  @Delete('inventory/:id')
  @Roles(UserRole.OWNER)
  removeInventoryItem(
    @Param('id') id: string,
    @Req() req: { user: { userId: string } }
  ) {
    return this.itemService.removeInventoryItem(id, req.user.userId);
  }

  // ─────────────────────────────────────────────────────
  // SERVICES ENDPOINTS (Secção 6 — Services Editor)
  // ─────────────────────────────────────────────────────

  @Get('services/by-business')
  @Public()
  findServicesByBusiness(@Query('businessId') businessId: string) {
    return this.itemService.findServicesByBusiness(businessId);
  }

  @Post('services')
  @Roles(UserRole.OWNER)
  createService(
    @Req() req: { user: { userId: string } },
    @Body() createServiceDto: CreateServiceDto,
  ) {
    return this.itemService.createService(req.user.userId, createServiceDto);
  }

  @Patch('services/:id')
  @Roles(UserRole.OWNER)
  updateService(
    @Param('id') id: string,
    @Req() req: { user: { userId: string } },
    @Body() updateServiceDto: UpdateServiceDto,
  ) {
    return this.itemService.updateService(id, req.user.userId, updateServiceDto);
  }

  @Delete('services/:id')
  @Roles(UserRole.OWNER)
  removeService(
    @Param('id') id: string,
    @Req() req: { user: { userId: string } }
  ) {
    return this.itemService.removeService(id, req.user.userId);
  }

  // ─────────────────────────────────────────────────────
  // ROOMS ENDPOINTS (Secção 7 — Rooms Editor)
  // ─────────────────────────────────────────────────────

  @Get('rooms/by-business')
  @Public()
  findRoomsByBusiness(@Query('businessId') businessId: string) {
    return this.itemService.findRoomsByBusiness(businessId);
  }

  @Post('rooms')
  @Roles(UserRole.OWNER)
  createRoom(
    @Req() req: { user: { userId: string } },
    @Body() createRoomDto: CreateRoomDto,
  ) {
    return this.itemService.createRoom(req.user.userId, createRoomDto);
  }

  @Patch('rooms/:id')
  @Roles(UserRole.OWNER)
  updateRoom(
    @Param('id') id: string,
    @Req() req: { user: { userId: string } },
    @Body() updateRoomDto: UpdateRoomDto,
  ) {
    return this.itemService.updateRoom(id, req.user.userId, updateRoomDto);
  }

  @Delete('rooms/:id')
  @Roles(UserRole.OWNER)
  removeRoom(
    @Param('id') id: string,
    @Req() req: { user: { userId: string } }
  ) {
    return this.itemService.removeRoom(id, req.user.userId);
  }
}
