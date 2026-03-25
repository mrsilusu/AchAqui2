import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { UserRole } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'dev-secret-change-me',
    });
  }

  async validate(payload: JwtPayload) {
    let user: { id: string; isSuspended?: boolean } | null;

    try {
      user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, isSuspended: true },
      });
    } catch (error) {
      const isMissingSuspensionColumn =
        error instanceof PrismaClientKnownRequestError &&
        (error.code === 'P2022' || error.code === 'P2021' || error.code === 'P2010');

      if (!isMissingSuspensionColumn) throw error;

      user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true },
      });
    }

    if (!user || user.isSuspended) {
      throw new UnauthorizedException('Conta suspensa ou inválida.');
    }

    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
