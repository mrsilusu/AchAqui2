import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppModule, StaffRole, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { STAFF_ACCESS_KEY, StaffAccessOptions } from '../decorators/staff-access.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  private async resolveBusinessId(request: any): Promise<string | null> {
    const directBusinessId =
      request?.query?.businessId ||
      request?.body?.businessId ||
      request?.params?.businessId ||
      request?.user?.businessId ||
      null;
    if (directBusinessId) return String(directBusinessId);

    const bookingId = request?.params?.bookingId || request?.body?.bookingId || null;
    if (bookingId) {
      const booking = await this.prisma.htRoomBooking.findUnique({
        where: { id: String(bookingId) },
        select: { businessId: true },
      });
      if (booking?.businessId) return booking.businessId;
    }

    const roomId = request?.params?.roomId || null;
    if (roomId) {
      const room = await this.prisma.htRoom.findUnique({
        where: { id: String(roomId) },
        select: { businessId: true },
      });
      if (room?.businessId) return room.businessId;
    }

    const taskId = request?.params?.taskId || (String(request?.route?.path || '').includes('housekeeping') ? request?.params?.id : null);
    if (taskId) {
      const task = await this.prisma.htHousekeepingTask.findUnique({
        where: { id: String(taskId) },
        select: { room: { select: { businessId: true } } },
      });
      if (task?.room?.businessId) return task.room.businessId;
    }

    const genericId = request?.params?.id || null;
    const routePath = String(request?.route?.path || '');
    if (!genericId) return null;

    if (routePath.includes('bookings')) {
      const booking = await this.prisma.htRoomBooking.findUnique({
        where: { id: String(genericId) },
        select: { businessId: true },
      });
      if (booking?.businessId) return booking.businessId;
    }

    if (routePath.includes('rooms')) {
      const room = await this.prisma.htRoom.findUnique({
        where: { id: String(genericId) },
        select: { businessId: true },
      });
      if (room?.businessId) return room.businessId;
    }

    if (routePath.includes('guests')) {
      const guest = await this.prisma.htGuestProfile.findUnique({
        where: { id: String(genericId) },
        select: { businessId: true },
      });
      if (guest?.businessId) return guest.businessId;
    }

    if (routePath.includes('staff')) {
      const staff = await this.prisma.coreBusinessStaff.findUnique({
        where: { id: String(genericId) },
        select: { businessId: true },
      });
      if (staff?.businessId) return staff.businessId;
    }

    return null;
  }

  private async hasStaffAccess(
    userId: string,
    businessId: string,
    module: AppModule,
    allowedRoles?: StaffRole[],
  ): Promise<boolean> {
    const roleFilter = allowedRoles?.length
      ? { in: allowedRoles }
      : { startsWith: `${module}_` };

    const assignment = await this.prisma.coreBusinessStaff.findFirst({
      where: {
        businessId,
        userId,
        revokedAt: null,
        OR: [
          { role: StaffRole.GENERAL_MANAGER },
          {
            role: roleFilter as any,
            OR: [{ module }, { module: null }],
          },
        ],
      },
      select: { id: true },
    });

    return !!assignment;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const staffAccess = this.reflector.getAllAndOverride<StaffAccessOptions>(STAFF_ACCESS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if ((!requiredRoles || requiredRoles.length === 0) && !staffAccess) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userRole: UserRole | undefined = request.user?.role;
    const userId: string | undefined = request.user?.userId;

    if (requiredRoles?.length && userRole && requiredRoles.includes(userRole)) {
      return true;
    }

    // STAFF tokens with businessId in JWT can access via StaffAccess decorator
    if (staffAccess && userId) {
      const businessId = await this.resolveBusinessId(request);
      if (!businessId) {
        throw new ForbiddenException('Sem businessId para validar permissões de staff.');
      }
      const allowed = await this.hasStaffAccess(userId, businessId, staffAccess.module, staffAccess.roles);
      if (allowed) return true;
    }

    // STAFF role with staffId in JWT: allow access to their own business's HT endpoints
    if (userRole === UserRole.STAFF && request.user?.staffId && request.user?.businessId) {
      const jwtBusinessId = request.user.businessId;
      const reqBusinessId =
        request?.query?.businessId ||
        request?.body?.businessId ||
        request?.params?.businessId;
      if (!reqBusinessId || reqBusinessId === jwtBusinessId) {
        return true;
      }
    }

    throw new ForbiddenException('Sem permissão para esta ação.');
  }
}
