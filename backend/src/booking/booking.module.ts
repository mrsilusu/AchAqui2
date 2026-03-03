import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module';
import { MailModule } from '../mail/mail.module';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';

@Module({
	imports: [EventsModule, MailModule],
	controllers: [BookingController],
	providers: [BookingService],
})
export class BookingModule {}
