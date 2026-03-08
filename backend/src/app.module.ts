import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { join, resolve } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { AnalyticsModule } from './analytics/analytics.module';
import { BusinessModule } from './business/business.module';
import { BookingModule } from './booking/booking.module';
import { EventsModule } from './events/events.module';
import { ItemModule } from './item/item.module';
import { MailModule } from './mail/mail.module';
import { MediaModule } from './media/media.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OperatingHoursModule } from './operating-hours/operating-hours.module';
import { PrismaModule } from './prisma/prisma.module';
import { ClaimModule } from './claim/claim.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        resolve(process.cwd(), '.env'),
        resolve(process.cwd(), 'backend/.env'),
        join(__dirname, '../.env'),
      ],
    }),
    AuthModule,
    AnalyticsModule,
    BusinessModule,
    BookingModule,
    EventsModule,
    ItemModule,
    MailModule,
    MediaModule,
    NotificationsModule,
    OperatingHoursModule,
    PrismaModule,
    ClaimModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
