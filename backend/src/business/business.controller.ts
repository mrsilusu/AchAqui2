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
import { BusinessService } from './business.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';

@Controller(['business', 'businesses'])
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @Get()
  @Public()
  findAll() {
    return this.businessService.findAll();
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

  @Delete(':id')
  @Roles(UserRole.OWNER)
  remove(@Param('id') id: string, @Req() req: { user: { userId: string } }) {
    return this.businessService.remove(id, req.user.userId);
  }
}
