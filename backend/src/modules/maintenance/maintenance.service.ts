import {
  Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import {
  MaintenanceStatus, MileageSource, NotificationType, NotificationPriority, User,
  UserRole, VehicleStatus, VehicleAvailabilityEventType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AvailabilityService } from '../availability/availability.service';
import { AuditActions } from '../../common/constants/audit-actions';
import { EntityTypes } from '../../common/constants/entity-types';
import {
  CreateMaintenanceDto, UpdateMaintenanceDto, CompleteMaintenanceDto,
  CreateMileageRecordDto, MaintenanceFiltersDto, MileageFiltersDto,
} from './dto/maintenance.dto';

const MAINTENANCE_INCLUDE = {
  vehicle: { select: { id: true, plateNumber: true, brand: true, model: true, currentMileage: true } },
};

@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private notificationsService: NotificationsService,
    private availabilityService: AvailabilityService,
  ) {}

  // ─── Maintenance — Lecture ─────────────────────────────────────────────────

  async findAll(filters: MaintenanceFiltersDto, page = 1, limit = 20, requestingUser?: User) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (filters.vehicleId) where.vehicleId = filters.vehicleId;
    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;

    // IDOR — MANAGER ne voit que les maintenances des véhicules de son périmètre
    if (requestingUser?.role === UserRole.MANAGER) {
      where.vehicle = { currentManagerId: requestingUser.id };
    }

    const [data, total] = await Promise.all([
      this.prisma.maintenanceRecord.findMany({
        where, skip, take: limit,
        include: MAINTENANCE_INCLUDE,
        orderBy: { scheduledAt: 'desc' },
      }),
      this.prisma.maintenanceRecord.count({ where }),
    ]);
    return { data, meta: { page, limit, total } };
  }

  async findById(id: string, requestingUser?: User) {
    const record = await this.prisma.maintenanceRecord.findFirst({
      where: { id },
      include: MAINTENANCE_INCLUDE,
    });
    if (!record) throw new NotFoundException(`Maintenance ${id} introuvable`);

    // IDOR — MANAGER ne voit que les maintenances des véhicules de son périmètre
    if (requestingUser?.role === UserRole.MANAGER) {
      const vehicle = await this.prisma.vehicle.findFirst({
        where: { id: record.vehicleId, currentManagerId: requestingUser.id },
        select: { id: true },
      });
      if (!vehicle) {
        throw new ForbiddenException('Accès refusé — cette maintenance est hors de votre périmètre');
      }
    }
    return record;
  }

  // ─── Maintenance — Création ────────────────────────────────────────────────

  /** IDOR — MANAGER n'agit que sur les véhicules de son périmètre */
  private async assertManagerVehicleScope(vehicleId: string, actor?: User) {
    if (actor?.role !== UserRole.MANAGER) return;
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, currentManagerId: actor.id },
      select: { id: true },
    });
    if (!vehicle) {
      throw new ForbiddenException('Accès refusé — ce véhicule est hors de votre périmètre');
    }
  }

  async create(dto: CreateMaintenanceDto, actor: User) {
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id: dto.vehicleId } });
    if (!vehicle) throw new NotFoundException('Véhicule introuvable');

    // IDOR — MANAGER ne planifie que sur ses véhicules
    if (actor.role === UserRole.MANAGER && vehicle.currentManagerId !== actor.id) {
      throw new ForbiddenException('Accès refusé — ce véhicule est hors de votre périmètre');
    }

    const record = await this.prisma.maintenanceRecord.create({
      data: {
        type: dto.type,
        status: MaintenanceStatus.SCHEDULED,
        vehicleId: dto.vehicleId,
        mileageAtService: dto.mileageAtService ?? null,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        garage: dto.garage ?? null,
        cost: dto.cost ?? null,
        description: dto.description ?? null,
        notes: dto.notes ?? null,
        createdById: actor.id,
      },
      include: MAINTENANCE_INCLUDE,
    });

    this.auditService
      .log({
        actorId: actor.id,
        action: AuditActions.MAINTENANCE_CREATED,
        entityType: EntityTypes.MAINTENANCE,
        entityId: record.id,
        afterJson: { type: dto.type, vehicleId: dto.vehicleId, scheduledAt: dto.scheduledAt },
      })
      .catch(() => {});

    // FIX 2 : mettre à jour vehicle.status = IN_REPAIR
    this.prisma.vehicle.update({
      where: { id: dto.vehicleId },
      data: { status: VehicleStatus.IN_REPAIR },
    }).catch((err) => this.logger.warn(`Mise à jour statut véhicule IN_REPAIR échouée: ${err?.message}`));

    // FIX 1 — D-15 : enregistrer événement de disponibilité MAINTENANCE
    this.availabilityService
      .recordEvent(
        {
          vehicleId: dto.vehicleId,
          type: VehicleAvailabilityEventType.MAINTENANCE,
          startDate: dto.scheduledAt ?? new Date().toISOString(),
          sourceEntityType: EntityTypes.MAINTENANCE,
          sourceEntityId: record.id,
          notes: `Maintenance ${dto.type}${dto.garage ? ` — Garage: ${dto.garage}` : ''}`,
        },
        actor,
      )
      .catch((err) => this.logger.warn(`Availability event maintenance échoué: ${err?.message}`));

    // Notifier le manager du véhicule si disponible
    if (vehicle.currentManagerId) {
      this.notificationsService
        .send({
          userId: vehicle.currentManagerId,
          type: NotificationType.MAINTENANCE_DUE_SOON,
          title: `Maintenance planifiée — ${dto.type}`,
          message: `Une maintenance ${dto.type} a été planifiée pour le véhicule ${vehicle.plateNumber}.`,
          priority: NotificationPriority.NORMAL,
          entityType: EntityTypes.MAINTENANCE,
          entityId: record.id,
        })
        .catch(() => {});
    }

    return record;
  }

  // ─── Maintenance — Mise à jour ─────────────────────────────────────────────

  async update(id: string, dto: UpdateMaintenanceDto, actor: User) {
    const record = await this.prisma.maintenanceRecord.findFirst({ where: { id } });
    if (!record) throw new NotFoundException('Maintenance introuvable');
    await this.assertManagerVehicleScope(record.vehicleId, actor);
    if (record.status === MaintenanceStatus.COMPLETED || record.status === MaintenanceStatus.CANCELLED) {
      throw new BadRequestException(
        `Maintenance ${record.status} — modification impossible`,
      );
    }

    return this.prisma.maintenanceRecord.update({
      where: { id },
      data: {
        status: dto.status ?? undefined,
        mileageAtService: dto.mileageAtService ?? undefined,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        garage: dto.garage ?? undefined,
        cost: dto.cost ?? undefined,
        description: dto.description ?? undefined,
        notes: dto.notes ?? undefined,
      },
      include: MAINTENANCE_INCLUDE,
    });
  }

  // ─── Maintenance — Complétion ──────────────────────────────────────────────

  async complete(id: string, dto: CompleteMaintenanceDto, actor: User) {
    const record = await this.prisma.maintenanceRecord.findFirst({ where: { id } });
    if (!record) throw new NotFoundException('Maintenance introuvable');
    await this.assertManagerVehicleScope(record.vehicleId, actor);
    if (record.status === MaintenanceStatus.COMPLETED) {
      throw new BadRequestException('Maintenance déjà complétée');
    }
    if (record.status === MaintenanceStatus.CANCELLED) {
      throw new BadRequestException('Impossible de compléter une maintenance annulée');
    }

    const completedAt = new Date();

    const updated = await this.prisma.maintenanceRecord.update({
      where: { id },
      data: {
        status: MaintenanceStatus.COMPLETED,
        completedAt,
        mileageAtService: dto.mileageAtService ?? record.mileageAtService,
        cost: dto.cost ?? record.cost,
        garage: dto.garage ?? record.garage,
        notes: dto.notes ? (record.notes ? `${record.notes}\n${dto.notes}` : dto.notes) : record.notes,
      },
      include: MAINTENANCE_INCLUDE,
    });

    // Mettre à jour le kilométrage du véhicule si fourni et supérieur au courant
    if (dto.mileageAtService) {
      await this.syncVehicleMileage(record.vehicleId, dto.mileageAtService);
    }

    // FIX 1 — D-15 : résoudre l'événement de disponibilité
    this.availabilityService
      .resolveActiveEventsForSource(EntityTypes.MAINTENANCE, id, actor)
      .catch((err) => this.logger.warn(`Résolution availability maintenance échouée: ${err?.message}`));

    // FIX 2 : restaurer statut véhicule → ASSIGNED si contrat actif, sinon AVAILABLE
    this.restoreVehicleStatus(record.vehicleId)
      .catch((err) => this.logger.warn(`Restauration statut véhicule après maintenance échouée: ${err?.message}`));

    this.auditService
      .log({
        actorId: actor.id,
        action: AuditActions.MAINTENANCE_COMPLETED,
        entityType: EntityTypes.MAINTENANCE,
        entityId: id,
        afterJson: { type: record.type, vehicleId: record.vehicleId, completedAt },
      })
      .catch(() => {});

    return updated;
  }

  async cancel(id: string, actor: User) {
    const record = await this.prisma.maintenanceRecord.findFirst({ where: { id } });
    if (!record) throw new NotFoundException('Maintenance introuvable');
    await this.assertManagerVehicleScope(record.vehicleId, actor);
    if (record.status === MaintenanceStatus.COMPLETED) {
      throw new BadRequestException('Impossible d\'annuler une maintenance déjà complétée');
    }

    return this.prisma.maintenanceRecord.update({
      where: { id },
      data: { status: MaintenanceStatus.CANCELLED },
      include: MAINTENANCE_INCLUDE,
    });
  }

  // ─── Kilométrage — Lecture ─────────────────────────────────────────────────

  async findMileageRecords(filters: MileageFiltersDto, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (filters.vehicleId) where.vehicleId = filters.vehicleId;
    if (filters.driverId) where.driverId = filters.driverId;
    if (filters.source) where.source = filters.source;

    const [data, total] = await Promise.all([
      this.prisma.mileageRecord.findMany({
        where, skip, take: limit,
        include: {
          vehicle: { select: { id: true, plateNumber: true } },
          driver: { select: { id: true, userId: true } },
        },
        orderBy: { recordedAt: 'desc' },
      }),
      this.prisma.mileageRecord.count({ where }),
    ]);
    return { data, meta: { page, limit, total } };
  }

  // ─── Kilométrage — Création ────────────────────────────────────────────────

  async createMileageRecord(dto: CreateMileageRecordDto, actor: User) {
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id: dto.vehicleId } });
    if (!vehicle) throw new NotFoundException('Véhicule introuvable');

    // IDOR — DRIVER ne relève que sur son véhicule courant, MANAGER sur son périmètre
    if (actor.role === UserRole.DRIVER) {
      const driver = await this.prisma.driver.findFirst({
        where: { userId: actor.id }, select: { id: true },
      });
      if (!driver || vehicle.currentDriverId !== driver.id) {
        throw new ForbiddenException('Accès refusé — ce véhicule ne vous est pas affecté');
      }
    }
    if (actor.role === UserRole.MANAGER && vehicle.currentManagerId !== actor.id) {
      throw new ForbiddenException('Accès refusé — ce véhicule est hors de votre périmètre');
    }

    // Vérifier cohérence kilométrique (ne pas régresser)
    if (vehicle.currentMileage && dto.mileage < vehicle.currentMileage) {
      throw new BadRequestException(
        `Kilométrage saisi (${dto.mileage}) inférieur au kilométrage actuel du véhicule (${vehicle.currentMileage})`,
      );
    }

    const record = await this.prisma.mileageRecord.create({
      data: {
        vehicleId: dto.vehicleId,
        driverId: dto.driverId ?? null,
        mileage: dto.mileage,
        photoUrl: dto.photoUrl ?? null,
        gpsLat: dto.gpsLat ?? null,
        gpsLng: dto.gpsLng ?? null,
        recordedAt: new Date(dto.recordedAt),
        source: dto.source ?? MileageSource.DRIVER,
      },
    });

    // Auto-valider si source MANAGER ou CARCUL
    if (dto.source === MileageSource.MANAGER || dto.source === MileageSource.CARCUL) {
      await this.prisma.mileageRecord.update({
        where: { id: record.id },
        data: { isValidated: true, validatedById: actor.id, validatedAt: new Date() },
      });
      await this.syncVehicleMileage(dto.vehicleId, dto.mileage);
    }

    return this.prisma.mileageRecord.findFirst({
      where: { id: record.id },
      include: {
        vehicle: { select: { id: true, plateNumber: true } },
        driver: { select: { id: true, userId: true } },
      },
    });
  }

  // ─── Kilométrage — Validation ──────────────────────────────────────────────

  async validateMileageRecord(id: string, actor: User) {
    const record = await this.prisma.mileageRecord.findFirst({ where: { id } });
    if (!record) throw new NotFoundException('Relevé kilométrique introuvable');
    await this.assertManagerVehicleScope(record.vehicleId, actor);
    if (record.isValidated) {
      throw new BadRequestException('Ce relevé a déjà été validé');
    }

    const updated = await this.prisma.mileageRecord.update({
      where: { id },
      data: { isValidated: true, validatedById: actor.id, validatedAt: new Date() },
    });

    // Mettre à jour le kilométrage véhicule
    await this.syncVehicleMileage(record.vehicleId, record.mileage);

    return updated;
  }

  // ─── Utilitaire — Restauration statut véhicule ────────────────────────────

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

    this.logger.log(`Véhicule ${vehicleId} restauré → ${newStatus} après fin de maintenance`);
  }

  // ─── Utilitaire — Sync kilométrage véhicule ────────────────────────────────

  private async syncVehicleMileage(vehicleId: string, mileage: number): Promise<void> {
    try {
      const vehicle = await this.prisma.vehicle.findFirst({
        where: { id: vehicleId },
        select: { currentMileage: true },
      });
      if (!vehicle) return;

      // Ne mettre à jour que si le nouveau kilométrage est supérieur
      if (!vehicle.currentMileage || mileage > vehicle.currentMileage) {
        await this.prisma.vehicle.update({
          where: { id: vehicleId },
          data: { currentMileage: mileage },
        });
        this.logger.log(`Kilométrage véhicule ${vehicleId} mis à jour → ${mileage} km`);
      }
    } catch (err) {
      this.logger.warn(`Sync kilométrage véhicule ${vehicleId} échouée: ${err?.message}`);
    }
  }
}
