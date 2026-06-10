import {
  Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import {
  InspectionStatus, InspectionType, FuelLevel, InspectionItemStatus,
  NotificationType, NotificationPriority, User, UserRole, ChargeType, ChargeStatus,
  ChargeResponsible,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditActions } from '../../common/constants/audit-actions';
import { EntityTypes } from '../../common/constants/entity-types';
import {
  CreateInspectionDto, SignInspectionDto, LinkReturnInspectionDto,
  AddInspectionItemDto, InspectionFiltersDto,
} from './dto/inspection.dto';

const INSPECTION_INCLUDE = {
  vehicle: { select: { id: true, plateNumber: true, brand: true, model: true } },
  contract: { select: { id: true, type: true, dailyAmount: true } },
  items: true,
  photos: { include: { mediaAsset: { select: { id: true, fileUrl: true, mediaType: true } } } },
  fuelTransactions: true,
  linkedHandoverInspection: { select: { id: true, type: true, fuelLevelIn: true, mileageIn: true } },
};

/** Ordre enum FuelLevel pour calculer un delta de carburant */
const FUEL_LEVEL_ORDER: Record<FuelLevel, number> = {
  FULL: 4,
  THREE_QUARTERS: 3,
  HALF: 2,
  QUARTER: 1,
  EMPTY: 0,
  UNKNOWN: -1,
};

@Injectable()
export class InspectionsService {
  private readonly logger = new Logger(InspectionsService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private notificationsService: NotificationsService,
  ) {}

  // ─── Lecture ───────────────────────────────────────────────────────────────

  async findAll(filters: InspectionFiltersDto, page = 1, limit = 20, requestingUser?: User) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (filters.vehicleId) where.vehicleId = filters.vehicleId;
    if (filters.contractId) where.contractId = filters.contractId;
    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;

    // IDOR — MANAGER ne voit que les inspections des véhicules de son périmètre
    if (requestingUser?.role === UserRole.MANAGER) {
      where.vehicle = { currentManagerId: requestingUser.id };
    }

    const [data, total] = await Promise.all([
      this.prisma.inspection.findMany({
        where, skip, take: limit,
        include: INSPECTION_INCLUDE,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.inspection.count({ where }),
    ]);
    return { data, meta: { page, limit, total } };
  }

  async findById(id: string, requestingUser?: User) {
    const insp = await this.prisma.inspection.findFirst({
      where: { id },
      include: INSPECTION_INCLUDE,
    });
    if (!insp) throw new NotFoundException(`Inspection ${id} introuvable`);
    await this.assertDriverOwnsInspection(insp.driverId, requestingUser);
    await this.assertManagerVehicleScope(insp.vehicleId, requestingUser);
    return insp;
  }

  /** IDOR — MANAGER ne voit que les inspections des véhicules de son périmètre */
  private async assertManagerVehicleScope(vehicleId: string, requestingUser?: User) {
    if (requestingUser?.role !== UserRole.MANAGER) return;
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, currentManagerId: requestingUser.id },
      select: { id: true },
    });
    if (!vehicle) {
      throw new ForbiddenException('Accès refusé — cette inspection est hors de votre périmètre');
    }
  }

  /** IDOR — un chauffeur ne peut accéder qu'à ses propres inspections */
  private async assertDriverOwnsInspection(
    inspectionDriverId: string | null,
    requestingUser?: User,
  ) {
    if (requestingUser?.role !== UserRole.DRIVER) return;
    const driver = await this.prisma.driver.findFirst({
      where: { userId: requestingUser.id }, select: { id: true },
    });
    if (!driver || inspectionDriverId !== driver.id) {
      throw new ForbiddenException('Accès refusé — cette inspection ne vous concerne pas');
    }
  }

  // ─── Création ──────────────────────────────────────────────────────────────

  async create(dto: CreateInspectionDto, actor: User) {
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id: dto.vehicleId } });
    if (!vehicle) throw new NotFoundException('Véhicule introuvable');

    // IDOR — MANAGER ne peut créer une inspection que sur ses véhicules
    if (actor.role === UserRole.MANAGER && vehicle.currentManagerId !== actor.id) {
      throw new ForbiddenException('Accès refusé — ce véhicule est hors de votre périmètre');
    }

    const inspection = await this.prisma.inspection.create({
      data: {
        type: dto.type,
        vehicleId: dto.vehicleId,
        contractId: dto.contractId ?? null,
        driverId: dto.driverId ?? null,
        managerId: dto.managerId ?? null,
        incidentId: dto.incidentId ?? null,
        fuelLevelIn: dto.fuelLevelIn ?? null,
        mileageIn: dto.mileageIn ?? null,
        gpsLat: dto.gpsLat ?? null,
        gpsLng: dto.gpsLng ?? null,
      },
      include: INSPECTION_INCLUDE,
    });

    // Créer les items de checklist si fournis
    if (dto.items && dto.items.length > 0) {
      await this.prisma.inspectionItem.createMany({
        data: dto.items.map((item) => ({
          inspectionId: inspection.id,
          itemKey: item.itemKey,
          label: item.label,
          status: item.status ?? InspectionItemStatus.OK,
          comment: item.comment ?? null,
          photoUrl: item.photoUrl ?? null,
        })),
      });
    }

    this.auditService
      .log({
        actorId: actor.id,
        action: AuditActions.INSPECTION_CREATED,
        entityType: EntityTypes.INSPECTION,
        entityId: inspection.id,
        afterJson: { type: dto.type, vehicleId: dto.vehicleId, contractId: dto.contractId },
      })
      .catch(() => {});

    return this.findById(inspection.id);
  }

  // ─── Items de checklist ────────────────────────────────────────────────────

  async addItem(inspectionId: string, dto: AddInspectionItemDto, actor: User) {
    const insp = await this.prisma.inspection.findFirst({ where: { id: inspectionId } });
    if (!insp) throw new NotFoundException('Inspection introuvable');
    await this.assertManagerVehicleScope(insp.vehicleId, actor);
    if (insp.status === InspectionStatus.COMPLETED) {
      throw new BadRequestException('Inspection terminée — impossible d\'ajouter des items');
    }

    return this.prisma.inspectionItem.create({
      data: {
        inspectionId,
        itemKey: dto.itemKey,
        label: dto.label,
        status: dto.status ?? InspectionItemStatus.OK,
        comment: dto.comment ?? null,
        photoUrl: dto.photoUrl ?? null,
      },
    });
  }

  // ─── Signature chauffeur ───────────────────────────────────────────────────

  async driverSign(id: string, dto: SignInspectionDto, actor: User) {
    const insp = await this.prisma.inspection.findFirst({ where: { id } });
    if (!insp) throw new NotFoundException('Inspection introuvable');
    // IDOR — un chauffeur ne peut signer que sa propre inspection
    await this.assertDriverOwnsInspection(insp.driverId, actor);
    if (insp.status !== InspectionStatus.PENDING_DRIVER) {
      throw new BadRequestException(
        `Inspection ${insp.status} — la signature chauffeur n'est pas attendue`,
      );
    }

    const updated = await this.prisma.inspection.update({
      where: { id },
      data: {
        status: InspectionStatus.DRIVER_SIGNED,
        driverSignedAt: new Date(),
        driverNotes: dto.notes ?? null,
        fuelLevelOut: dto.fuelLevelOut ?? null,
        mileageOut: dto.mileageOut ?? null,
      },
      include: INSPECTION_INCLUDE,
    });

    this.auditService
      .log({
        actorId: actor.id,
        action: AuditActions.INSPECTION_DRIVER_SIGNED,
        entityType: EntityTypes.INSPECTION,
        entityId: id,
      })
      .catch(() => {});

    // Notifier le manager que la signature chauffeur est faite
    if (insp.managerId) {
      this.notificationsService
        .send({
          userId: insp.managerId,
          type: NotificationType.APPOINTMENT_CREATED,
          title: 'Inspection signée par le chauffeur',
          message: `L'inspection ${insp.type} du véhicule ${insp.vehicleId} est prête pour votre signature.`,
          priority: NotificationPriority.NORMAL,
          entityType: EntityTypes.INSPECTION,
          entityId: id,
        })
        .catch(() => {});
    }

    return updated;
  }

  // ─── Signature manager ─────────────────────────────────────────────────────

  async managerSign(id: string, dto: SignInspectionDto, actor: User) {
    const insp = await this.prisma.inspection.findFirst({ where: { id } });
    if (!insp) throw new NotFoundException('Inspection introuvable');
    await this.assertManagerVehicleScope(insp.vehicleId, actor);

    const allowedStatuses = [InspectionStatus.DRIVER_SIGNED, InspectionStatus.PENDING_DRIVER];
    if (!allowedStatuses.includes(insp.status)) {
      throw new BadRequestException(
        `Inspection ${insp.status} — signature manager non applicable`,
      );
    }

    const updated = await this.prisma.inspection.update({
      where: { id },
      data: {
        status: InspectionStatus.COMPLETED,
        managerSignedAt: new Date(),
        managerNotes: dto.notes ?? null,
        fuelLevelOut: dto.fuelLevelOut ?? insp.fuelLevelOut,
        mileageOut: dto.mileageOut ?? insp.mileageOut,
      },
      include: INSPECTION_INCLUDE,
    });

    this.auditService
      .log({
        actorId: actor.id,
        action: AuditActions.INSPECTION_COMPLETED,
        entityType: EntityTypes.INSPECTION,
        entityId: id,
        afterJson: { type: insp.type, vehicleId: insp.vehicleId },
      })
      .catch(() => {});

    // R-09 : si retour avec niveau < FULL → créer charge automatique
    if (
      insp.type === InspectionType.VEHICLE_RETURN &&
      updated.fuelLevelOut &&
      updated.fuelLevelOut !== FuelLevel.FULL &&
      updated.fuelLevelOut !== FuelLevel.UNKNOWN
    ) {
      this.createFuelDiscrepancyCharge(updated, actor).catch((err) =>
        this.logger.warn(`Charge carburant automatique échouée: ${err?.message}`),
      );
    }

    return updated;
  }

  /** R-09 : génère une charge automatique si niveau carburant < FULL au retour.
   *  Idempotent : vérifie qu'une charge carburant pour ce contrat/inspection
   *  n'existe pas déjà (guard anti-doublon avec FuelService.record()).
   */
  private async createFuelDiscrepancyCharge(inspection: any, actor: User): Promise<void> {
    if (!inspection.contractId) return;

    const contract = await this.prisma.contract.findFirst({ where: { id: inspection.contractId } });
    if (!contract) return;

    // Guard idempotence : chercher une charge FUEL existante pour ce contrat/véhicule
    const existingFuelCharge = await this.prisma.charge.findFirst({
      where: {
        contractId: inspection.contractId,
        vehicleId: inspection.vehicleId,
        type: ChargeType.CLEANING,
        proposedResponsible: ChargeResponsible.DRIVER,
        description: { contains: 'Carburant manquant' },
        createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) }, // dernières 5 minutes
      },
    });

    if (existingFuelCharge) {
      this.logger.warn(
        `Charge carburant R-09 déjà existante (${existingFuelCharge.id}) — doublon ignoré pour inspection ${inspection.id}`,
      );
      return;
    }

    await this.prisma.charge.create({
      data: {
        type: ChargeType.CLEANING,
        status: ChargeStatus.PENDING_VALIDATION,
        amount: contract.dailyAmount,
        vehicleId: inspection.vehicleId,
        contractId: inspection.contractId,
        driverId: inspection.driverId ?? null,
        proposedResponsible: ChargeResponsible.DRIVER,
        description: `Carburant manquant au retour — niveau constaté: ${inspection.fuelLevelOut} (inspection ${inspection.id})`,
        createdById: actor.id,
        incidentId: null,
      },
    });

    this.logger.log(
      `Charge carburant automatique créée pour inspection ${inspection.id}`,
    );
  }

  // ─── Lien retour → remise ──────────────────────────────────────────────────

  async linkReturnToHandover(returnId: string, dto: LinkReturnInspectionDto, actor: User) {
    const returnInsp = await this.prisma.inspection.findFirst({ where: { id: returnId } });
    if (!returnInsp) throw new NotFoundException('Inspection de retour introuvable');
    await this.assertManagerVehicleScope(returnInsp.vehicleId, actor);

    const handoverInsp = await this.prisma.inspection.findFirst({
      where: { id: dto.handoverInspectionId },
    });
    if (!handoverInsp) throw new NotFoundException('Inspection de remise introuvable');

    if (
      returnInsp.type !== InspectionType.VEHICLE_RETURN &&
      returnInsp.type !== InspectionType.REGULAR
    ) {
      throw new BadRequestException(
        "Seule une inspection de type VEHICLE_RETURN peut être liée à une remise",
      );
    }

    return this.prisma.inspection.update({
      where: { id: returnId },
      data: {
        linkedHandoverInspectionId: dto.handoverInspectionId,
        returnComparisonNotes: dto.returnComparisonNotes ?? null,
      },
      include: INSPECTION_INCLUDE,
    });
  }

  // ─── Comparaison remise / retour ───────────────────────────────────────────

  async generateComparison(returnInspectionId: string, requestingUser?: User) {
    const returnInsp = await this.prisma.inspection.findFirst({
      where: { id: returnInspectionId },
      include: {
        items: true,
        linkedHandoverInspection: { include: { items: true } },
      },
    });

    if (!returnInsp) throw new NotFoundException('Inspection introuvable');
    await this.assertManagerVehicleScope(returnInsp.vehicleId, requestingUser);
    if (!returnInsp.linkedHandoverInspection) {
      throw new BadRequestException(
        'Cette inspection de retour n\'est pas liée à une inspection de remise',
      );
    }

    const handover = returnInsp.linkedHandoverInspection;

    // ── Carburant ─────────────────────────────────────────────────────────
    const fuelIn = handover.fuelLevelIn ?? FuelLevel.UNKNOWN;
    const fuelOut = returnInsp.fuelLevelOut ?? returnInsp.fuelLevelIn ?? FuelLevel.UNKNOWN;
    const fuelDelta = FUEL_LEVEL_ORDER[fuelOut] - FUEL_LEVEL_ORDER[fuelIn];
    const hasFuelDiscrepancy =
      fuelIn !== FuelLevel.UNKNOWN &&
      fuelOut !== FuelLevel.UNKNOWN &&
      fuelOut !== FuelLevel.FULL;

    // ── Kilométrage ───────────────────────────────────────────────────────
    const mileageDelta =
      returnInsp.mileageOut !== null && handover.mileageIn !== null
        ? returnInsp.mileageOut! - handover.mileageIn!
        : null;

    // ── Items de checklist ────────────────────────────────────────────────
    // Note: la relation auto-référencée (linkedHandoverInspection) atteint la
    // limite d'inférence de profondeur de Prisma → items typé {}. On réutilise
    // le type correctement inféré de returnInsp.items (même forme runtime).
    type InspItem = (typeof returnInsp.items)[number];
    const handoverItemMap = new Map<string, InspItem>(
      (handover.items as InspItem[]).map((i) => [i.itemKey, i]),
    );
    const itemDiffs = returnInsp.items.map((returnItem) => {
      const handoverItem = handoverItemMap.get(returnItem.itemKey);
      return {
        itemKey: returnItem.itemKey,
        label: returnItem.label,
        atHandover: handoverItem?.status ?? null,
        atReturn: returnItem.status,
        changed:
          handoverItem !== undefined &&
          returnItem.status !== handoverItem.status &&
          returnItem.status !== InspectionItemStatus.OK,
        comment: returnItem.comment,
      };
    });

    const damagedItems = itemDiffs.filter((i) => i.changed);
    const missingItems = itemDiffs.filter((i) => i.atReturn === InspectionItemStatus.MISSING);

    return {
      returnInspectionId,
      handoverInspectionId: handover.id,
      fuel: {
        atHandover: fuelIn,
        atReturn: fuelOut,
        delta: fuelDelta,
        discrepancy: hasFuelDiscrepancy,
        message: hasFuelDiscrepancy
          ? `Niveau carburant inférieur au départ : ${fuelIn} → ${fuelOut}`
          : 'Carburant conforme',
      },
      mileage: {
        atHandover: handover.mileageIn,
        atReturn: returnInsp.mileageOut,
        delta: mileageDelta,
      },
      items: {
        total: itemDiffs.length,
        damaged: damagedItems,
        missing: missingItems,
        clean: itemDiffs.filter((i) => !i.changed),
      },
      summary: {
        hasIssues:
          hasFuelDiscrepancy || damagedItems.length > 0 || missingItems.length > 0,
        issueCount: (hasFuelDiscrepancy ? 1 : 0) + damagedItems.length + missingItems.length,
      },
      manualNotes: returnInsp.returnComparisonNotes,
    };
  }
}
