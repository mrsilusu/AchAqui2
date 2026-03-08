import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClaimStatus } from '@prisma/client';
import { CreateClaimRequestDto } from './dto/create-claim-request.dto';

@Injectable()
export class ClaimService {
  constructor(private readonly prisma: PrismaService) {}

  async submitClaim(businessId: string, userId: string, dto: CreateClaimRequestDto) {
    // Verify business exists
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      throw new NotFoundException('Negócio não encontrado.');
    }

    // Business already claimed by this user or another
    if (business.isClaimed && business.ownerId === userId) {
      throw new ConflictException('Já és o dono deste negócio.');
    }

    if (business.isClaimed && business.ownerId !== userId) {
      throw new ConflictException('Este negócio já foi reclamado por outro utilizador.');
    }

    // Check for existing PENDING or APPROVED claim from this user
    const existing = await this.prisma.claimRequest.findFirst({
      where: {
        businessId,
        userId,
        status: { in: ['PENDING', 'APPROVED'] },
      },
    });

    if (existing) {
      throw new ConflictException(
        existing.status === 'PENDING'
          ? 'Já tens um pedido de claim pendente para este negócio.'
          : 'O teu pedido de claim para este negócio já foi aprovado.',
      );
    }

    return this.prisma.claimRequest.create({
      data: {
        businessId,
        userId,
        evidence: dto.evidence,
        status: ClaimStatus.PENDING,
      },
      include: {
        business: {
          select: { id: true, name: true, category: true },
        },
      },
    });
  }

  async getMyClaims(userId: string) {
    return this.prisma.claimRequest.findMany({
      where: { userId },
      include: {
        business: {
          select: { id: true, name: true, category: true, description: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async cancelClaim(claimId: string, userId: string) {
    const claim = await this.prisma.claimRequest.findFirst({
      where: { id: claimId, userId },
    });

    if (!claim) {
      throw new NotFoundException('Pedido de claim não encontrado.');
    }

    if (claim.status !== ClaimStatus.PENDING) {
      throw new BadRequestException('Só é possível cancelar claims pendentes.');
    }

    return this.prisma.claimRequest.delete({
      where: { id: claimId },
    });
  }
}
