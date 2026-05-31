import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ContractStatus, LedgerEntryType, LedgerDirection, PaymentStatus, User } from '@prisma/client';
import { Decimal } from 'decimal.js';
import { CreatePaymentDto, RejectPaymentDto, PaymentFiltersDto } from './dto/payment.dto';
import { DailyEntriesService } from '../daily-entries/daily-entries.service';
import { LedgerService } from '../ledger/ledger.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditActions } from '../../common/constants/audit-actions';
import { EntityTypes } from '../../common/constants/entity-types';

const PAYMENT_INCLUDE = {
  contract: { select: { id: true, type: true, dailyAmount: true, validatedDays: true, targetDays: true } },
  vehicle: { select: { id: true, plateNumber: true, brand: true, model: true } },
  driver: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
  createdBy: { select: { id: true, firstName: true, lastName: true, role: true } },
  dailyEntries: { select: { id: true, date: true, status: true, paidAmount: true } },
};

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private dailyEntriesService: DailyEntriesService,
    private ledgerService: LedgerService,
    private auditService: AuditService,
    private notificationsService: NotificationsService,
  ) {}

  // ─── Lecture ───────────────────────────────────────────────────────────────

  async findAll(filters: PaymentFiltersDto, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters.contractId) where.contractId = filters.contractId;
    if (filters.vehicleId) where.vehicleId = filters.vehicleId;
    if (filters.driverId) where.driverId = filters.driverId;
    if (filters.from || filters.to) {
      where.paidAt = {};
      if (filters.from) where.paidAt.gte = new Date(filters.from);
      if (filters.to) where.paidAt.lte = new Date(filters.to);
    }

    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        include: PAYMENT_INCLUDE,
        orderBy: { paidAt: 'desc' },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return { data, meta: { page, limit, total } };
  }

  async findById(id: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id },
      include: PAYMENT_INCLUDE,
    });
    if (!payment) throw new NotFoundException(`Paiement ${id} introuvable`);
    return payment;
  }

  // ─── Enregistrement paiement ───────────────────────────────────────────────

  /**
   * Enregistre un paiement manuel et alloue automatiquement les DailyEntry.
   *
   * Règles (Phase 3-A points 2 & 3) :
   * - Paiement exact  → 1 jour VALIDATED
   * - Paiement sup.   → N jours VALIDATED + reliquat PARTIALLY_PAID
   * - Paiement inf.   → 1 jour PARTIALLY_PAID
   *
   * Toute l'opération est dans une transaction Prisma (règle 12).
   */
  async recordPayment(dto: CreatePaymentDto, actor: User) {
    const amount = new Decimal(dto.amount);
    const paidAt = new Date(dto.paidAt);

    // Pré-validations hors transaction
    const contract = await this.prisma.contract.findFirst({
      where: { id: dto.contractId },
      select: {
        id: true, type: true, status: true, dailyAmount: true,
        validatedDays: true, targetDays: true, driverId: true, vehicleId: true,
      },
    });
    if (!contract) throw new NotFoundException(`Contrat ${dto.contractId} introuvable`);

    if (contract.status !== ContractStatus.ACTIVE) {
      throw new BadRequestException(
        `Impossible d'enregistrer un paiement sur un contrat ${contract.status}`,
      );
    }
    if (amount.lte(0)) {
      throw new BadRequestException('Le montant doit être supérieur à 0');
    }

    // Transaction : paiement + DailyEntry + Ledger + Audit
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Créer le paiement
      const payment = await tx.payment.create({
        data: {
          contractId: dto.contractId,
          vehicleId: dto.vehicleId,
          driverId: dto.driverId,
          amount,
          source: dto.source,
          status: PaymentStatus.VALIDATED,
          paidAt,
          reference: dto.reference,
          notes: dto.notes,
          createdById: actor.id,
        },
      });

      // 2. Allouer sur les DailyEntry (moteur de progression)
      const allocation = await this.dailyEntriesService.allocatePaymentToEntries(
        tx as any,
        dto.contractId,
        dto.vehicleId,
        dto.driverId,
        payment.id,
        amount,
        paidAt,
      );

      // 3. Mettre à jour validatedDaysCount sur le paiement
      await tx.payment.update({
        where: { id: payment.id },
        data: { validatedDaysCount: allocation.validatedCount },
      });

      return { payment, allocation };
    });

    // 3bis. Générer les prochaines entrées en avance (fire-and-forget)
    // Garantit que 30 jours UNPAID existent toujours devant le chauffeur (Gap 1)
    if (!result.allocation.contractCompleted) {
      this.dailyEntriesService
        .ensureEntriesAhead(dto.contractId, 30)
        .catch((err) => this.logger.warn(`ensureEntriesAhead failed: ${err?.message}`));
    }

    // 4. Ledger (fire-and-forget — hors transaction : ne jamais bloquer le paiement)
    await this.ledgerService.createEntry({
      contractId: dto.contractId,
      vehicleId: dto.vehicleId,
      entryType: LedgerEntryType.DAILY_REVENUE,
      direction: LedgerDirection.CREDIT,
      amount: dto.amount,
      currency: 'XOF',
      description: `Paiement manuel — ${result.allocation.validatedCount} jour(s) validé(s)`,
      entityType: EntityTypes.PAYMENT,
      entityId: result.payment.id,
      actorId: actor.id,
    });

    // 5. Audit
    await this.auditService.log({
      action: AuditActions.PAYMENT_RECORDED,
      actorId: actor.id,
      entityType: EntityTypes.PAYMENT,
      entityId: result.payment.id,
      metadata: {
        contractId: dto.contractId,
        amount: dto.amount,
        validatedDays: result.allocation.validatedCount,
        partialDays: result.allocation.partialCount,
      },
    });

    // 6. Notifications chauffeur
    const notifType = result.allocation.validatedCount > 0 ? 'PAYMENT_RECEIVED' : 'PAYMENT_INCOMPLETE';
    const notifMsg =
      result.allocation.validatedCount > 0
        ? `${result.allocation.validatedCount} jour(s) validé(s) — ${dto.amount} FCFA`
        : `Paiement partiel de ${dto.amount} FCFA enregistré`;

    await this.notificationsService
      .send({
        userId: dto.driverId,
        type: notifType as any,
        title: result.allocation.validatedCount > 0 ? 'Paiement enregistré' : 'Paiement partiel reçu',
        message: notifMsg,
        priority: (result.allocation.validatedCount > 0 ? 'NORMAL' : 'LOW') as any,
        entityType: EntityTypes.PAYMENT,
        entityId: result.payment.id,
      })
      .catch(() => {});

    return this.findById(result.payment.id);
  }

  // ─── Rejet paiement ────────────────────────────────────────────────────────

  /**
   * Rejette un paiement (Super Manager / Admin).
   * Note : les DailyEntry ne sont pas réversées automatiquement.
   * Toute correction nécessite un audit manuel.
   */
  async rejectPayment(id: string, dto: RejectPaymentDto, actor: User) {
    const payment = await this.findById(id);

    if (payment.status === PaymentStatus.REJECTED) {
      throw new BadRequestException('Ce paiement est déjà rejeté');
    }

    const updated = await this.prisma.payment.update({
      where: { id },
      data: { status: PaymentStatus.REJECTED, notes: dto.reason },
      include: PAYMENT_INCLUDE,
    });

    await this.auditService.log({
      action: AuditActions.PAYMENT_REJECTED,
      actorId: actor.id,
      entityType: EntityTypes.PAYMENT,
      entityId: id,
      metadata: { reason: dto.reason, amount: payment.amount },
    });

    return updated;
  }
}
