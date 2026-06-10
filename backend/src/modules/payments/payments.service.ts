import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ContractStatus, DayStatus, LedgerEntryType, LedgerDirection,
  PaymentStatus, User, UserRole, VehicleStatus,
} from '@prisma/client';
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

  async findAll(filters: PaymentFiltersDto, page = 1, limit = 20, requestingUser?: User) {
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

    // H-03 : MANAGER ne voit que les paiements de ses contrats.
    // SUPER_MANAGER et ADMIN accèdent à tous les paiements.
    if (requestingUser?.role === UserRole.MANAGER) {
      where.contract = { managerId: requestingUser.id };
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

  async findById(id: string, requestingUser?: User) {
    const payment = await this.prisma.payment.findFirst({
      where: { id },
      include: PAYMENT_INCLUDE,
    });
    if (!payment) throw new NotFoundException(`Paiement ${id} introuvable`);

    // H-03 / IDOR — MANAGER ne voit que les paiements de ses contrats
    if (requestingUser?.role === UserRole.MANAGER) {
      const contract = await this.prisma.contract.findFirst({
        where: { id: payment.contractId, managerId: requestingUser.id },
        select: { id: true },
      });
      if (!contract) {
        throw new ForbiddenException('Accès refusé — ce paiement est hors de votre périmètre');
      }
    }
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
        managerId: true,
      },
    });
    if (!contract) throw new NotFoundException(`Contrat ${dto.contractId} introuvable`);

    // IDOR — MANAGER ne peut enregistrer un paiement que sur ses contrats
    if (actor.role === UserRole.MANAGER && contract.managerId !== actor.id) {
      throw new ForbiddenException('Accès refusé — ce contrat est hors de votre périmètre');
    }

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
    // C-02 : dto.driverId est un Driver.id (entity PK), pas un User.id.
    // NotificationsService.send() attend un User.id → résolution obligatoire.
    const driverForNotif = await this.prisma.driver.findFirst({
      where: { id: dto.driverId },
      select: { userId: true },
    });

    if (driverForNotif?.userId) {
      const notifType = result.allocation.validatedCount > 0 ? 'PAYMENT_RECEIVED' : 'PAYMENT_INCOMPLETE';
      const notifMsg =
        result.allocation.validatedCount > 0
          ? `${result.allocation.validatedCount} jour(s) validé(s) — ${dto.amount} FCFA`
          : `Paiement partiel de ${dto.amount} FCFA enregistré`;

      await this.notificationsService
        .send({
          userId: driverForNotif.userId,
          type: notifType as any,
          title: result.allocation.validatedCount > 0 ? 'Paiement enregistré' : 'Paiement partiel reçu',
          message: notifMsg,
          priority: (result.allocation.validatedCount > 0 ? 'NORMAL' : 'LOW') as any,
          entityType: EntityTypes.PAYMENT,
          entityId: result.payment.id,
        })
        .catch(() => {});
    } else {
      this.logger.warn(`C-02: Driver ${dto.driverId} sans userId — notification ignorée`);
    }

    return this.findById(result.payment.id);
  }

  // ─── Rejet paiement ────────────────────────────────────────────────────────

  /**
   * Rejette un paiement et inverse l'impact sur les DailyEntry liées (C-01).
   *
   * Rollback atomique (transaction) :
   *   1. Payment.status → REJECTED
   *   2. DailyEntry concernées → UNPAID (paidAmount = 0, paymentId = null)
   *   3. Contract.validatedDays decremented du nombre de jours validés annulés
   *   4. Si le contrat était COMPLETED et repasse < targetDays → restore ACTIVE
   *      + vehicle.status → ASSIGNED (currentContractId / currentDriverId restaurés)
   */
  async rejectPayment(id: string, dto: RejectPaymentDto, actor: User) {
    // Charger le paiement avec les entrées et le contrat nécessaires au rollback
    const payment = await this.prisma.payment.findFirst({
      where: { id },
      include: {
        dailyEntries: { select: { id: true, status: true } },
        contract: {
          select: {
            id: true, type: true, status: true,
            validatedDays: true, targetDays: true,
            vehicleId: true, driverId: true,
          },
        },
        vehicle: { select: { id: true, plateNumber: true, brand: true, model: true } },
        driver: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
        createdBy: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    });
    if (!payment) throw new NotFoundException(`Paiement ${id} introuvable`);

    if (payment.status === PaymentStatus.REJECTED) {
      throw new BadRequestException('Ce paiement est déjà rejeté');
    }

    const contract = payment.contract;
    if (!contract) throw new BadRequestException('Contrat manquant sur ce paiement — rollback impossible');

    // Identifier les entrées à inverser
    const entriesToRevert = (payment.dailyEntries ?? []).filter(
      (e) => e.status === DayStatus.VALIDATED || e.status === DayStatus.PARTIALLY_PAID,
    );
    const validatedEntryCount = entriesToRevert.filter((e) => e.status === DayStatus.VALIDATED).length;
    const entryIdsToRevert = entriesToRevert.map((e) => e.id);

    await this.prisma.$transaction(async (tx) => {
      // 1. Rejeter le paiement
      await tx.payment.update({
        where: { id },
        data: { status: PaymentStatus.REJECTED, notes: dto.reason },
      });

      // 2. Inverser les DailyEntry — toutes repassent UNPAID, paidAmount remis à zéro
      if (entryIdsToRevert.length > 0) {
        await tx.dailyEntry.updateMany({
          where: { id: { in: entryIdsToRevert } },
          data: {
            status: DayStatus.UNPAID,
            paidAmount: null,
            paymentId: null,
            validatedAt: null,
          },
        });
      }

      // 3. Décrémenter contract.validatedDays du nombre de jours validés annulés
      if (validatedEntryCount > 0) {
        await tx.contract.update({
          where: { id: contract.id },
          data: { validatedDays: { decrement: validatedEntryCount } },
        });
      }

      // 4. Si le contrat était COMPLETED et repasse en dessous de targetDays
      //    après décrémentation → restaurer ACTIVE + véhicule ASSIGNED
      const newValidatedDays = (contract.validatedDays ?? 0) - validatedEntryCount;
      const targetDays = contract.targetDays ?? 0;

      if (
        contract.status === ContractStatus.COMPLETED &&
        validatedEntryCount > 0 &&
        newValidatedDays < targetDays
      ) {
        await tx.contract.update({
          where: { id: contract.id },
          data: { status: ContractStatus.ACTIVE, closedAt: null },
        });
        if (contract.vehicleId) {
          await tx.vehicle.update({
            where: { id: contract.vehicleId },
            data: {
              status: VehicleStatus.ASSIGNED,
              currentContractId: contract.id,
              currentDriverId: contract.driverId ?? null,
            },
          });
        }
      }
    });

    await this.auditService.log({
      action: AuditActions.PAYMENT_ROLLED_BACK,
      actorId: actor.id,
      entityType: EntityTypes.PAYMENT,
      entityId: id,
      afterJson: {
        reason: dto.reason,
        amount: payment.amount?.toString(),
        entriesReverted: entryIdsToRevert.length,
        validatedDaysDecremented: validatedEntryCount,
        contractWasCompleted: contract.status === ContractStatus.COMPLETED,
      },
    });

    return this.findById(id);
  }
}
