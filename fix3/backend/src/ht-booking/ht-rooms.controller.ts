// backend/src/ht-booking/ht-rooms.controller.ts
import {
  Body, Controller, Delete, Get,
  Param, Patch, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { HtRoomsService } from './ht-rooms.service';

@UseGuards(ThrottlerGuard)
@Roles(UserRole.OWNER)
@Controller('ht/rooms')
export class HtRoomsController {
  constructor(private readonly htRoomsService: HtRoomsService) {}

  /** GET /ht/rooms?businessId= — lista todos os quartos físicos */
  @Get()
  getAll(@Query('businessId') businessId: string, @Req() req: any) {
    return this.htRoomsService.getAll(businessId, req.user.userId);
  }

  /** POST /ht/rooms — criar quarto físico individual */
  @Post()
  create(@Body() body: any, @Req() req: any) {
    return this.htRoomsService.create(req.user.userId, body);
  }

  /** PATCH /ht/rooms/:id — editar número, piso, notas ou estado */
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.htRoomsService.update(id, req.user.userId, body);
  }

  /** DELETE /ht/rooms/:id — remover quarto (sem reservas activas) */
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.htRoomsService.remove(id, req.user.userId);
  }
}
