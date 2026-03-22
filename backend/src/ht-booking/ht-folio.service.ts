// backend/src/ht-booking/ht-folio.service.ts
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { HtFolioItemType, HtPaymentMethod } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export class AddFolioItemDto {
  @IsEnum(HtFolioItemType)
  type: HtFolioItemType;

  @IsString()
  @MaxLength(80)
  description: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0.01)
  unitPrice: number;
}

export class FinancialCheckoutDto {
  @IsEnum(HtPaymentMethod)
  paymentMethod: HtPaymentMethod;

  @IsOptional()
  @IsNumber()
  @Min(0)
  depositPaid?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  discountReason?: string;
}

@Injectable()
export class HtFolioService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Validar que a reserva pertence ao owner ──────────────────────────────
  private async assertOwner(bookingId: string, ownerId: string) {
    const booking = await this.prisma.htRoomBooking.findFirst({
      where: { id: bookingId, business: { ownerId } },
      include: {
        business: { select: { id: true, name: true } },
        room:     { select: { id: true, number: true } },
        user:     { select: { id: true, name: true, email: true } },
        folio:    {
          where:   { removedAt: null },
          orderBy: { addedAt: 'asc' },
        },
        guestProfile: {
          select: { documentType: true, documentNumber: true, nationality: true },
        },
        roomType: { select: { pricePerNight: true, name: true } },
      },
    });
    if (!booking) throw new ForbiddenException('Reserva não encontrada ou sem permissão.');
    return booking;
  }

  // ─── Listar folio completo ────────────────────────────────────────────────
  async getFolio(bookingId: string, ownerId: string) {
    const booking = await this.assertOwner(bookingId, ownerId);
    const nights = Math.max(1, Math.round(
      (new Date(booking.endDate).getTime() - new Date(booking.startDate).getTime()) / 86400000
    ));

    // Separar extras (minibar, room service, etc.) dos itens de alojamento já no folio
    const existingAccomItems = booking.folio.filter(i => i.type === 'ACCOMMODATION' && i.amount > 0 && !i.removedAt);
    const extraItems         = booking.folio.filter(i => i.type !== 'ACCOMMODATION' && !i.removedAt);
    const discountItems      = booking.folio.filter(i => i.amount < 0 && !i.removedAt);

    // Valor base de alojamento: pricePerNight × nights (guardado como totalPrice na reserva)
    // Os extras são cobrados adicionalmente
    const baseAccomPrice = booking.roomType
      ? (booking.roomType.pricePerNight ?? 0) * nights * (booking.rooms ?? 1)
      : (booking.totalPrice ?? 0);

    const extrasTotal = extraItems.reduce((s, i) => s + i.amount, 0);
    const discountsTotal = discountItems.reduce((s, i) => s + i.amount, 0); // negativo

    // Item virtual de alojamento (sempre mostrado, independente do estado do folio)
    const accomDisplayItem = {
      id:          '__accommodation__',
      type:        'ACCOMMODATION' as const,
      description: `Alojamento · ${nights} noite${nights !== 1 ? 's' : ''} · Quarto ${booking.room?.number ?? '—'}`,
      quantity:    nights,
      unitPrice:   baseAccomPrice / Math.max(nights, 1),
      amount:      baseAccomPrice,
      addedAt:     booking.startDate,
      removedAt:   null,
    };

    const displayItems = [accomDisplayItem, ...extraItems, ...discountItems];
    const totalPrice   = baseAccomPrice + extrasTotal + discountsTotal;
    const subtotal     = totalPrice;
    const paid         = booking.depositPaid ?? 0;

    return {
      booking: {
        id:            booking.id,
        guestName:     booking.guestName || booking.user?.name,
        room:          booking.room?.number,
        startDate:     booking.startDate,
        endDate:       booking.endDate,
        status:        booking.status,
        paymentStatus: booking.paymentStatus,
        paymentMethod: booking.paymentMethod,
        totalPrice,
        depositPaid:   paid,
        balance:       Math.max(0, totalPrice - paid),
      },
      items:   displayItems.filter(i => !i.removedAt),
      summary: {
        subtotal,
        totalPrice,
        depositPaid: paid,
        balance:     Math.max(0, totalPrice - paid),
      },
    };
  }

  // ─── Adicionar item ao folio ──────────────────────────────────────────────
  async addItem(bookingId: string, ownerId: string, dto: AddFolioItemDto) {
    const booking = await this.assertOwner(bookingId, ownerId);

    // [RULE] Lançamentos no folio só são permitidos quando o hóspede está fisicamente
    // presente no hotel (CHECKED_IN). Aceitar PENDING ou CONFIRMED permitiria cobrar
    // consumos a hóspedes que ainda não chegaram ou que nunca chegaram (no-show).
    if (booking.status !== 'CHECKED_IN') {
      const statusLabel: Record<string, string> = {
        PENDING:     'pendente (hóspede ainda não chegou)',
        CONFIRMED:   'confirmada (hóspede ainda não fez check-in)',
        CHECKED_OUT: 'encerrada (hóspede já saiu)',
        CANCELLED:   'cancelada',
        NO_SHOW:     'no-show',
      };
      const label = statusLabel[booking.status] ?? booking.status;
      throw new BadRequestException(
        `Não é possível lançar consumos: reserva ${label}. Só é possível em reservas com check-in activo.`
      );
    }

    const amount = dto.quantity * dto.unitPrice;

    const item = await this.prisma.$transaction(async (tx) => {
      const newItem = await tx.htFolioItem.create({
        data: {
          businessId:  booking.businessId,
          bookingId,
          type:        dto.type,
          description: dto.description,
          quantity:    dto.quantity,
          unitPrice:   dto.unitPrice,
          amount,
        },
      });
      // Recalcular totalPrice na reserva
      const folioItems = await tx.htFolioItem.findMany({
        where: { bookingId, removedAt: null },
      });
      const newTotal = folioItems.reduce((s, i) => s + i.amount, 0);
      await tx.htRoomBooking.update({
        where: { id: bookingId },
        data:  { totalPrice: newTotal, version: { increment: 1 } },
      });
      return newItem;
    });

    return item;
  }

  // ─── Remover item do folio (soft delete) ─────────────────────────────────
  async removeItem(bookingId: string, itemId: string, ownerId: string, reason?: string) {
    const booking = await this.assertOwner(bookingId, ownerId);
    if (booking.status === 'CHECKED_OUT') {
      throw new BadRequestException('Reserva já encerrada.');
    }
    const item = booking.folio.find(i => i.id === itemId);
    if (!item) throw new NotFoundException('Item não encontrado no folio.');
    if (item.type === 'ACCOMMODATION') {
      throw new BadRequestException('O item de alojamento não pode ser removido manualmente.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.htFolioItem.update({
        where: { id: itemId },
        data:  { removedAt: new Date(), removedById: ownerId, removeReason: reason },
      });
      const remaining = await tx.htFolioItem.findMany({
        where: { bookingId, removedAt: null },
      });
      const newTotal = remaining.reduce((s, i) => s + i.amount, 0);
      await tx.htRoomBooking.update({
        where: { id: bookingId },
        data:  { totalPrice: newTotal, version: { increment: 1 } },
      });
    });

    return { success: true };
  }

  // ─── Checkout financeiro — registar pagamento ─────────────────────────────
  async financialCheckout(bookingId: string, ownerId: string, dto: FinancialCheckoutDto) {
    const booking = await this.assertOwner(bookingId, ownerId);

    if (booking.status !== 'CHECKED_IN' && booking.status !== 'CHECKED_OUT') {
      throw new BadRequestException('Reserva não está em estado válido para checkout financeiro.');
    }

    const subtotal     = booking.folio.reduce((s, i) => s + i.amount, 0);
    const discount     = dto.discountAmount ?? 0;
    const finalTotal   = Math.max(0, subtotal - discount);
    const depositPaid  = dto.depositPaid ?? booking.depositPaid ?? 0;
    const balance      = Math.max(0, finalTotal - depositPaid);

    const updated = await this.prisma.$transaction(async (tx) => {
      // Aplicar desconto como item negativo se houver
      if (discount > 0) {
        await tx.htFolioItem.create({
          data: {
            businessId:  booking.businessId,
            bookingId,
            type:        'ACCOMMODATION',
            description: dto.discountReason || 'Desconto',
            quantity:    1,
            unitPrice:   -discount,
            amount:      -discount,
          },
        });
      }

      return tx.htRoomBooking.update({
        where: { id: bookingId },
        data: {
          totalPrice:    finalTotal,
          depositPaid:   depositPaid + balance, // marca como pago
          paymentStatus: 'PAID',
          paymentMethod: dto.paymentMethod,
          version:       { increment: 1 },
        },
        include: {
          folio:    { where: { removedAt: null }, orderBy: { addedAt: 'asc' } },
          room:     { select: { id: true, number: true } },
          business: { select: { id: true, name: true } },
          user:     { select: { id: true, name: true, email: true } },
        },
      });
    });

    // Buscar config PMS para dados fiscais (NIF, prefixo de fatura)
    const pmsConfig = await this.prisma.htPmsConfig.findUnique({
      where: { businessId: booking.businessId },
      select: { vatNumber: true, invoicePrefix: true },
    }).catch(() => null);

    // Gerar recibo
    const receipt = this.generateReceipt(updated, booking.folio, pmsConfig);
    return { booking: updated, receipt };
  }

  // ─── Gerar dados do recibo ────────────────────────────────────────────────
  private generateReceipt(booking: any, items: any[], pmsConfig?: { vatNumber?: string | null; invoicePrefix?: string | null } | null) {
    const nights = Math.max(1, Math.round(
      (new Date(booking.endDate).getTime() - new Date(booking.startDate).getTime()) / 86400000
    ));
    return {
      receiptNumber: `REC-${Date.now()}`,
      issuedAt:      new Date().toISOString(),
      business: {
        ...booking.business,
        vatNumber:     pmsConfig?.vatNumber     || null,
        invoicePrefix: pmsConfig?.invoicePrefix || null,
      },
      guest: {
        name:           booking.guestName  || booking.user?.name,
        email:          booking.user?.email,
        phone:          booking.guestPhone || null,
        documentType:   booking.guestProfile?.documentType   || null,
        documentNumber: booking.guestProfile?.documentNumber || null,
      },
      stay: {
        room:      booking.room?.number,
        startDate: booking.startDate,
        endDate:   booking.endDate,
        nights,
      },
      items: items.map(i => ({
        description: i.description,
        quantity:    i.quantity,
        unitPrice:   i.unitPrice,
        amount:      i.amount,
      })),
      summary: {
        total:         booking.totalPrice,
        depositPaid:   booking.depositPaid,
        balance:       0,
        paymentMethod: booking.paymentMethod,
        paymentStatus: booking.paymentStatus,
      },
    };
  }
}
