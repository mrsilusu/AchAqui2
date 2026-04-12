import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID } from 'crypto';
import { AppModule, HtStaffDepartment, StaffRole, User, UserRole } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up.dto';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  // In-memory store for password-reset tokens { tokenHash -> { userId, expiresAt } }
  private readonly resetTokens = new Map<string, { userId: string; expiresAt: Date }>();

  private readonly refreshTokenExpiresIn = '7d';

  private isSuspensionColumnMissing(error: unknown): boolean {
    if (!(error instanceof PrismaClientKnownRequestError)) return false;
    if (error.code === 'P2022' || error.code === 'P2021') return true;
    if (error.code === 'P2010') {
      const message = String((error.meta as { message?: string } | undefined)?.message ?? '');
      return (
        message.includes('isSuspended') ||
        message.includes('suspendedAt') ||
        message.includes('suspensionReason')
      );
    }
    return false;
  }

  private async findUserByEmailSafe(email: string) {
    try {
      return await this.prisma.user.findUnique({ where: { email } });
    } catch (error) {
      if (!this.isSuspensionColumnMissing(error)) throw error;
      const fallback = await this.prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          password: true,
          role: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return fallback ? ({ ...fallback, isSuspended: false } as User & { isSuspended: boolean }) : null;
    }
  }

  private async findUserByIdSafe(id: string) {
    try {
      return await this.prisma.user.findUnique({ where: { id } });
    } catch (error) {
      if (!this.isSuspensionColumnMissing(error)) throw error;
      const fallback = await this.prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          password: true,
          role: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return fallback ? ({ ...fallback, isSuspended: false } as User & { isSuspended: boolean }) : null;
    }
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private async getActiveStaffRoles(userId: string): Promise<Array<{ businessId: string; module: AppModule | null; role: StaffRole }>> {
    const rows = await this.prisma.coreBusinessStaff.findMany({
      where: { userId, revokedAt: null },
      select: { businessId: true, module: true, role: true },
    });
    return rows.map((row) => ({ businessId: row.businessId, module: row.module, role: row.role }));
  }

  private async getPrimaryHtStaffContext(userId: string): Promise<{
    businessId: string;
    staffRole: StaffRole;
    staffId: string;
    sectionAccess: Record<string, boolean>;
  } | null> {
    // 1ª tentativa: coreBusinessStaff (tabela unificada)
    const assignment = await this.prisma.coreBusinessStaff.findFirst({
      where: {
        userId,
        revokedAt: null,
        OR: [{ module: AppModule.HT }, { role: { in: [StaffRole.HT_MANAGER, StaffRole.HT_RECEPTIONIST, StaffRole.HT_HOUSEKEEPER] } }],
      },
      orderBy: { createdAt: 'asc' },
      select: { businessId: true, role: true },
    });

    if (assignment) {
      const htStaff = await this.prisma.htStaff.findFirst({
        where: { userId, businessId: assignment.businessId, isActive: true },
        select: { id: true, sectionOverrides: true, department: true },
      });
      if (htStaff?.id) {
        return {
          businessId: assignment.businessId,
          staffRole: assignment.role,
          staffId: htStaff.id,
          sectionAccess: this.buildHtSectionAccess(
            assignment.role,
            htStaff.department,
            htStaff.sectionOverrides as Record<string, string[]> | null | undefined,
          ),
        };
      }
    }

    // 2ª tentativa (fallback legado): ht_staff sem entrada em coreBusinessStaff
    const htStaffDirect = await this.prisma.htStaff.findFirst({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true, businessId: true, department: true, sectionOverrides: true },
    });

    if (!htStaffDirect) return null;

    const inferredRole: StaffRole =
      htStaffDirect.department === HtStaffDepartment.RECEPTION
        ? StaffRole.HT_RECEPTIONIST
        : htStaffDirect.department === HtStaffDepartment.MANAGEMENT
          ? StaffRole.HT_MANAGER
          : StaffRole.HT_HOUSEKEEPER;

    return {
      businessId: htStaffDirect.businessId,
      staffRole: inferredRole,
      staffId: htStaffDirect.id,
      sectionAccess: this.buildHtSectionAccess(
        inferredRole,
        htStaffDirect.department,
        htStaffDirect.sectionOverrides as Record<string, string[]> | null | undefined,
      ),
    };
  }

  private buildHtSectionAccess(
    staffRole: StaffRole,
    department: HtStaffDepartment,
    sectionOverrides?: Record<string, string[]> | null,
  ): Record<string, boolean> {
    const resolvedRole = staffRole || (
      department === HtStaffDepartment.RECEPTION
        ? StaffRole.HT_RECEPTIONIST
        : department === HtStaffDepartment.MANAGEMENT
          ? StaffRole.HT_MANAGER
          : StaffRole.HT_HOUSEKEEPER
    );

    const baseByRole: Record<string, Record<string, boolean>> = {
      [StaffRole.HT_HOUSEKEEPER]: {
        dashboard: false,
        reception: false,
        housekeeping: true,
        bookingsManager: false,
        staffManager: false,
        financials: false,
      },
      [StaffRole.HT_RECEPTIONIST]: {
        dashboard: true,
        reception: true,
        housekeeping: false,
        bookingsManager: true,
        staffManager: false,
        financials: false,
      },
      [StaffRole.HT_MANAGER]: {
        dashboard: true,
        reception: true,
        housekeeping: true,
        bookingsManager: true,
        staffManager: true,
        financials: true,
      },
      [StaffRole.GENERAL_MANAGER]: {
        dashboard: true,
        reception: true,
        housekeeping: true,
        bookingsManager: true,
        staffManager: true,
        financials: true,
      },
    };

    const merged = { ...(baseByRole[resolvedRole] ?? {}) };
    for (const [sectionKey, perms] of Object.entries(sectionOverrides || {})) {
      merged[sectionKey] = Array.isArray(perms) && perms.length > 0;
    }
    return merged;
  }

  private async createAccessToken(user: User) {
    const staffRoles = await this.getActiveStaffRoles(user.id);
    const primaryHtContext = await this.getPrimaryHtStaffContext(user.id);
    return this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        staffRoles,
        ...(primaryHtContext && {
          staffRole: primaryHtContext.staffRole,
          businessId: primaryHtContext.businessId,
          staffId: primaryHtContext.staffId,
          sectionAccess: primaryHtContext.sectionAccess,
        }),
      },
      {
        secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
        expiresIn: '1d',
      },
    );
  }

  private async createStaffAccessToken(params: {
    userId: string;
    email: string;
    staffRole?: StaffRole | null;
    businessId: string;
    staffId: string;
    sectionAccess?: Record<string, boolean>;
  }) {
    return this.jwtService.signAsync(
      {
        sub: params.userId,
        email: params.email,
        role: UserRole.STAFF,
        staffRole: params.staffRole ?? null,
        businessId: params.businessId,
        staffId: params.staffId,
        sectionAccess: params.sectionAccess ?? {},
      },
      {
        secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
        expiresIn: '8h',
      },
    );
  }

  private async createRefreshToken(user: User) {
    const tokenId = randomUUID();

    const refreshToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        tokenId,
        type: 'refresh',
      },
      {
        secret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-change-me',
        expiresIn: this.refreshTokenExpiresIn,
      },
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        tokenId,
        tokenHash: this.hashToken(refreshToken),
        userId: user.id,
        expiresAt,
      },
    });

    return refreshToken;
  }

  private async buildAuthResponse(user: User) {
    const accessToken = await this.createAccessToken(user);
    const refreshToken = await this.createRefreshToken(user);
    const staffRoles = await this.getActiveStaffRoles(user.id);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        staffRoles,
      },
    };
  }

  async signUp(signUpDto: SignUpDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: signUpDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email já está em uso.');
    }

    const hashedPassword = await bcrypt.hash(signUpDto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: signUpDto.email,
        password: hashedPassword,
        name: signUpDto.name,
        role: signUpDto.role ?? UserRole.CLIENT,
      },
    });

    return this.buildAuthResponse(user);
  }

  async signIn(signInDto: SignInDto) {
    const user = await this.findUserByEmailSafe(signInDto.email);

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const isPasswordValid = await bcrypt.compare(signInDto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    if (user.isSuspended) {
      throw new UnauthorizedException('Conta suspensa. Contacta o suporte.');
    }

    if (user.role === UserRole.STAFF) {
      const staffContext = await this.getPrimaryHtStaffContext(user.id);
      if (!staffContext) throw new UnauthorizedException('Conta de staff inactiva.');
      const accessToken = await this.createStaffAccessToken({
        userId: user.id,
        email: user.email,
        staffRole: staffContext.staffRole,
        businessId: staffContext.businessId,
        staffId: staffContext.staffId,
        sectionAccess: staffContext.sectionAccess,
      });
      const refreshToken = await this.createRefreshToken(user);
      const staffRoles = await this.getActiveStaffRoles(user.id);

      await this.prisma.coreAuditLog.create({
        data: {
          businessId: staffContext.businessId,
          module: 'HT' as any,
          action: 'CORE_STAFF_LOGIN' as any,
          actorId: user.id,
          resourceType: 'User',
          resourceId: user.id,
          newData: {
            staffRole: staffContext.staffRole,
            loginAt: new Date().toISOString(),
            _meta: {
              actorName: user.name,
              actorEmail: user.email,
              actorRole: staffContext.staffRole,
              note: 'Login de staff efectuado com sucesso.',
            },
          },
          note: 'Login de staff efectuado com sucesso.',
        },
      }).catch(() => {}); // silent — não bloquear login por falha de audit

      return {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          staffRoles,
          businessId: staffContext.businessId,
        },
      };
    }

    return this.buildAuthResponse(user);
  }

  async staffPinLogin(body: { businessId: string; pin: string }) {
    const businessId = String(body?.businessId || '').trim();
    const pin = String(body?.pin || '').trim();

    if (!businessId) throw new UnauthorizedException('Negócio inválido.');
    if (!/^\d{4,8}$/.test(pin)) throw new UnauthorizedException('PIN inválido.');

    const staffList = await this.prisma.htStaff.findMany({
      where: {
        businessId,
        isActive: true,
        pinHash: { not: null },
      },
      select: {
        id: true,
        userId: true,
        email: true,
        fullName: true,
        department: true,
        pinHash: true,
        sectionOverrides: true,
      },
    });

    let matchedStaff: typeof staffList[number] | null = null;
    for (const staff of staffList) {
      if (!staff.pinHash) continue;
      // eslint-disable-next-line no-await-in-loop
      const ok = await bcrypt.compare(pin, staff.pinHash);
      if (ok) {
        matchedStaff = staff;
        break;
      }
    }

    if (!matchedStaff || !matchedStaff.userId) {
      throw new UnauthorizedException('PIN inválido');
    }

    const staffRoleRow = await this.prisma.coreBusinessStaff.findFirst({
      where: {
        userId: matchedStaff.userId,
        businessId,
        module: AppModule.HT,
        revokedAt: null,
      },
      select: { role: true },
    });

    // Quando não existe entrada em coreBusinessStaff, infere o role a partir do department
    const staffRole: StaffRole = staffRoleRow?.role ?? (
      matchedStaff.department === HtStaffDepartment.RECEPTION
        ? StaffRole.HT_RECEPTIONIST
        : matchedStaff.department === HtStaffDepartment.MANAGEMENT
          ? StaffRole.HT_MANAGER
          : StaffRole.HT_HOUSEKEEPER
    );
    const staffSectionAccess = this.buildHtSectionAccess(
      staffRole,
      matchedStaff.department,
      matchedStaff.sectionOverrides as Record<string, string[]> | null | undefined,
    );
    const accessToken = await this.createStaffAccessToken({
      userId: matchedStaff.userId,
      email: matchedStaff.email,
      staffRole,
      businessId,
      staffId: matchedStaff.id,
      sectionAccess: staffSectionAccess,
    });

    return {
      accessToken,
      staff: {
        id: matchedStaff.id,
        userId: matchedStaff.userId,
        email: matchedStaff.email,
        fullName: matchedStaff.fullName,
        department: matchedStaff.department,
        staffRole,
        businessId,
      },
    };
  }

  async refresh(refreshTokenDto: RefreshTokenDto) {
    let payload: { sub: string; tokenId: string; type: string };

    try {
      payload = await this.jwtService.verifyAsync(refreshTokenDto.refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-change-me',
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido.');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Tipo de token inválido.');
    }

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenId: payload.tokenId },
    });

    if (
      !storedToken ||
      storedToken.userId !== payload.sub ||
      storedToken.revokedAt ||
      storedToken.expiresAt < new Date() ||
      storedToken.tokenHash !== this.hashToken(refreshTokenDto.refreshToken)
    ) {
      throw new UnauthorizedException('Refresh token inválido ou revogado.');
    }

    await this.prisma.refreshToken.update({
      where: { tokenId: payload.tokenId },
      data: { revokedAt: new Date() },
    });

    const user = await this.findUserByIdSafe(payload.sub);

    if (!user) {
      throw new UnauthorizedException('Utilizador não encontrado.');
    }

    if (user.isSuspended) {
      throw new UnauthorizedException('Conta suspensa.');
    }

    return this.buildAuthResponse(user);
  }

  async logout(refreshTokenDto: RefreshTokenDto) {
    let payload: { tokenId: string };

    try {
      payload = await this.jwtService.verifyAsync(refreshTokenDto.refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-change-me',
      });
    } catch {
      return { message: 'Sessão invalidada.' };
    }

    await this.prisma.refreshToken.updateMany({
      where: {
        tokenId: payload.tokenId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return { message: 'Sessão invalidada.' };
  }

  async me(userId: string) {
    let user: any;
    try {
      user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isSuspended: true,
          suspendedAt: true,
          createdAt: true,
          _count: {
            select: {
              htBookings: true,
              notifications: true,
              businesses: true,
            },
          },
        },
      });
    } catch (error) {
      if (!this.isSuspensionColumnMissing(error)) throw error;
      user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          _count: {
            select: {
              htBookings: true,
              notifications: true,
              businesses: true,
            },
          },
        },
      });
      if (user) user.isSuspended = false;
    }

    if (!user) {
      throw new UnauthorizedException('Utilizador não encontrado.');
    }

    if (user.isSuspended) {
      throw new UnauthorizedException('Conta suspensa.');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      staffRoles: await this.getActiveStaffRoles(user.id),
      createdAt: user.createdAt,
      stats: {
        bookings: user._count.htBookings,
        notifications: user._count.notifications,
        businesses: user._count.businesses,
      },
    };
  }

  async updateSettings(userId: string, settingsDto: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new UnauthorizedException('Utilizador não encontrado.');
    }

    // Store settings in a simple way (could be extended with a settings table)
    // For now, we'll just acknowledge the settings were received
    // In production, you might store these in a separate table or in user metadata
    return {
      id: user.id,
      message: 'Configurações actualizadas com sucesso.',
      settings: settingsDto,
    };
  }

  async updateProfile(userId: string, data: { name: string }) {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { name: data.name },
      select: { id: true, email: true, name: true, role: true },
    });
    return updated;
  }

  async forgotPassword(email: string) {
    // Always return success to avoid user enumeration
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user) {
      const rawToken = randomUUID();
      const tokenHash = this.hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Clean up any expired tokens for this user
      for (const [hash, entry] of this.resetTokens.entries()) {
        if (entry.userId === user.id || entry.expiresAt < new Date()) {
          this.resetTokens.delete(hash);
        }
      }

      this.resetTokens.set(tokenHash, { userId: user.id, expiresAt });

      const appUrl = process.env.APP_URL ?? 'https://achaqui.app';
      const resetLink = `${appUrl}/reset-password?token=${rawToken}`;

      await this.mailService.sendPasswordResetEmail({ to: email, resetLink }).catch(() => {
        // Silent fail — email service may not be configured in dev
      });
    }
    return { message: 'Se existir uma conta com este email, receberás um link para redefinir a senha.' };
  }
}
