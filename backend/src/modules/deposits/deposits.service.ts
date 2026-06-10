import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DepositStatus, DepositTransactionType,
  LedgerEntryType, LedgerDirection, User, UserRole,
} from '@prisma/client';
import { Decimal } from 'decimal.js';
import {
  CreateDepositDto, RecordDepositPaymentDto, AdminValidateDepositDto,
  UseDepositDto, RefundDepositDto,
} from './dto/deposit.dto';
import { LedgerService } from '../ledger/ledger.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditActions } from '../../common/constants/audit-actions';
import { EntityTypes } from '../../common/constants/entity-types';

/** Montant standard minimum selon le barème (R-05, D-13) */
const STANDARD_DEPOSIT_MINIMUM = new Decimal(50000); // 50 000 FCFA
const STANDARD_DEPOSIT_DAYS = 2; // 2 jours de recette

const DEPOSIT_INCLUDE = {
  contract: {
    select: {
      id: true, type: true, dailyAmount: true, status: true,
      vehicle: { select: { id: true, plateNumber: true } },
    },
  },
  transactions: { orderBy: { createdAt: 'desc' as const } },
};

@Injectable()
export class DepositsService {
  private readonly logger = new Logger(DepositsService.name);

  constructor(
    private prisma: PrismaService,
    private ledgerService: LedgerService,
    private auditService: AuditService,
    private notificationsService: NotificationsService,
  ) {}

  // ─── Lecture ───────────────────────────────────────────────────────────────

  /** IDOR — MANAGER ne voit que les cautions des contrats de son périmètre */
  private async assertManagerContractScope(contractId: string, requestingUser?: User) {
    if (requestingUser?.role !== UserRole.MANAGER) return;
    const contract = await this.prisma.contract.findFirst({
      where: { id: contractId, managerId: requestingUser.id },
      select: { id: true },
    });
    if (!contract) {
      throw new ForbiddenException('Accès refusé — cette caution est hors de votre périmètre');
    }
  }

  async findByContract(contractId: string, requestingUser?: User) {
    await this.assertManagerContractScope(contractId, requestingUser);
    const deposit = await this.prisma.deposit.findFirst({
      where: { contractId },
      include: DEPOSIT_INCLUDE,
    });
    if (!deposit) throw new NotFoundException(`Caution pour contrat ${contractId} introuvable`);
    return deposit;
  }

  async findById(id: string, requestingUser?: User) {
    const deposit = await this.prisma.deposit.findFirst({ where: { id }, include: DEPOSIT_INCLUDE });
    if (!deposit) throw new NotFoundException(`Caution ${id} introuvable`);
    await this.assertManagerContractScope(deposit.contractId, requestingUser);
    return deposit;
  }

  // ─── Création ──────────────────────────────────────────────────────────────

