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
import { BusinessService } from './business.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessStatusDto } from './dto/update-business-status.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { UpdateBusinessInfoDto } from './dto/update-business-info.dto';
import { CreatePromoDto } from './dto/create-promo.dto';
import { UpdatePromoDto } from './dto/update-promo.dto';

@Controller(['business', 'businesses'])
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @Get()
  @Public()
  findAll() {
    return this.businessService.findAll();
  }

  @Get('search')
  @Public()
  search(
    @Query('latitude') latitude: string,
    @Query('longitude') longitude: string,
    @Query('radiusKm') radiusKm?: string,
  ) {
    return this.businessService.searchNearby({
      latitude,
      longitude,
      radiusKm,
    });
  }

  @Get(':id')
  @Public()
  findOne(@Param('id') id: string) {
    return this.businessService.findOne(id);
  }

  @Post()
  @Roles(UserRole.OWNER)
  create(@Req() req: { user: { userId: string } }, @Body() body: CreateBusinessDto) {
    return this.businessService.create(req.user.userId, body);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER)
  update(
    @Param('id') id: string,
    @Req() req: { user: { userId: string } },
    @Body() body: UpdateBusinessDto,
  ) {
    return this.businessService.update(id, req.user.userId, body);
  }

  @Patch(':id/status')
  @Roles(UserRole.OWNER)
  updateStatus(
    @Param('id') id: string,
    @Req() req: { user: { userId: string } },
    @Body() body: UpdateBusinessStatusDto,
  ) {
    return this.businessService.updateStatus(id, req.user.userId, body.isOpen);
  }

  @Patch(':id/info')
  @Roles(UserRole.OWNER)
  updateInfo(
    @Param('id') id: string,
    @Req() req: { user: { userId: string } },
    @Body() body: UpdateBusinessInfoDto,
  ) {
    return this.businessService.updateInfo(id, req.user.userId, body);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PROMOTIONS ENDPOINTS (Secção 11 — Promo Manager)
  // ─────────────────────────────────────────────────────────────────────────

  @Get(':businessId/promos')
  @Public()
  getPromosByBusiness(@Param('businessId') businessId: string) {
    return this.businessService.getPromosByBusiness(businessId);
  }

  @Post(':businessId/promos')
  @Roles(UserRole.OWNER)
  createPromo(
    @Req() req: { user: { userId: string } },
    @Param('businessId') businessId: string,
    @Body() body: CreatePromoDto,
  ) {
    return this.businessService.createPromo(businessId, req.user.userId, body);
  }

  @Patch('promos/:promoId')
  @Roles(UserRole.OWNER)
  updatePromo(
    @Req() req: { user: { userId: string } },
    @Param('promoId') promoId: string,
    @Body() body: UpdatePromoDto,
  ) {
    return this.businessService.updatePromo(promoId, req.user.userId, body);
  }

  @Delete('promos/:promoId')
  @Roles(UserRole.OWNER)
  deletePromo(
    @Req() req: { user: { userId: string } },
    @Param('promoId') promoId: string,
  ) {
    return this.businessService.deletePromo(promoId, req.user.userId);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER)
  remove(@Param('id') id: string, @Req() req: { user: { userId: string } }) {
    return this.businessService.remove(id, req.user.userId);
  }
}
