import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { ImportService } from '../import/import.service';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [AdminController],
  providers: [AdminService, ImportService],
  exports: [AdminService],
})
export class AdminModule {}