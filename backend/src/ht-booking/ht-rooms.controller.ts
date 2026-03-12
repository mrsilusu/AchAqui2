import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { HtRoomsService } from './ht-rooms.service';

@UseGuards(ThrottlerGuard)
@Roles(UserRole.OWNER)
@Controller('ht/rooms')
export class HtRoomsController {
  constructor(private readonly s: HtRoomsService) {}

  @Get()
  getAll(@Query('businessId') bId: string, @Req() req: any) {
    return this.s.getAll(bId, req.user.userId);
  }

  @Post()
  create(@Body() body: any, @Req() req: any) {
    return this.s.create(req.user.userId, body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.s.update(id, req.user.userId, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.s.remove(id, req.user.userId);
  }
}
