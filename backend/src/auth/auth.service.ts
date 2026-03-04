import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID } from 'crypto';
import { User, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private readonly refreshTokenExpiresIn = '7d';

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private async createAccessToken(user: User) {
    return this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
      },
      {
        secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
        expiresIn: '1d',
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

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
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
    const user = await this.prisma.user.findUnique({
      where: { email: signInDto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const isPasswordValid = await bcrypt.compare(signInDto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    return this.buildAuthResponse(user);
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

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('Utilizador não encontrado.');
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
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            bookings: true,
            notifications: true,
            businesses: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Utilizador não encontrado.');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
      stats: {
        bookings: user._count.bookings,
        notifications: user._count.notifications,
        businesses: user._count.businesses,
      },
    };
  }
}
