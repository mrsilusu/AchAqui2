// backend/src/ht-booking/ht-booking.module.ts
import { Module } from '@nestjs/common';
import { HtBookingController } from './ht-booking.controller';
import { HtBookingService }    from './ht-booking.service';
import { HtDashboardService }  from './ht-dashboard.service';
import { HtFolioService }      from './ht-folio.service';
import { HtRoomsController }   from './ht-rooms.controller';
import { HtRoomsService }      from './ht-rooms.service';
import { EventsModule }        from '../events/events.module';
import { PrismaModule }        from '../prisma/prisma.module';

@Module({
  imports:     [PrismaModule, EventsModule],
  controllers: [HtBookingController, HtRoomsController],
  providers:   [HtBookingService, HtDashboardService, HtFolioService, HtRoomsService],
  exports:     [HtBookingService, HtDashboardService, HtFolioService, HtRoomsService],
})
export class HtBookingModule {}
