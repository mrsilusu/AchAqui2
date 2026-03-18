import { Module } from '@nestjs/common';
import { HtBookingController } from './ht-booking.controller';
import { HtBookingService }    from './ht-booking.service';
import { HtDashboardService }  from './ht-dashboard.service';
import { HtFolioService }      from './ht-folio.service';
import { HtRoomsController }   from './ht-rooms.controller';
import { HtRoomsService }      from './ht-rooms.service';
import { HtGuestController }   from './ht-guest.controller';
import { HtGuestService }      from './ht-guest.service';
import { HtStaffController }   from './ht-staff.controller';
import { HtStaffService }      from './ht-staff.service';
import { EventsModule }        from '../events/events.module';
import { PrismaModule }        from '../prisma/prisma.module';

@Module({
  imports:     [PrismaModule, EventsModule],
  controllers: [HtBookingController, HtRoomsController, HtGuestController, HtStaffController],
  providers:   [HtBookingService, HtDashboardService, HtFolioService, HtRoomsService, HtGuestService, HtStaffService],
  exports:     [HtBookingService, HtDashboardService, HtFolioService, HtRoomsService, HtGuestService, HtStaffService],
})
export class HtBookingModule {}
