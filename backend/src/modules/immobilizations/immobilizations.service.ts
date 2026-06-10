import {
  Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import {
  ImmobilizationStatus, NotificationType, NotificationPriority, User, UserRole,
  VehicleAvailabilityEventType, VehicleStatus, DayStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AvailabilityService } from '../availability/availability.service';
import { AuditActions } from '../../common/constants/audit-actions';
import { EntityTypes } from '../../common/constants/entity-types';
import {
  CreateImmobilizationDto, ReleaseImmobilizationDto, ImmobilizationFiltersDto,
} from './dto/immobilization.dto';

const IMMOB_INCLUDE = {
  vehicle: { select: { id: true, plateNumber: true, brand: true, model: true } },
  contract: { select: { id: true, type: true, driverId: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true, role: true } },
  incident: { select: { id: true, type: true, severity: true } },
};

@Injectable()
export class ImmobilizationsService {
  private readonly logger = new Logger(ImmobilizationsService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private notificationsService: NotificationsService,
    private availabilityService: AvailabilityService,
  ) {}

  // ─── Lecture ───────────────────────────────────────────────────────────────

  async findAll(filters: ImmobilizationFiltersDto, page = 1, limit = 20, requestingUser?: User) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (filters.vehicleId) where.vehicleId = filters.vehicleId;
    if (filters.contractId) where.contractId = filters.contractId;
    if (filters.status) where.status = filters.status;
    if (filters.responsible) where.responsible = filters.responsible;

    // IDOR — MANAGER ne voit que les immobilisations des véhicules de son périmètre
    if (requestingUser?.role === UserRole.MANAGER) {
      where.vehicle = { currentManagerId: requestingUser.id };
    }

    const [data, total] = await Promise.all([
      this.prisma.immobilization.findMany({
        where, skip, take: limit,
        include: IMMOB_INCLUDE,
        orderBy: { startDate: 'desc' },
      }),
      this.prisma.immobilization.count({ where }),
    ]);
    return { data, meta: { page, limit, total } };
  }

  async findById(id: string, requestingUser?: User) {
    const record = await this.prisma.immobilization.findFirst({
      where: { id },
      include: IMMOB_INCLUDE,
    });
    if (!record) throw new NotFoundException(`Immobilisation ${id} introuvable`);

    // IDOR — MANAGER ne voit que les immobilisations des véhicules de son périmètre
    if (requestingUser?.role === UserRole.MANAGER) {
      const vehicle = await this.prisma.vehicle.findFirst({
        where: { id: record.vehicleId, currentManagerId: requestingUser.id },
        select: { id: true },
      });
      if (!vehicle) {
        throw new ForbiddenException('Accès refusé — cette immobilisation est hors de votre périmètre');
      }
    }
    return record;
  }

  // ─── Création ──────────────────────────────────────────────────────────────

  async start(dto: CreateImmobilizationDto, actor: User) {
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id: dto.vehicleId } });
    if (!vehicle) throw new NotFoundException('Véhicule introuvable');

    // IDOR — MANAGER ne peut immobiliser que les véhicules de son périmètre
    if (actor.role === UserRole.MANAGER && vehicle.currentManagerId !== actor.id) {
      throw new ForbiddenException('Accès refusé — ce véhicule est hors de votre périmètre');
    }

    // Vérifier qu'il n'y a pas déjà une immobilisation active
    const activeImmob = await this.prisma.immobilization.findFirst({
      where: { vehicleId: dto.vehicleId, status: ImmobilizationStatus.ACTIVE },
    });
    if (activeImmob) {
      throw new BadRequestException(
        `Véhicule ${vehicle.plateNumber} déjà immobilisé (id: ${activeImmob.id})`,
      );
    }

    const immob = await this.prisma.immobilization.create({
      data: {
        vehicleId: dto.vehicleId,
        contractId: dto.contractId ?? null,
        responsible: dto.responsible,
        status: ImmobilizationStatus.ACTIVE,
        reason: dto.reason,
        details: dto.details ?? null,
        startDate: new Date(dto.startDate),
        estimatedEnd: dto.estimatedEnd ? new Date(dto.estimatedEnd) : null,
        incidentId: dto.incidentId ?? null,
        createdById: actor.id,
      },
      include: IMMOB_INCLUDE,
    });

    // FIX 2 : mettre à jour vehicle.status = IMMOBILIZED
    this.prisma.vehicle.update({
      where: { id: dto.vehicleId },
      data: { status: VehicleStatus.IMMOBILIZED },
    }).catch((err) => this.logger.warn(`Mise à jour statut véhicule IMMOBILIZED échouée: ${err?.message}`));

    // FIX 10 : mettre à jour les DailyEntry actives du contrat → IMMOBILIZED
    // IMMOBILIZED days ne comptent pas dans validatedDays (règle R-03)
    if (dto.contractId) {
      const startDate = new Date(dto.startDate);
      this.prisma.dailyEntry.updateMany({
        where: {
          contractId: dto.contractId,
          date: { gte: startDate },
          status: { in: [DayStatus.UNPAID, DayStatus.PARTIALLY_PAID] },
        },
        data: { status: DayStatus.IMMOBILIZED },
      }).catch((err) => this.logger.warn(`Mise à jour DailyEntry IMMOBILIZED échouée: ${err?.message}`));
    }

    // D-15 : enregistrer événement de disponibilité
    this.availabilityService
      .recordEvent(
        {
          vehicleId: dto.vehicleId,
          contractId: dto.contractId,
          type: VehicleAvailabilityEventType.IMMOBILIZED,
          startDate: dto.startDate,
          endDate: dto.estimatedEnd,
          sourceEntityType: EntityTypes.IMMOBILIZATION,
          sourceEntityId: immob.id,
          notes: dto.reason,
        },
        actor,
      )
      .catch((err) => this.logger.warn(`Availability event failed: ${err?.message}`));

    this.auditService
      .log({
        actorId: actor.id,
        action: AuditActions.IMMOBILIZATION_STARTED,
        entityType: EntityTypes.IMMOBILIZATION,
        entityId: immob.id,
        afterJson: { vehicleId: dto.vehicleId, reason: dto.reason, responsible: dto.responsible },
      })
      .catch(() => {});

    // Notifier le manager du véhicule
    if (vehicle.currentManagerId) {
      this.notificationsService
        .send({
          userId: vehicle.currentManagerId,
          type: NotificationType.VEHICLE_IMMOBILIZED,
          title: `Véhicule ${vehicle.plateNumber} immobilisé`,
          message: `Raison : ${dto.reason}`,
          priority: NotificationPriority.HIGH,
          entityType: EntityTypes.IMMOBILIZATION,
          entityId: immob.id,
        })
        .catch(() => {});
    }

    // Notifier le chauffeur si contrat actif
    if (dto.contractId) {
      const contract = await this.prisma.contract.findFirst({
        where: { id: dto.contractId },
        select: { driverId: true },
      });
      if (contract?.driverId) {
        const driver = await this.prisma.driver.findFirst({
          where: { id: contract.driverId },
          select: { userId: true },
        });
        if (driver?.userId) {
          this.notificationsService
            .send({
              userId: driver.userId,
              type: NotificationType.VEHICLE_BLOCKED,
              title: 'Votre véhicule a été immobilisé',
              message: `Raison : ${dto.reason}. Contactez votre manager.`,
              priority: NotificationPriority.HIGH,
              entityType: EntityTypes.IMMOBILIZATION,
              entityId: immob.id,
            })
            .catch(() => {});
        }
      }
    }

    return immob;
  }

  // ─── Libération ────────────────────────────────────────────────────────────

  async release(id: string, dto: ReleaseImmobilizationDto, actor: User) {
    const immob = await this.prisma.immobilization.findFirst({
      where: { id },
      include: IMMOB_INCLUDE,
    });
    if (!immob) throw new NotFoundException('Immobilisation introuvable');

    // IDOR — MANAGER ne peut libérer que les véhicules de son périmètre
    if (actor.role === UserRole.MANAGER) {
      const vehicle = await this.prisma.vehicle.findFirst({
        where: { id: immob.vehicleId, currentManagerId: actor.id },
        select: { id: true },
      });
      if (!vehicle) {
        throw new ForbiddenException('Accès refusé — cette immobilisation est hors de votre périmètre');
      }
    }
    if (immob.status !== ImmobilizationStatus.ACTIVE) {
      throw new BadRequestException('Immobilisation déjà terminée');
    }

    const now = new Date();
    const resumeDate = dto.resumeDate ? new Date(dto.resumeDate) : now;

    const updated = await this.prisma.immobilization.update({
      where: { id },
      data: {
        status: ImmobilizationStatus.ENDED,
        actualEnd: now,
        resumeDate,
        details: dto.notes
          ? (immob.details ? `${immob.details}\nLibération: ${dto.notes}` : dto.notes)
          : immob.details,
      },
      include: IMMOB_INCLUDE,
    });

    // D-15 : résoudre l'événement de disponibilité associé
    this.availabilityService
      .resolveActiveEventsForSource(EntityTypes.IMMOBILIZATION, id, actor)
      .catch((err) => this.logger.warn(`Availability resolve failed: ${err?.message}`));

    // FIX 2 : restaurer vehicle.status → ASSIGNED si contrat actif, sinon AVAILABLE
    this.restoreVehicleStatus(updated.vehicleId)
      .catch((err) => this.logger.warn(`Restauration statut véhicule après immobilisation échouée: ${err?.message}`));

    this.auditService
      .log({
        actorId: actor.id,
        action: AuditActions.IMMOBILIZATION_ENDED,
        entityType: EntityTypes.IMMOBILIZATION,
        entityId: id,
        afterJson: { status: ImmobilizationStatus.ENDED, resumeDate },
      })
      .catch(() => {});

    // Notifier le manager et le chauffeur
    if (updated.vehicle) {
      const vehicle = await this.prisma.vehicle.findFirst({
        where: { id: updated.vehicleId },
        select: { currentManagerId: true, plateNumber: true },
      });

      if (vehicle?.currentManagerId) {
        this.notificationsService
          .send({
            userId: vehicle.currentManagerId,
            type: NotificationType.VEHICLE_RELEASED,
            title: `Véhicule ${vehicle.plateNumber} libéré`,
            message: `L'immobilisation a été levée.`,
            priority: NotificationPriority.NORMAL,
            entityType: EntityTypes.IMMOBILIZATION,
            entityId: id,
          })
          .catch(() => {});
      }
    }

    return updated;
  }

  // ─── Helper — Restauration statut véhicule ─────────────────────────────────

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

    this.logger.log(`Véhicule ${vehicleId} restauré → ${newStatus} après fin d'immobilisation`);
  }
}
