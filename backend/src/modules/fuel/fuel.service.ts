import {
  Injectable, Logger, NotFoundException, BadRequestException,
} from '@nestjs/common';
import {
  FuelLevel, FuelTransactionType, ChargeType, ChargeStatus, ChargeResponsible,
  User,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditActions } from '../../common/constants/audit-actions';
import { EntityTypes } from '../../common/constants/entity-types';
import {
  CreateFuelTransactionDto, ValidateFuelTransactionDto, FuelFiltersDto,
} from './dto/fuel.dto';

/** Ordre pour calculer un delta de carburant (identique à InspectionsService) */
const FUEL_LEVEL_ORDER: Record<FuelLevel, number> = {
  FULL: 4,
  THREE_QUARTERS: 3,
  HALF: 2,
  QUARTER: 1,
  EMPTY: 0,
  UNKNOWN: -1,
};

const FUEL_INCLUDE = {
  vehicle: { select: { id: true, plateNumber: true, brand: true, model: true } },
  contract: { select: { id: true, type: true, dailyAmount: true } },
  driver: { select: { id: true, userId: true } },
  inspection: { select: { id: true, type: true } },
  validatedBy: { select: { id: true, firstName: true, lastName: true } },
  discrepancyCharge: { select: { id: true, status: true, amount: true } },
};

@Injectable()
export class FuelService {
  private readonly logger = new Logger(FuelService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private notificationsService: NotificationsService,
  ) {}

  // ─── Lecture ───────────────────────────────────────────────────────────────

  async findAll(filters: FuelFiltersDto, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (filters.vehicleId) where.vehicleId = filters.vehicleId;
    if (filters.contractId) where.contractId = filters.contractId;
    if (filters.driverId) where.driverId = filters.driverId;
    if (filters.type) where.type = filters.type;
    if (filters.unvalidatedOnly === 'true') where.validatedAt = null;

    const [data, total] = await Promise.all([
      this.prisma.fuelTransaction.findMany({
        where, skip, take: limit,
        include: FUEL_INCLUDE,
        orderBy: { recordedAt: 'desc' },
      }),
      this.prisma.fuelTransaction.count({ where }),
    ]);
    return { data, meta: { page, limit, total } };
  }

  async findById(id: string) {
    const tx = await this.prisma.fuelTransaction.findFirst({
      where: { id },
      include: FUEL_INCLUDE,
    });
    if (!tx) throw new NotFoundException(`Transaction carburant ${id} introuvable`);
    return tx;
  }

  // ─── Enregistrement ────────────────────────────────────────────────────────

