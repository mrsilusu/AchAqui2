import { Module } from '@nestjs/common';
import { HtBookingController } from './ht-booking.controller';
import { HtBookingService } from './ht-booking.service';
import { EventsModule } from '../events/events.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, EventsModule],
  controllers: [HtBookingController],
  providers: [HtBookingService],
  exports: [HtBookingService],
})
export class HtBookingModule {}