  /**
   * Crée une caution pour un contrat.
   * - Calcule le montant recommandé : max(2 × dailyAmount, 50 000 FCFA)
   * - Si requestedAmount ≠ recommandé → isStandardAmount = false → Admin requis (D-13)
   *
   * Un contrat ne peut avoir qu'une seule caution (@unique contractId).
   */
  async create(dto: CreateDepositDto, actor: User) {
    const contract = await this.prisma.contract.findFirst({
      where: { id: dto.contractId },
      select: { id: true, dailyAmount: true, status: true },
    });
    if (!contract) throw new NotFoundException(`Contrat ${dto.contractId} introuvable`);

    // Vérifier qu'il n'existe pas déjà une caution
    const existing = await this.prisma.deposit.findFirst({ where: { contractId: dto.contractId } });
    if (existing) {
      throw new ConflictException(`Une caution existe déjà pour ce contrat (id: ${existing.id})`);
    }

    const dailyAmount = new Decimal(contract.dailyAmount.toString());
    const recommendedAmount = Decimal.max(
      dailyAmount.mul(STANDARD_DEPOSIT_DAYS),
      STANDARD_DEPOSIT_MINIMUM,
    );
    const requestedAmount = new Decimal(dto.requestedAmount);

    // Tolérance ±1 FCFA pour éviter les problèmes d'arrondi
    const isStandard = requestedAmount.minus(recommendedAmount).abs().lte(1);

    const deposit = await this.prisma.deposit.create({
      data: {
        contractId: dto.contractId,
        recommendedAmount,
        requestedAmount,
        remainingAmount: requestedAmount,
        isStandardAmount: isStandard,
        proposedById: actor.id,
        notes: dto.notes,
      },
      include: DEPOSIT_INCLUDE,
    });

    await this.auditService.log({
      action: AuditActions.DEPOSIT_CREATED,
      actorId: actor.id,
      entityType: EntityTypes.DEPOSIT,
      entityId: deposit.id,
      metadata: {
        contractId: dto.contractId,
        requestedAmount: dto.requestedAmount,
        recommendedAmount: recommendedAmount.toString(),
        isStandardAmount: isStandard,
      },
    });

    // Si hors-barème : notifier l'Admin (D-13)
    if (!isStandard) {
      this.logger.warn(
        `Caution hors-barème créée pour contrat ${dto.contractId}: ${requestedAmount} vs recommandé ${recommendedAmount}`,
      );
      await this.notificationsService
        .send({
          userId: actor.id, // TODO: broadcaster à tous les Admins en Phase 3-B
          type: 'DEPOSIT_VALIDATION_REQUIRED' as any,
          title: 'Caution hors-barème à valider',
          message: `Caution de ${requestedAmount} FCFA (barème: ${recommendedAmount} FCFA) — validation Admin requise`,
          priority: 'HIGH' as any,
          entityType: EntityTypes.DEPOSIT,
          entityId: deposit.id,
        })
        .catch(() => {});
    }

    return deposit;
  }

  // ─── Validation Admin (montant hors-barème) ────────────────────────────────

  /**
   * Admin valide un montant non-standard (D-13).
   * Seul un Admin peut appeler cette action.
   */
  async adminValidate(id: string, dto: AdminValidateDepositDto, actor: User) {
    const deposit = await this.findById(id);

    if (deposit.isStandardAmount) {
      throw new BadRequestException('Cette caution est déjà au barème standard — aucune validation Admin nécessaire');
    }
    if (deposit.validatedAmount !== null) {
      throw new BadRequestException('Cette caution a déjà été validée par un Admin');
    }

    const validatedAmount = new Decimal(dto.validatedAmount);

    const updated = await this.prisma.deposit.update({
      where: { id },
      data: {
        validatedAmount,
        remainingAmount: validatedAmount,
        adminValidatedById: actor.id,
        validatedAt: new Date(),
        notes: dto.notes ?? deposit.notes,
      },
      include: DEPOSIT_INCLUDE,
    });

    await this.auditService.log({
      action: AuditActions.DEPOSIT_VALIDATED,
      actorId: actor.id,
      entityType: EntityTypes.DEPOSIT,
      entityId: id,
      metadata: {
        validatedAmount: dto.validatedAmount,
        contractId: deposit.contractId,
      },
    });

    return updated;
  }

  // ─── Paiement caution ──────────────────────────────────────────────────────

