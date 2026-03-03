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
}
