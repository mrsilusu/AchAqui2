// backend/src/ht-booking/ht-rooms.controller.ts
// Endpoint auxiliar para gerir HtRoom físicos
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { HtRoomsService } from './ht-rooms.service';

@UseGuards(ThrottlerGuard)
@Roles(UserRole.OWNER)
@Controller('ht/rooms')
export class HtRoomsController {
  constructor(private readonly htRoomsService: HtRoomsService) {}

  /** Lista todos os quartos físicos do negócio */
  @Get()
  getAll(@Query('businessId') businessId: string, @Req() req: any) {
    return this.htRoomsService.getAll(businessId, req.user.userId);
  }

  /** Gera HtRooms a partir dos HtRoomTypes existentes (migração/seed) */
  @Post('seed')
  seed(@Body() body: { businessId: string }, @Req() req: any) {
    return this.htRoomsService.seedFromRoomTypes(body.businessId, req.user.userId);
  }

  /** Actualiza estado de um quarto (housekeeping) */
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
    @Req() req: any,
  ) {
    return this.htRoomsService.updateStatus(id, body.status, req.user.userId);
  }
}
