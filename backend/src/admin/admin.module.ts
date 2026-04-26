import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { ImportService } from '../import/import.service';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    MediaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
    }),
  ],
  controllers: [AdminController],
  providers: [AdminService, ImportService],
  exports: [AdminService],
})
export class AdminModule {}