  async record(dto: CreateFuelTransactionDto, actor: User) {
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id: dto.vehicleId } });
    if (!vehicle) throw new NotFoundException('Véhicule introuvable');

    // R-08 : INITIAL_FULL_TANK doit avoir fuelLevel = FULL
    if (
      dto.type === FuelTransactionType.INITIAL_FULL_TANK &&
      dto.fuelLevel !== FuelLevel.FULL
    ) {
      throw new BadRequestException(
        'R-08 : La remise véhicule doit être effectuée avec le plein (fuelLevel = FULL)',
      );
    }

    const tx = await this.prisma.fuelTransaction.create({
      data: {
        vehicleId: dto.vehicleId,
        contractId: dto.contractId ?? null,
        driverId: dto.driverId ?? null,
        inspectionId: dto.inspectionId ?? null,
        type: dto.type,
        fuelLevel: dto.fuelLevel,
        amount: dto.amount ?? null,
        liters: dto.liters ?? null,
        photoUrl: dto.photoUrl ?? null,
        responsible: dto.responsible ?? null,
        recordedById: actor.id,
        recordedAt: new Date(dto.recordedAt),
        notes: dto.notes ?? null,
      },
      include: FUEL_INCLUDE,
    });

    this.auditService
      .log({
        actorId: actor.id,
        action: AuditActions.FUEL_RECORDED,
        entityType: EntityTypes.FUEL_TRANSACTION,
        entityId: tx.id,
        afterJson: { type: dto.type, fuelLevel: dto.fuelLevel, vehicleId: dto.vehicleId },
      })
      .catch(() => {});

    // R-09 : RETURN_CHECK avec fuelLevel < FULL → charge auto optionnelle
    if (
      dto.type === FuelTransactionType.RETURN_CHECK &&
      dto.fuelLevel !== FuelLevel.FULL &&
      dto.fuelLevel !== FuelLevel.UNKNOWN &&
      dto.autoCreateDiscrepancyCharge === true
    ) {
      this.createDiscrepancyCharge(tx, actor).catch((err) =>
        this.logger.warn(`Charge carburant automatique échouée: ${err?.message}`),
      );
    }

    return tx;
  }

  // ─── Validation par manager ────────────────────────────────────────────────

  async validate(id: string, dto: ValidateFuelTransactionDto, actor: User) {
    const tx = await this.prisma.fuelTransaction.findFirst({ where: { id } });
    if (!tx) throw new NotFoundException('Transaction carburant introuvable');
    if (tx.validatedAt) {
      throw new BadRequestException('Transaction carburant déjà validée');
    }

    const correctedLevel = dto.correctedFuelLevel ?? tx.fuelLevel;

    const updated = await this.prisma.fuelTransaction.update({
      where: { id },
      data: {
        validatedById: actor.id,
        validatedAt: new Date(),
        fuelLevel: correctedLevel, // Correction éventuelle
        notes: dto.notes ? (tx.notes ? `${tx.notes}\nValidation: ${dto.notes}` : dto.notes) : undefined,
      },
      include: FUEL_INCLUDE,
    });

    this.auditService
      .log({
        actorId: actor.id,
        action: AuditActions.FUEL_VALIDATED,
        entityType: EntityTypes.FUEL_TRANSACTION,
        entityId: id,
        afterJson: { validatedAt: updated.validatedAt, fuelLevel: correctedLevel },
      })
      .catch(() => {});

    // Si correction vers niveau < FULL sur RETURN_CHECK → proposer charge
    if (
      tx.type === FuelTransactionType.RETURN_CHECK &&
      correctedLevel !== FuelLevel.FULL &&
      correctedLevel !== FuelLevel.UNKNOWN &&
      !tx.discrepancyChargeId
    ) {
      this.logger.log(
        `Transaction ${id} validée avec niveau ${correctedLevel} < FULL — charge manuelle possible`,
      );
    }

    return updated;
  }

  // ─── Résumé carburant véhicule ─────────────────────────────────────────────

  async getVehicleFuelHistory(vehicleId: string, limit = 10) {
    const transactions = await this.prisma.fuelTransaction.findMany({
      where: { vehicleId },
      include: FUEL_INCLUDE,
      orderBy: { recordedAt: 'desc' },
      take: limit,
    });

    const lastHandover = transactions.find(
      (t) => t.type === FuelTransactionType.INITIAL_FULL_TANK,
    );
    const lastReturn = transactions.find(
      (t) => t.type === FuelTransactionType.RETURN_CHECK,
    );

    const delta =
      lastHandover && lastReturn
        ? FUEL_LEVEL_ORDER[lastReturn.fuelLevel] - FUEL_LEVEL_ORDER[lastHandover.fuelLevel]
        : null;

    return {
      vehicleId,
      transactions,
      summary: {
        lastHandoverLevel: lastHandover?.fuelLevel ?? null,
        lastReturnLevel: lastReturn?.fuelLevel ?? null,
        delta,
        hasDiscrepancy:
          delta !== null &&
          lastReturn?.fuelLevel !== FuelLevel.FULL &&
          lastReturn?.fuelLevel !== FuelLevel.UNKNOWN,
      },
    };
  }

  // ─── Charge automatique R-09 ───────────────────────────────────────────────

  private async createDiscrepancyCharge(tx: any, actor: User): Promise<void> {
    if (!tx.contractId) return;

    const contract = await this.prisma.contract.findFirst({ where: { id: tx.contractId } });
    if (!contract) return;

    const charge = await this.prisma.charge.create({
      data: {
        type: ChargeType.CLEANING,
        status: ChargeStatus.PENDING_VALIDATION,
        amount: contract.dailyAmount,
        vehicleId: tx.vehicleId,
        contractId: tx.contractId,
        driverId: tx.driverId ?? null,
        proposedResponsible: ChargeResponsible.DRIVER,
        description: `Carburant manquant au retour — niveau constaté: ${tx.fuelLevel} (transaction ${tx.id})`,
        createdById: actor.id,
        incidentId: null,
      },
    });

    // Lier la charge à la transaction
    await this.prisma.fuelTransaction.update({
      where: { id: tx.id },
      data: { discrepancyChargeId: charge.id },
    });

    this.logger.log(`Charge carburant R-09 créée: ${charge.id} pour transaction ${tx.id}`);
  }
}
