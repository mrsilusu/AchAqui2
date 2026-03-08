import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClaimRequestDto } from './dto/create-claim-request.dto';

@Injectable()
export class ClaimService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Dono submete pedido de claim para um negócio.
   * Regras:
   *  - Negócio tem de existir
   *  - Negócio não pode já estar reclamado por outro dono
   *  - User não pode ter já um pedido pendente para o mesmo negócio
   */
  async submitClaim(userId: string, businessId: string, dto: CreateClaimRequestDto) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, name: true, isClaimed: true, ownerId: true },
    });

    if (!business) {
      throw new NotFoundException('Estabelecimento não encontrado.');
    }

    // Se já está reclamado pelo próprio user, não precisa de novo pedido
    if (business.isClaimed && business.ownerId === userId) {
      throw new ConflictException('Este estabelecimento já te pertence.');
    }

    // Se está reclamado por outro dono, não permite
    if (business.isClaimed && business.ownerId !== userId) {
      throw new ConflictException(
        'Este estabelecimento já foi reclamado por outro proprietário.',
      );
    }

    // Verificar pedido duplicado
    const existing = await this.prisma.claimRequest.findUnique({
      where: { businessId_userId: { businessId, userId } },
      select: { id: true, status: true },
    });

    if (existing) {
      if (existing.status === 'PENDING') {
        throw new ConflictException(
          'Já tens um pedido de claim pendente para este estabelecimento.',
        );
      }
      if (existing.status === 'APPROVED') {
        throw new ConflictException('O teu claim já foi aprovado.');
      }
      // Se foi rejeitado, permite tentar novamente — actualiza o pedido existente
      return this.prisma.claimRequest.update({
        where: { id: existing.id },
        data: {
          status: 'PENDING',
          evidence: dto.evidence,
          adminNote: null,
          reviewedAt: null,
          reviewedBy: null,
          updatedAt: new Date(),
        },
      });
    }

    return this.prisma.claimRequest.create({
      data: {
        businessId,
        userId,
        evidence: dto.evidence,
      },
    });
  }

  /**
   * Dono vê os seus próprios pedidos de claim.
   */
  findByUser(userId: string) {
    return this.prisma.claimRequest.findMany({
      where: { userId },
      include: {
        business: {
          select: { id: true, name: true, category: true, isClaimed: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