  /**
   * Enregistre un paiement (total ou partiel) de la caution.
   * Statuts : PENDING → PARTIAL → PAID
   *
   * Quand la caution est intégralement payée (PAID),
   * le contrat peut être activé (R-05 : depositPaid = true).
   */
  async recordPayment(id: string, dto: RecordDepositPaymentDto, actor: User) {
    const deposit = await this.findById(id);

    // IDOR — MANAGER ne peut encaisser que les cautions de ses contrats
    await this.assertManagerContractScope(deposit.contractId, actor);

    if (deposit.status === DepositStatus.PAID) {
      throw new BadRequestException('La caution est déjà intégralement payée');
    }
    if (deposit.status === DepositStatus.REFUNDED) {
      throw new BadRequestException('La caution a été remboursée');
    }

    // Si hors-barème et non validé par Admin → bloquer
    if (!deposit.isStandardAmount && deposit.validatedAmount === null) {
      throw new BadRequestException(
        'Caution hors-barème : attendez la validation Admin avant d\'enregistrer un paiement',
      );
    }

    const effectiveAmount = deposit.validatedAmount
      ? new Decimal(deposit.validatedAmount.toString())
      : new Decimal(deposit.requestedAmount.toString());
    const currentPaid = new Decimal(deposit.paidAmount.toString());
    const payment = new Decimal(dto.amount);

    if (payment.lte(0)) throw new BadRequestException('Le montant doit être supérieur à 0');
    if (currentPaid.plus(payment).gt(effectiveAmount)) {
      throw new BadRequestException(
        `Paiement trop élevé. Restant à payer: ${effectiveAmount.minus(currentPaid)} FCFA`,
      );
    }

    const newPaid = currentPaid.plus(payment);
    const newRemaining = effectiveAmount.minus(newPaid);
    const isFullyPaid = newPaid.gte(effectiveAmount);
    const newStatus: DepositStatus = isFullyPaid ? DepositStatus.PAID : DepositStatus.PARTIAL;

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Mettre à jour le dépôt
      const updatedDeposit = await tx.deposit.update({
        where: { id },
        data: {
          paidAmount: newPaid,
          remainingAmount: newRemaining,
          status: newStatus,
        },
        include: DEPOSIT_INCLUDE,
      });

      // 2. Enregistrer la transaction
      await tx.depositTransaction.create({
        data: {
          depositId: id,
          type: DepositTransactionType.PAYMENT,
          amount: payment,
          description: `Paiement caution — ${dto.notes ?? ''}`,
          reference: dto.reference,
          createdById: actor.id,
        },
      });

      // 3. Si caution entièrement payée → mettre à jour depositPaid sur le contrat
      if (isFullyPaid) {
        await tx.contract.update({
          where: { id: deposit.contractId },
          data: { depositPaid: true },
        });
        this.logger.log(`Caution ${id} entièrement payée — contrat ${deposit.contractId} prêt pour activation`);
      }

      return updatedDeposit;
    });

    // 4. Ledger
    await this.ledgerService.createEntry({
      contractId: deposit.contractId,
      entryType: LedgerEntryType.DEPOSIT_PAYMENT,
      direction: LedgerDirection.CREDIT,
      amount: dto.amount,
      currency: 'XOF',
      description: `Paiement caution ${isFullyPaid ? '(soldé)' : '(partiel)'}`,
      entityType: EntityTypes.DEPOSIT,
      entityId: id,
      actorId: actor.id,
    });

    // 5. Audit
    await this.auditService.log({
      action: AuditActions.DEPOSIT_PAID,
      actorId: actor.id,
      entityType: EntityTypes.DEPOSIT,
      entityId: id,
      metadata: {
        amount: dto.amount,
        totalPaid: newPaid.toString(),
        isFullyPaid,
        contractId: deposit.contractId,
      },
    });

    return result;
  }

  // ─── Usage caution ─────────────────────────────────────────────────────────

  /**
   * Utilise tout ou partie de la caution (R-07 : toujours justifié).
   * Status PAID → USED (si tout utilisé) ou reste PAID (si partiel).
   */
  async useDeposit(id: string, dto: UseDepositDto, actor: User) {
    const deposit = await this.findById(id);

    if (deposit.status !== DepositStatus.PAID && deposit.status !== DepositStatus.PARTIAL) {
      throw new BadRequestException(`Impossible d'utiliser une caution en statut ${deposit.status}`);
    }

    const usage = new Decimal(dto.amount);
    const currentRemaining = new Decimal(deposit.remainingAmount.toString());

    if (usage.gt(currentRemaining)) {
      throw new BadRequestException(
        `Usage trop élevé. Solde disponible: ${currentRemaining} FCFA`,
      );
    }

    const newUsed = new Decimal(deposit.usedAmount.toString()).plus(usage);
    const newRemaining = currentRemaining.minus(usage);
    const isFullyUsed = newRemaining.lte(0);

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedDeposit = await tx.deposit.update({
        where: { id },
        data: {
          usedAmount: newUsed,
          remainingAmount: newRemaining,
          status: isFullyUsed ? DepositStatus.USED : DepositStatus.PAID,
        },
        include: DEPOSIT_INCLUDE,
      });

      await tx.depositTransaction.create({
        data: {
          depositId: id,
          type: DepositTransactionType.USAGE,
          amount: usage,
          description: dto.description,
          createdById: actor.id,
        },
      });

      return updatedDeposit;
    });

    await this.ledgerService.createEntry({
      contractId: deposit.contractId,
      entryType: LedgerEntryType.DEPOSIT_USAGE,
      direction: LedgerDirection.DEBIT,
      amount: dto.amount,
      currency: 'XOF',
      description: `Usage caution — ${dto.description}`,
      entityType: EntityTypes.DEPOSIT,
      entityId: id,
      actorId: actor.id,
    });

    await this.auditService.log({
      action: AuditActions.DEPOSIT_USED,
      actorId: actor.id,
      entityType: EntityTypes.DEPOSIT,
      entityId: id,
      metadata: { amount: dto.amount, description: dto.description, chargeId: dto.chargeId },
    });

    return updated;
  }

  // ─── Remboursement caution ─────────────────────────────────────────────────

  /**
   * Rembourse la caution après COMPLETED ou TERMINATED (R-06).
   * Status → REFUNDED ou PARTIAL_REFUNDED selon le montant restant.
   */
  async refund(id: string, dto: RefundDepositDto, actor: User) {
    const deposit = await this.findById(id);

    // Vérifier que le contrat est terminé (R-06)
    const contract = await this.prisma.contract.findFirst({
      where: { id: deposit.contractId },
      select: { status: true },
    });
    if (!contract) throw new NotFoundException('Contrat introuvable');
    if (!['COMPLETED', 'TERMINATED'].includes(contract.status)) {
      throw new BadRequestException('La caution ne peut être remboursée qu\'après COMPLETED ou TERMINATED (R-06)');
    }

    const refund = new Decimal(dto.amount);
    const currentRemaining = new Decimal(deposit.remainingAmount.toString());

    if (refund.gt(currentRemaining)) {
      throw new BadRequestException(
        `Remboursement trop élevé. Solde disponible: ${currentRemaining} FCFA`,
      );
    }

    const newRefunded = new Decimal(deposit.refundedAmount.toString()).plus(refund);
    const newRemaining = currentRemaining.minus(refund);
    const isFullyRefunded = newRemaining.lte(0);

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedDeposit = await tx.deposit.update({
        where: { id },
        data: {
          refundedAmount: newRefunded,
          remainingAmount: newRemaining,
          status: isFullyRefunded ? DepositStatus.REFUNDED : DepositStatus.PARTIAL_REFUNDED,
        },
        include: DEPOSIT_INCLUDE,
      });

      await tx.depositTransaction.create({
        data: {
          depositId: id,
          type: DepositTransactionType.REFUND,
          amount: refund,
          description: dto.notes ?? 'Remboursement caution',
          createdById: actor.id,
        },
      });

      return updatedDeposit;
    });

    await this.ledgerService.createEntry({
      contractId: deposit.contractId,
      entryType: LedgerEntryType.DEPOSIT_REFUND,
      direction: LedgerDirection.DEBIT,
      amount: dto.amount,
      currency: 'XOF',
      description: `Remboursement caution ${isFullyRefunded ? '(total)' : '(partiel)'}`,
      entityType: EntityTypes.DEPOSIT,
      entityId: id,
      actorId: actor.id,
    });

    await this.auditService.log({
      action: AuditActions.DEPOSIT_REFUNDED,
      actorId: actor.id,
      entityType: EntityTypes.DEPOSIT,
      entityId: id,
      metadata: {
        amount: dto.amount,
        isFullyRefunded,
        contractId: deposit.contractId,
      },
    });

    return updated;
  }
}
