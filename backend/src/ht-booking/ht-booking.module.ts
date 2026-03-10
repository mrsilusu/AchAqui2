// backend/src/ht-booking/ht-booking.module.ts
import { Module } from '@nestjs/common';
import { HtBookingController } from './ht-booking.controller';
import { HtBookingService } from './ht-booking.service';
import { HtDashboardService } from './ht-dashboard.service';
import { HtFolioService } from './ht-folio.service';
import { EventsModule } from '../events/events.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports:     [PrismaModule, EventsModule],
  controllers: [HtBookingController],
  providers:   [HtBookingService, HtDashboardService, HtFolioService],
  exports:     [HtBookingService, HtDashboardService, HtFolioService],
})
export class HtBookingModule {}
