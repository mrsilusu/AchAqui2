// backend/src/ht-booking/ht-booking.controller.ts
import { Body, Controller, Delete, Get, Ip, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { HtBookingService } from './ht-booking.service';
import { HtIcalService }    from './ht-ical.service';
import { HtDashboardService } from './ht-dashboard.service';
import { HtFolioService, AddFolioItemDto, FinancialCheckoutDto } from './ht-folio.service';
import { CheckInDto } from './dto/check-in.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';

@UseGuards(ThrottlerGuard)
@Roles(UserRole.OWNER)
@Controller('ht')
export class HtBookingController {
  constructor(
    private readonly htBookingService:  HtBookingService,
    private readonly htDashboardService: HtDashboardService,
    private readonly htFolioService:     HtFolioService,
    private readonly htIcalService:      HtIcalService,
  ) {}

  // ─── Dashboard ────────────────────────────────────────────────────────────
  @Get('dashboard')
  getDashboard(@Query('businessId') businessId: string, @Req() req: any) {
    return this.htDashboardService.getDashboard(businessId, req.user.userId);
  }

  // ─── Receção ──────────────────────────────────────────────────────────────
  @Get('bookings/arrivals')
  getArrivals(@Query('businessId') businessId: string, @Req() req: any) {
    return this.htBookingService.getTodayArrivals(businessId, req.user.userId);
  }

  @Get('bookings/departures')
  getDepartures(@Query('businessId') businessId: string, @Req() req: any) {
    return this.htBookingService.getTodayDepartures(businessId, req.user.userId);
  }

  @Get('bookings/guests')
  getCurrentGuests(@Query('businessId') businessId: string, @Req() req: any) {
    return this.htBookingService.getCurrentGuests(businessId, req.user.userId);
  }

  @Patch('bookings/:id/checkin')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  checkIn(@Param('id') id: string, @Body() dto: CheckInDto, @Req() req: any, @Ip() ip: string) {
    return this.htBookingService.checkIn(id, req.user.userId, dto, ip);
  }

  @Patch('bookings/:id/checkout')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  checkOut(@Param('id') id: string, @Req() req: any, @Ip() ip: string) {
    return this.htBookingService.checkOut(id, req.user.userId, ip);
  }

  @Patch('bookings/:id/noshow')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  noShow(@Param('id') id: string, @Req() req: any, @Ip() ip: string) {
    return this.htBookingService.markNoShow(id, req.user.userId, ip);
  }

  @Patch('bookings/:id/postpone')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  postponeBooking(
    @Param('id') id: string,
    @Req() req: any,
    @Ip() ip: string,
  ) {
    return this.htBookingService.postponeBooking(id, req.user.userId, ip);
  }

  @Patch('bookings/:id/cancel')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  cancelBooking(@Param('id') id: string, @Body() dto: CancelBookingDto, @Req() req: any, @Ip() ip: string) {
    return this.htBookingService.cancel(id, req.user.userId, dto, ip);
  }

  // ─── iCal Sync (backend) ─────────────────────────────────────────────────────
  @Post('ical/sync')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  syncIcal(@Query('businessId') businessId: string, @Req() req: any) {
    return this.htIcalService.syncForBusiness(businessId, req.user.userId);
  }

  // ─── Mapa de Reservas ────────────────────────────────────────────────────────
  @Get('map')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  getMap(
    @Query('businessId') businessId: string,
    @Query('from') from: string,
    @Query('to')   to:   string,
    @Req() req: any,
  ) {
    const f = from ? new Date(from) : (() => { const d = new Date(); d.setDate(1); return d; })();
    const t = to   ? new Date(to)   : (() => { const d = new Date(); d.setMonth(d.getMonth()+1,0); return d; })();
    return this.htDashboardService.getBookingsForMap(businessId, req.user.userId, f, t);
  }

  // ─── Prolongar estadia / Alterar quarto ─────────────────────────────────────
  @Patch('bookings/:id/extend')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  extendStay(
    @Param('id') id: string,
    @Body() body: { newEndDate: string },
    @Req() req: any,
    @Ip() ip: string,
  ) {
    return this.htBookingService.extendStay(id, req.user.userId, body.newEndDate, ip);
  }

  @Patch('bookings/:id/change-room')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  changeRoom(
    @Param('id') id: string,
    @Body() body: { newRoomId: string },
    @Req() req: any,
    @Ip() ip: string,
  ) {
    return this.htBookingService.changeRoom(id, req.user.userId, body.newRoomId, ip);
  }

  // ─── Housekeeping ────────────────────────────────────────────────────────────
  @Patch('housekeeping/:id/complete')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async completeHousekeepingTask(@Param('id') id: string, @Req() req: any) {
    // Verificar que a tarefa pertence a um quarto do owner
    const task = await this.htDashboardService.completeTask(id, req.user.userId);
    return task;
  }

  @Patch('housekeeping/rooms/:roomId/approve')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  approveHousekeepingInspection(@Param('roomId') roomId: string, @Req() req: any) {
    return this.htDashboardService.approveInspection(roomId, req.user.userId);
  }

  // ─── Folio (Sprint 3) ─────────────────────────────────────────────────────
  @Get('bookings/:id/folio')
  getFolio(@Param('id') id: string, @Req() req: any) {
    return this.htFolioService.getFolio(id, req.user.userId);
  }

  @Post('bookings/:id/folio')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  addFolioItem(@Param('id') id: string, @Body() dto: AddFolioItemDto, @Req() req: any) {
    return this.htFolioService.addItem(id, req.user.userId, dto);
  }

  @Delete('bookings/:bookingId/folio/:itemId')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  removeFolioItem(
    @Param('bookingId') bookingId: string,
    @Param('itemId')    itemId: string,
    @Req()              req: any,
    @Body()             body: { reason?: string },
  ) {
    return this.htFolioService.removeItem(bookingId, itemId, req.user.userId, body?.reason);
  }

  @Post('bookings/:id/financial-checkout')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  financialCheckout(@Param('id') id: string, @Body() dto: FinancialCheckoutDto, @Req() req: any) {
    return this.htFolioService.financialCheckout(id, req.user.userId, dto);
  }
}
