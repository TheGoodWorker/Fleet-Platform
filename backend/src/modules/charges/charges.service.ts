import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ChargeStatus, LedgerEntryType, LedgerDirection, User, UserRole } from '@prisma/client';
import { Decimal } from 'decimal.js';
import {
  CreateChargeDto, ValidateChargeDto, RejectChargeDto,
  AddToContractDto, ChargeFiltersDto,
} from './dto/charge.dto';
import { DailyEntriesService } from '../daily-entries/daily-entries.service';
import { LedgerService } from '../ledger/ledger.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditActions } from '../../common/constants/audit-actions';
import { EntityTypes } from '../../common/constants/entity-types';

const CHARGE_INCLUDE = {
  vehicle: { select: { id: true, plateNumber: true, brand: true, model: true } },
  contract: { select: { id: true, type: true, dailyAmount: true, status: true } },
  driver: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
  validatedBy: { select: { id: true, firstName: true, lastName: true } },
};

@Injectable()
export class ChargesService {
  private readonly logger = new Logger(ChargesService.name);

  constructor(
    private prisma: PrismaService,
    private dailyEntriesService: DailyEntriesService,
    private ledgerService: LedgerService,
    private auditService: AuditService,
    private notificationsService: NotificationsService,
  ) {}

  // ─── Lecture ───────────────────────────────────────────────────────────────

