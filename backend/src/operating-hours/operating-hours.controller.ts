import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateOperatingHourDto } from './dto/create-operating-hour.dto';
import { UpdateOperatingHourDto } from './dto/update-operating-hour.dto';
import { OperatingHoursService } from './operating-hours.service';

@Controller('business/:businessId/operating-hours')
export class OperatingHoursController {
  constructor(private readonly operatingHoursService: OperatingHoursService) {}

  @Get()
  @Public()
  findAllByBusiness(@Param('businessId') businessId: string) {
    return this.operatingHoursService.findAllByBusiness(businessId);
  }

  @Get(':id')
  @Public()
  findOne(@Param('businessId') businessId: string, @Param('id') id: string) {
    return this.operatingHoursService.findOne(businessId, id);
  }

  @Post()
  @Roles(UserRole.OWNER)
  create(
    @Param('businessId') businessId: string,
    @Req() req: { user: { userId: string } },
    @Body() createOperatingHourDto: CreateOperatingHourDto,
  ) {
    return this.operatingHoursService.create(
      businessId,
      req.user.userId,
      createOperatingHourDto,
    );
  }

  @Patch(':id')
  @Roles(UserRole.OWNER)
  update(
    @Param('businessId') businessId: string,
    @Param('id') id: string,
    @Req() req: { user: { userId: string } },
    @Body() updateOperatingHourDto: UpdateOperatingHourDto,
  ) {
    return this.operatingHoursService.update(
      businessId,
      id,
      req.user.userId,
      updateOperatingHourDto,
    );
  }

  @Delete(':id')
  @Roles(UserRole.OWNER)
  remove(
    @Param('businessId') businessId: string,
    @Param('id') id: string,
    @Req() req: { user: { userId: string } },
  ) {
    return this.operatingHoursService.remove(businessId, id, req.user.userId);
  }
}
