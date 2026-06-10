import {
  Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import {
  AccidentStep, AccidentCaseStatus, NotificationType, NotificationPriority,
  User, UserRole, ChargeResponsible, VehicleStatus, VehicleAvailabilityEventType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AvailabilityService } from '../availability/availability.service';
import { AuditActions } from '../../common/constants/audit-actions';
import { EntityTypes } from '../../common/constants/entity-types';
import {
  CreateAccidentCaseDto, AdvanceStepDto, AddExpenseDto,
  ValidateExpenseDto, CloseAccidentCaseDto, AccidentFiltersDto,
} from './dto/accident.dto';

/** Seuil en FCFA au-delà duquel une dépense requiert une validation Super Manager (R-13) */
export const ACCIDENT_EXPENSE_SM_THRESHOLD = 500_000;

/**
 * Ordre strict des 14 étapes du workflow accident.
 * Une étape ne peut être validée qu'en respectant la progression linéaire.
 * R-11 : newStep.order === currentStep.order + 1 (une seule étape à la fois)
 */
const STEP_ORDER: Record<AccidentStep, number> = {
  DECLARED: 0,
  PHOTOS_RECEIVED: 1,
  MANAGER_ARRIVED: 2,
  TOWING_REQUESTED: 3,
  VEHICLE_TOWED: 4,
  INSURANCE_DECLARED: 5,
  EXPERT_VISITED: 6,
  REPAIR_QUOTE_RECEIVED: 7,
  GARAGE_STARTED: 8,
  REPAIR_IN_PROGRESS: 9,
  REPAIR_COMPLETED: 10,
  EXPERT_VALIDATION: 11,
  EXIT_PERMIT_RECEIVED: 12,
  VEHICLE_RETURNED: 13,
};

/** Map étape → champ timestamp correspondant sur AccidentCase */
const STEP_TIMESTAMP_FIELD: Partial<Record<AccidentStep, string>> = {
  DECLARED: 'declaredAt',
  PHOTOS_RECEIVED: 'photosReceivedAt',
  MANAGER_ARRIVED: 'managerArrivedAt',
  TOWING_REQUESTED: 'towingRequestedAt',
  VEHICLE_TOWED: 'vehicleTowedAt',
  INSURANCE_DECLARED: 'insuranceDeclaredAt',
  EXPERT_VISITED: 'expertVisitedAt',
  REPAIR_QUOTE_RECEIVED: 'repairQuoteReceivedAt',
  GARAGE_STARTED: 'garageStartedAt',
  REPAIR_IN_PROGRESS: 'garageStartedAt',    // réutilise garageStartedAt
  REPAIR_COMPLETED: 'repairCompletedAt',
  EXPERT_VALIDATION: 'expertValidationAt',
  EXIT_PERMIT_RECEIVED: 'exitPermitAt',
  VEHICLE_RETURNED: 'vehicleReturnedAt',
};

const ACCIDENT_INCLUDE = {
  incident: {
    select: {
      id: true,
      type: true,
      vehicleId: true,
      driverId: true,
      managerId: true,
      severity: true,
      vehicle: { select: { id: true, plateNumber: true, brand: true, model: true } },
    },
  },
  declaredBy: { select: { id: true, firstName: true, lastName: true } },
  insuranceDocument: { select: { id: true, fileUrl: true, mediaType: true } },
  stepHistory: { orderBy: { completedAt: 'asc' as const } },
  expenses: { orderBy: { createdAt: 'desc' as const } },
};

@Injectable()
export class AccidentsService {
  private readonly logger = new Logger(AccidentsService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private notificationsService: NotificationsService,
    private availabilityService: AvailabilityService,
  ) {}

  // ─── Lecture ───────────────────────────────────────────────────────────────

  async findAll(filters: AccidentFiltersDto, page = 1, limit = 20, requestingUser?: User) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (filters.vehicleId) {
      where.incident = { vehicleId: filters.vehicleId };
    }
    if (filters.status) where.status = filters.status;
    if (filters.currentStep) where.currentStep = filters.currentStep;

    // IDOR — MANAGER ne voit que les dossiers des véhicules de son périmètre
    if (requestingUser?.role === UserRole.MANAGER) {
      where.incident = {
        ...(where.incident ?? {}),
        vehicle: { currentManagerId: requestingUser.id },
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.accidentCase.findMany({
        where, skip, take: limit,
        include: ACCIDENT_INCLUDE,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.accidentCase.count({ where }),
    ]);
    return { data, meta: { page, limit, total } };
  }

  async findById(id: string, requestingUser?: User) {
    const accident = await this.prisma.accidentCase.findFirst({
      where: { id },
      include: ACCIDENT_INCLUDE,
    });
    if (!accident) throw new NotFoundException(`Dossier accident ${id} introuvable`);
    await this.assertManagerVehicleScope(accident.incident?.vehicleId, requestingUser);
    return accident;
  }

  async findByIncident(incidentId: string, requestingUser?: User) {
    const accident = await this.prisma.accidentCase.findFirst({
      where: { incidentId },
      include: ACCIDENT_INCLUDE,
    });
    if (!accident) throw new NotFoundException(`Pas de dossier accident pour l'incident ${incidentId}`);
    await this.assertManagerVehicleScope(accident.incident?.vehicleId, requestingUser);
    return accident;
  }

  /** IDOR — MANAGER ne voit que les dossiers des véhicules de son périmètre */
  private async assertManagerVehicleScope(vehicleId: string | undefined, requestingUser?: User) {
    if (requestingUser?.role !== UserRole.MANAGER) return;
    const vehicle = vehicleId
      ? await this.prisma.vehicle.findFirst({
          where: { id: vehicleId, currentManagerId: requestingUser.id },
          select: { id: true },
        })
      : null;
    if (!vehicle) {
      throw new ForbiddenException('Accès refusé — ce dossier accident est hors de votre périmètre');
    }
  }

  // ─── Création ──────────────────────────────────────────────────────────────

  async create(dto: CreateAccidentCaseDto, actor: User) {
    // Vérifier que l'incident existe et est de type ACCIDENT
    const incident = await this.prisma.incident.findFirst({
      where: { id: dto.incidentId },
    });
    if (!incident) throw new NotFoundException('Incident introuvable');
    // IDOR — MANAGER ne peut ouvrir un dossier que sur les véhicules de son périmètre
    await this.assertManagerVehicleScope(incident.vehicleId, actor);
    if (incident.type !== 'ACCIDENT') {
      throw new BadRequestException(
        `Seul un incident de type ACCIDENT peut générer un dossier accident — type actuel: ${incident.type}`,
      );
    }

    // Vérifier qu'un dossier n'existe pas déjà
    const existing = await this.prisma.accidentCase.findFirst({
      where: { incidentId: dto.incidentId },
    });
    if (existing) {
      throw new BadRequestException(
        `Un dossier accident existe déjà pour cet incident (id: ${existing.id})`,
      );
    }

    const now = new Date();

    const accidentCase = await this.prisma.accidentCase.create({
      data: {
        incidentId: dto.incidentId,
        currentStep: AccidentStep.DECLARED,
        status: AccidentCaseStatus.OPEN,
        declaredById: dto.declaredById ?? actor.id,
        policeReportNumber: dto.policeReportNumber ?? null,
        insuranceCompany: dto.insuranceCompany ?? null,
        insuranceFileNumber: dto.insuranceFileNumber ?? null,
        insuranceDocumentId: dto.insuranceDocumentId ?? null,
        estimatedRepairDays: dto.estimatedRepairDays ?? null,
        repairDeadline: dto.repairDeadline ? new Date(dto.repairDeadline) : null,
        declaredAt: now,
      },
      include: ACCIDENT_INCLUDE,
    });

    // Historique de la première étape
    await this.prisma.accidentStepHistory.create({
      data: {
        accidentCaseId: accidentCase.id,
        step: AccidentStep.DECLARED,
        completedAt: now,
        completedById: actor.id,
        notes: 'Dossier accident ouvert',
      },
    });

    // FIX 2 : mettre à jour vehicle.status = ACCIDENTED
    if (incident.vehicleId) {
      this.prisma.vehicle.update({
        where: { id: incident.vehicleId },
        data: { status: VehicleStatus.ACCIDENTED },
      }).catch((err) => this.logger.warn(`Mise à jour statut véhicule échouée: ${err?.message}`));
    }

    // FIX 1 — D-15 : enregistrer événement de disponibilité ACCIDENTED
    if (incident.vehicleId) {
      this.availabilityService
        .recordEvent(
          {
            vehicleId: incident.vehicleId,
            driverId: incident.driverId ?? undefined,
            type: VehicleAvailabilityEventType.ACCIDENTED,
            startDate: now.toISOString(),
            sourceEntityType: EntityTypes.ACCIDENT_CASE,
            sourceEntityId: accidentCase.id,
            notes: `Dossier accident ouvert — incident ${dto.incidentId}`,
          },
          actor,
        )
        .catch((err) => this.logger.warn(`Availability event accident échoué: ${err?.message}`));
    }

    this.auditService
      .log({
        actorId: actor.id,
        action: AuditActions.ACCIDENT_DECLARED,
        entityType: EntityTypes.ACCIDENT_CASE,
        entityId: accidentCase.id,
        afterJson: { incidentId: dto.incidentId, step: AccidentStep.DECLARED },
      })
      .catch(() => {});

    // Notifier le manager de l'incident
    if (incident.managerId) {
      this.notificationsService
        .send({
          userId: incident.managerId,
          type: NotificationType.ACCIDENT_STEP_UPDATED,
          title: 'Dossier accident ouvert',
          message: `Un dossier accident a été créé pour l'incident sur le véhicule ${incident.vehicleId}.`,
          priority: NotificationPriority.HIGH,
          entityType: EntityTypes.ACCIDENT_CASE,
          entityId: accidentCase.id,
        })
        .catch(() => {});
    }

    return this.findById(accidentCase.id);
  }

  // ─── Avancement d'étape ────────────────────────────────────────────────────

  async advanceStep(id: string, dto: AdvanceStepDto, actor: User) {
    const accidentCase = await this.prisma.accidentCase.findFirst({
      where: { id },
      include: { incident: { select: { vehicleId: true } } },
    });
    if (!accidentCase) throw new NotFoundException('Dossier accident introuvable');
    await this.assertManagerVehicleScope(accidentCase.incident?.vehicleId, actor);
    if (accidentCase.status !== AccidentCaseStatus.OPEN) {
      throw new BadRequestException(
        `Dossier accident ${accidentCase.status} — avancement d'étape impossible`,
      );
    }

    const currentOrder = STEP_ORDER[accidentCase.currentStep];
    const newOrder = STEP_ORDER[dto.step];

    // FIX 8 — R-11 : une seule étape à la fois (ordre strict)
    if (newOrder !== currentOrder + 1) {
      throw new BadRequestException(
        `R-11 : L'étape doit progresser d'exactement un cran — étape actuelle: ${accidentCase.currentStep} (ordre ${currentOrder}), étape demandée: ${dto.step} (ordre ${newOrder})`,
      );
    }

    // FIX 8 — R-12 : VEHICLE_TOWED exige towingPlateVisible = true
    if (dto.step === AccidentStep.VEHICLE_TOWED && dto.towingPlateVisible !== true) {
      throw new BadRequestException(
        'R-12 : La photo de remorquage doit montrer la plaque visible (towingPlateVisible = true)',
      );
    }

    const now = new Date();
    const timestampField = STEP_TIMESTAMP_FIELD[dto.step];

    // Données de mise à jour spécifiques à certaines étapes
    const stepData: any = {
      currentStep: dto.step,
      ...(timestampField && { [timestampField]: now }),
    };

    // Étapes towing
    if (dto.step === AccidentStep.TOWING_REQUESTED && dto.towingCompany) {
      stepData.towingCompany = dto.towingCompany;
    }
    if (dto.step === AccidentStep.VEHICLE_TOWED) {
      if (dto.towingCost !== undefined) stepData.towingCost = dto.towingCost;
      if (dto.towingPlateVisible !== undefined) stepData.towingPlateVisible = dto.towingPlateVisible;
      if (dto.towingPhotoUrl) stepData.towingPhotoUrl = dto.towingPhotoUrl;
    }

    const updated = await this.prisma.accidentCase.update({
      where: { id },
      data: stepData,
      include: ACCIDENT_INCLUDE,
    });

    // Historique
    await this.prisma.accidentStepHistory.create({
      data: {
        accidentCaseId: id,
        step: dto.step,
        completedAt: now,
        completedById: actor.id,
        notes: dto.notes ?? null,
        documentUrl: dto.documentUrl ?? null,
      },
    });

    this.auditService
      .log({
        actorId: actor.id,
        action: AuditActions.ACCIDENT_STEP_ADVANCED,
        entityType: EntityTypes.ACCIDENT_CASE,
        entityId: id,
        afterJson: { step: dto.step, previousStep: accidentCase.currentStep },
      })
      .catch(() => {});

    // Notification au manager si étapes clés
    const keySteps: AccidentStep[] = [
      AccidentStep.REPAIR_COMPLETED,
      AccidentStep.VEHICLE_RETURNED,
    ];

    if (updated.incident?.managerId && keySteps.includes(dto.step)) {
      this.notificationsService
        .send({
          userId: updated.incident.managerId,
          type: NotificationType.ACCIDENT_STEP_UPDATED,
          title: `Accident — étape ${dto.step}`,
          message: `L'étape "${dto.step}" du dossier accident a été validée.`,
          priority: dto.step === AccidentStep.VEHICLE_RETURNED
            ? NotificationPriority.HIGH
            : NotificationPriority.NORMAL,
          entityType: EntityTypes.ACCIDENT_CASE,
          entityId: id,
        })
        .catch(() => {});
    }

    return updated;
  }

  // ─── Dépenses ──────────────────────────────────────────────────────────────

  async addExpense(id: string, dto: AddExpenseDto, actor: User) {
    const accidentCase = await this.prisma.accidentCase.findFirst({
      where: { id },
      include: { incident: { select: { vehicleId: true } } },
    });
    if (!accidentCase) throw new NotFoundException('Dossier accident introuvable');
    await this.assertManagerVehicleScope(accidentCase.incident?.vehicleId, actor);
    if (accidentCase.status !== AccidentCaseStatus.OPEN) {
      throw new BadRequestException('Impossible d\'ajouter une dépense sur un dossier clôturé');
    }

    return this.prisma.accidentExpense.create({
      data: {
        accidentCaseId: id,
        type: dto.type,
        amount: dto.amount,
        description: dto.description ?? null,
        responsible: dto.responsible ?? null,
        documentUrl: dto.documentUrl ?? null,
      },
    });
  }

  async validateExpense(id: string, expenseId: string, dto: ValidateExpenseDto, actor: User) {
    const expense = await this.prisma.accidentExpense.findFirst({
      where: { id: expenseId, accidentCaseId: id },
    });
    if (!expense) throw new NotFoundException('Dépense introuvable');
    if (expense.validatedAt) {
      throw new BadRequestException('Cette dépense a déjà été traitée');
    }

    const isRejection = !!dto.rejectionReason;

    // FIX 8 — R-13 : dépenses ≥ seuil requièrent une validation Super Manager
    const amount = typeof expense.amount === 'object'
      ? Number(expense.amount.toString())
      : Number(expense.amount);

    if (!isRejection && amount >= ACCIDENT_EXPENSE_SM_THRESHOLD && !dto.smValidated) {
      throw new BadRequestException(
        `R-13 : Cette dépense (${amount} FCFA) dépasse le seuil de ${ACCIDENT_EXPENSE_SM_THRESHOLD} FCFA — validation Super Manager requise. Utilisez POST /accidents/:id/expenses/:expenseId/sm-validate`,
      );
    }

    const updated = await this.prisma.accidentExpense.update({
      where: { id: expenseId },
      data: {
        validatedById: actor.id,
        validatedAt: new Date(),
        rejectionReason: dto.rejectionReason ?? null,
        isPaid: !isRejection,
        paidAt: !isRejection ? new Date() : null,
      },
    });

    this.auditService
      .log({
        actorId: actor.id,
        action: AuditActions.ACCIDENT_EXPENSE_VALIDATED,
        entityType: EntityTypes.ACCIDENT_CASE,
        entityId: id,
        afterJson: {
          expenseId,
          validated: !isRejection,
          rejectionReason: dto.rejectionReason,
          amount,
          smValidated: dto.smValidated ?? false,
        },
      })
      .catch(() => {});

    return updated;
  }

  /** R-13 : Validation Super Manager pour les dépenses dépassant le seuil */
  async smValidateExpense(id: string, expenseId: string, actor: User) {
    const expense = await this.prisma.accidentExpense.findFirst({
      where: { id: expenseId, accidentCaseId: id },
    });
    if (!expense) throw new NotFoundException('Dépense introuvable');
    if (expense.validatedAt) {
      throw new BadRequestException('Cette dépense a déjà été validée');
    }

    const amount = typeof expense.amount === 'object'
      ? Number(expense.amount.toString())
      : Number(expense.amount);

    if (amount < ACCIDENT_EXPENSE_SM_THRESHOLD) {
      throw new BadRequestException(
        `Dépense de ${amount} FCFA en-dessous du seuil SM (${ACCIDENT_EXPENSE_SM_THRESHOLD} FCFA) — utilisez validate standard`,
      );
    }

    const updated = await this.prisma.accidentExpense.update({
      where: { id: expenseId },
      data: {
        validatedById: actor.id,
        validatedAt: new Date(),
        isPaid: true,
        paidAt: new Date(),
      },
    });

    this.auditService
      .log({
        actorId: actor.id,
        action: AuditActions.ACCIDENT_EXPENSE_VALIDATED,
        entityType: EntityTypes.ACCIDENT_CASE,
        entityId: id,
        afterJson: { expenseId, smValidated: true, amount },
      })
      .catch(() => {});

    return updated;
  }

  // ─── Clôture ───────────────────────────────────────────────────────────────

  async close(id: string, dto: CloseAccidentCaseDto, actor: User) {
    const accidentCase = await this.prisma.accidentCase.findFirst({
      where: { id },
      include: { incident: { select: { vehicleId: true, driverId: true } } },
    });
    if (!accidentCase) throw new NotFoundException('Dossier accident introuvable');
    if (accidentCase.status !== AccidentCaseStatus.OPEN) {
      throw new BadRequestException(
        `Dossier déjà ${accidentCase.status} — clôture impossible`,
      );
    }

    // La clôture standard requiert que le véhicule soit retourné
    const targetStatus = dto.status ?? AccidentCaseStatus.CLOSED;
    const isDisputedClose = targetStatus === AccidentCaseStatus.DISPUTED;

    if (
      !isDisputedClose &&
      accidentCase.currentStep !== AccidentStep.VEHICLE_RETURNED
    ) {
      throw new BadRequestException(
        `Le dossier doit être à l'étape VEHICLE_RETURNED avant clôture — étape actuelle: ${accidentCase.currentStep}`,
      );
    }

    const updated = await this.prisma.accidentCase.update({
      where: { id },
      data: { status: targetStatus },
      include: ACCIDENT_INCLUDE,
    });

    // FIX 1 — D-15 : résoudre l'événement de disponibilité
    this.availabilityService
      .resolveActiveEventsForSource(EntityTypes.ACCIDENT_CASE, id, actor)
      .catch((err) => this.logger.warn(`Résolution événement accident échouée: ${err?.message}`));

    // FIX 2 : restaurer vehicle.status → ASSIGNED si contrat actif, sinon AVAILABLE
    if (accidentCase.incident?.vehicleId) {
      this.restoreVehicleStatus(accidentCase.incident.vehicleId)
        .catch((err) => this.logger.warn(`Restauration statut véhicule échouée: ${err?.message}`));
    }

    this.auditService
      .log({
        actorId: actor.id,
        action: AuditActions.ACCIDENT_CLOSED,
        entityType: EntityTypes.ACCIDENT_CASE,
        entityId: id,
        afterJson: { status: targetStatus },
      })
      .catch(() => {});

    // Notifier le manager
    if (updated.incident?.managerId) {
      this.notificationsService
        .send({
          userId: updated.incident.managerId,
          type: NotificationType.ACCIDENT_RESOLVED,
          title: `Dossier accident ${targetStatus}`,
          message: `Le dossier accident a été ${targetStatus === AccidentCaseStatus.CLOSED ? 'clôturé' : 'marqué en litige'}.`,
          priority: NotificationPriority.NORMAL,
          entityType: EntityTypes.ACCIDENT_CASE,
          entityId: id,
        })
        .catch(() => {});
    }

    return updated;
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  /** Restaure le statut du véhicule après la clôture d'un dossier accident */
  private async restoreVehicleStatus(vehicleId: string): Promise<void> {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId },
      select: { currentContractId: true },
    });
    if (!vehicle) return;

    const newStatus = vehicle.currentContractId
      ? VehicleStatus.ASSIGNED
      : VehicleStatus.AVAILABLE;

    await this.prisma.vehicle.update({
      where: { id: vehicleId },
      data: { status: newStatus },
    });

    this.logger.log(`Véhicule ${vehicleId} restauré → ${newStatus} après clôture accident`);
  }
}