  async findAll(filters: ChargeFiltersDto, page = 1, limit = 20, requestingUser?: User) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters.vehicleId) where.vehicleId = filters.vehicleId;
    if (filters.contractId) where.contractId = filters.contractId;
    if (filters.driverId) where.driverId = filters.driverId;
    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;

    // IDOR — MANAGER ne voit que les charges des véhicules de son périmètre
    if (requestingUser?.role === UserRole.MANAGER) {
      where.vehicle = { currentManagerId: requestingUser.id };
    }

    const [data, total] = await Promise.all([
      this.prisma.charge.findMany({
        where, skip, take: limit, include: CHARGE_INCLUDE, orderBy: { createdAt: 'desc' },
      }),
      this.prisma.charge.count({ where }),
    ]);

    return { data, meta: { page, limit, total } };
  }

  async findById(id: string, requestingUser?: User) {
    const charge = await this.prisma.charge.findFirst({ where: { id }, include: CHARGE_INCLUDE });
    if (!charge) throw new NotFoundException(`Charge ${id} introuvable`);

    // IDOR — MANAGER ne voit que les charges des véhicules de son périmètre
    if (requestingUser?.role === UserRole.MANAGER) {
      const vehicle = await this.prisma.vehicle.findFirst({
        where: { id: charge.vehicleId, currentManagerId: requestingUser.id },
        select: { id: true },
      });
      if (!vehicle) {
        throw new ForbiddenException('Accès refusé — cette charge est hors de votre périmètre');
      }
    }
    return charge;
  }

  // ─── Création ──────────────────────────────────────────────────────────────

  async create(dto: CreateChargeDto, actor: User) {
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id: dto.vehicleId } });
    if (!vehicle) throw new NotFoundException('Véhicule introuvable');

    const charge = await this.prisma.charge.create({
      data: {
        type: dto.type,
        amount: new Decimal(dto.amount),
        vehicleId: dto.vehicleId,
        contractId: dto.contractId,
        driverId: dto.driverId,
        proposedResponsible: dto.proposedResponsible,
        description: dto.description,
        notes: dto.notes,
        incidentId: dto.incidentId,
        createdById: actor.id,
        status: ChargeStatus.DRAFT,
      },
      include: CHARGE_INCLUDE,
    });

    await this.auditService.log({
      action: AuditActions.CHARGE_CREATED,
      actorId: actor.id,
      entityType: EntityTypes.CHARGE,
      entityId: charge.id,
      metadata: { type: dto.type, amount: dto.amount, vehicleId: dto.vehicleId },
    });

    return charge;
  }

  // ─── Workflow ──────────────────────────────────────────────────────────────

  /**
   * Manager soumet la charge pour validation (DRAFT → PENDING_VALIDATION)
   */
  async submit(id: string, actor: User) {
    const charge = await this.findById(id);

    if (charge.status !== ChargeStatus.DRAFT) {
      throw new BadRequestException(`Seule une charge DRAFT peut être soumise (statut actuel: ${charge.status})`);
    }

    // Seul le créateur ou un Manager+ peut soumettre
    if (actor.role === UserRole.MANAGER && charge.createdById !== actor.id) {
      throw new ForbiddenException('Vous ne pouvez soumettre que vos propres charges');
    }

    const updated = await this.prisma.charge.update({
      where: { id },
      data: { status: ChargeStatus.PENDING_VALIDATION },
      include: CHARGE_INCLUDE,
    });

    // Notifier les Super Managers
    await this.notificationsService
      .send({
        userId: actor.id, // sera remplacé par une diffusion en Phase 3-B
        type: 'CHARGE_PENDING_VALIDATION' as any,
        title: 'Charge à valider',
        message: `Charge ${charge.type} de ${charge.amount} FCFA soumise par ${actor.firstName}`,
        priority: 'NORMAL' as any,
        entityType: EntityTypes.CHARGE,
        entityId: id,
      })
      .catch(() => {});

    return updated;
  }

  /**
   * Super Manager valide la charge (PENDING_VALIDATION → VALIDATED)
   */
  async validate(id: string, dto: ValidateChargeDto, actor: User) {
    const charge = await this.findById(id);

    if (charge.status !== ChargeStatus.PENDING_VALIDATION) {
      throw new BadRequestException(
        `Seule une charge PENDING_VALIDATION peut être validée (statut actuel: ${charge.status})`,
      );
    }

    const updated = await this.prisma.charge.update({
      where: { id },
      data: {
        status: ChargeStatus.VALIDATED,
        validatedResponsible: dto.validatedResponsible,
        validatedById: actor.id,
        validatedAt: new Date(),
        notes: dto.notes ?? charge.notes,
      },
      include: CHARGE_INCLUDE,
    });

    await this.auditService.log({
      action: AuditActions.CHARGE_VALIDATED,
      actorId: actor.id,
      entityType: EntityTypes.CHARGE,
      entityId: id,
      metadata: {
        validatedResponsible: dto.validatedResponsible,
        amount: charge.amount,
        type: charge.type,
      },
    });

    // Notifier le manager créateur
    await this.notificationsService
      .send({
        userId: charge.createdById,
        type: 'CHARGE_VALIDATED' as any,
        title: 'Charge validée',
        message: `Charge ${charge.type} de ${charge.amount} FCFA validée`,
        priority: 'NORMAL' as any,
        entityType: EntityTypes.CHARGE,
        entityId: id,
      })
      .catch(() => {});

    return updated;
  }

  /**
   * Super Manager rejette la charge (PENDING_VALIDATION → REJECTED)
   */
  async reject(id: string, dto: RejectChargeDto, actor: User) {
    const charge = await this.findById(id);

    if (charge.status !== ChargeStatus.PENDING_VALIDATION) {
      throw new BadRequestException(
        `Seule une charge PENDING_VALIDATION peut être rejetée (statut actuel: ${charge.status})`,
      );
    }

    const updated = await this.prisma.charge.update({
      where: { id },
      data: {
        status: ChargeStatus.REJECTED,
        rejectionReason: dto.reason,
        validatedById: actor.id,
        validatedAt: new Date(),
      },
      include: CHARGE_INCLUDE,
    });

    await this.auditService.log({
      action: AuditActions.CHARGE_REJECTED,
      actorId: actor.id,
      entityType: EntityTypes.CHARGE,
      entityId: id,
      metadata: { reason: dto.reason, type: charge.type, amount: charge.amount },
    });

    return updated;
  }

  /**
   * Ajoute une charge validée au contrat.
   * Génère des DailyEntry supplémentaires = ceil(amount / dailyAmount).
   * Le lien charge → jours ajoutés est traçable via chargeId sur DailyEntry.
   *
   * Règle 5 du cahier des charges Phase 3-A :
   * - extraDaysAdded = ceil(remainingAmount / dailyAmount)
   * - On ne modifie PAS targetDays directement — on ajoute des entrées
   * - Si paiement immédiat partiel → certains jours passent directement en PARTIALLY_PAID
   */
  async addToContract(id: string, dto: AddToContractDto, actor: User) {
    const charge = await this.findById(id);

    if (charge.status !== ChargeStatus.VALIDATED) {
      throw new BadRequestException(
        `Seule une charge VALIDATED peut être ajoutée au contrat (statut actuel: ${charge.status})`,
      );
    }
    if (!charge.validatedResponsible || charge.validatedResponsible !== 'DRIVER') {
      throw new BadRequestException('Seules les charges DRIVER peuvent être ajoutées au contrat');
    }

    const contract = await this.prisma.contract.findFirst({
      where: { id: dto.contractId },
      select: { id: true, vehicleId: true, driverId: true, dailyAmount: true, status: true },
    });
    if (!contract) throw new NotFoundException(`Contrat ${dto.contractId} introuvable`);
    if (contract.status !== 'ACTIVE') {
      throw new BadRequestException('Le contrat doit être ACTIVE pour ajouter une charge');
    }

    const chargeAmount = new Decimal(charge.amount.toString());
    const immediatePayment = new Decimal(dto.immediatePayment ?? 0);

    if (immediatePayment.gt(chargeAmount)) {
      throw new BadRequestException('Le paiement immédiat ne peut pas dépasser le montant de la charge');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Générer les DailyEntry supplémentaires
      const { extraDaysAdded, entryIds } = await this.dailyEntriesService.createChargeEntries(
        tx as any,
        dto.contractId,
        contract.vehicleId,
        contract.driverId,
        charge.id,
        charge.type,
        chargeAmount,
      );

      // 2. Mettre à jour la charge
      await tx.charge.update({
        where: { id },
        data: {
          status: ChargeStatus.ADDED_TO_CONTRACT,
          contractId: dto.contractId,
          extraDaysAdded,
          paidAmount: immediatePayment,
          notes: dto.notes ?? charge.notes,
        },
      });

      // 3. Si paiement immédiat, mettre à jour les premiers jours générés
      if (immediatePayment.gt(0)) {
        const dailyAmount = new Decimal(contract.dailyAmount.toString());
        let remaining = immediatePayment;

        for (const entryId of entryIds) {
          if (remaining.lte(0)) break;
          const entry = await tx.dailyEntry.findFirst({ where: { id: entryId }, select: { expectedAmount: true } });
          const needed = entry?.expectedAmount
            ? new Decimal(entry.expectedAmount.toString())
            : dailyAmount;
          const absorbed = Decimal.min(remaining, needed);
          remaining = remaining.minus(absorbed);

          await tx.dailyEntry.update({
            where: { id: entryId },
            data: {
              paidAmount: absorbed,
              status: absorbed.gte(needed) ? 'VALIDATED' : 'PARTIALLY_PAID',
            },
          });
        }
      }

      return { extraDaysAdded, entryIds };
    });

    // 4. Ledger
    await this.ledgerService.createEntry({
      contractId: dto.contractId,
      vehicleId: contract.vehicleId,
      entryType: LedgerEntryType.CHARGE,
      direction: LedgerDirection.DEBIT,
      amount: Number(charge.amount),
      currency: 'XOF',
      description: `Charge ${charge.type} ajoutée au contrat — ${result.extraDaysAdded} jour(s)`,
      entityType: EntityTypes.CHARGE,
      entityId: id,
      actorId: actor.id,
    });

    // 5. Audit
    await this.auditService.log({
      action: AuditActions.CHARGE_ADDED_TO_CONTRACT,
      actorId: actor.id,
      entityType: EntityTypes.CHARGE,
      entityId: id,
      metadata: {
        contractId: dto.contractId,
        extraDaysAdded: result.extraDaysAdded,
        amount: charge.amount,
        chargeType: charge.type,
      },
    });

    return this.findById(id);
  }
}
