import {
  Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import {
  IncidentStatus, IncidentSeverity, IncidentType, NotificationType,
  NotificationPriority, User, UserRole, VehicleStatus, VehicleAvailabilityEventType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AvailabilityService } from '../availability/availability.service';
import { AuditActions } from '../../common/constants/audit-actions';
import { EntityTypes } from '../../common/constants/entity-types';
import {
  CreateIncidentDto, UpdateIncidentDto, ResolveIncidentDto, IncidentFiltersDto,
} from './dto/incident.dto';

const INCIDENT_INCLUDE = {
  vehicle: { select: { id: true, plateNumber: true, brand: true, model: true } },
  driver: { select: { id: true, userId: true } },
  accidentCase: {
    select: {
      id: true,
      currentStep: true,
      status: true,
      insuranceFileNumber: true,
    },
  },
  charges: { select: { id: true, type: true, amount: true, status: true } },
  immobilizations: { select: { id: true, startDate: true, actualEnd: true, reason: true } },
};

@Injectable()
export class IncidentsService {
  private readonly logger = new Logger(IncidentsService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private notificationsService: NotificationsService,
    private availabilityService: AvailabilityService,
  ) {}

  // ─── Lecture ───────────────────────────────────────────────────────────────

  async findAll(filters: IncidentFiltersDto, page = 1, limit = 20, requestingUser?: User) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (filters.vehicleId) where.vehicleId = filters.vehicleId;
    if (filters.driverId) where.driverId = filters.driverId;
    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;
    if (filters.severity) where.severity = filters.severity;

    // IDOR — MANAGER ne voit que les incidents des véhicules de son périmètre
    if (requestingUser?.role === UserRole.MANAGER) {
      where.vehicle = { currentManagerId: requestingUser.id };
    }

    const [data, total] = await Promise.all([
      this.prisma.incident.findMany({
        where, skip, take: limit,
        include: INCIDENT_INCLUDE,
        orderBy: { occurredAt: 'desc' },
      }),
      this.prisma.incident.count({ where }),
    ]);
    return { data, meta: { page, limit, total } };
  }

  async findById(id: string, requestingUser?: User) {
    const incident = await this.prisma.incident.findFirst({
      where: { id },
      include: INCIDENT_INCLUDE,
    });
    if (!incident) throw new NotFoundException(`Incident ${id} introuvable`);

    // IDOR — MANAGER ne voit que les incidents des véhicules de son périmètre
    if (requestingUser?.role === UserRole.MANAGER) {
      const vehicle = await this.prisma.vehicle.findFirst({
        where: { id: incident.vehicleId, currentManagerId: requestingUser.id },
        select: { id: true },
      });
      if (!vehicle) {
        throw new ForbiddenException('Accès refusé — cet incident est hors de votre périmètre');
      }
    }
    return incident;
  }

  /** IDOR — MANAGER n'agit que sur les incidents des véhicules de son périmètre */
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

  // ─── Création ──────────────────────────────────────────────────────────────

  async create(dto: CreateIncidentDto, actor: User) {
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id: dto.vehicleId } });
    if (!vehicle) throw new NotFoundException('Véhicule introuvable');

    // IDOR — MANAGER ne peut déclarer que sur ses véhicules
    if (actor.role === UserRole.MANAGER && vehicle.currentManagerId !== actor.id) {
      throw new ForbiddenException('Accès refusé — ce véhicule est hors de votre périmètre');
    }

    const incident = await this.prisma.incident.create({
      data: {
        type: dto.type,
        severity: dto.severity ?? IncidentSeverity.MEDIUM,
        vehicleId: dto.vehicleId,
        driverId: dto.driverId ?? null,
        managerId: dto.managerId ?? null,
        description: dto.description,
        notes: dto.notes ?? null,
        locationLat: dto.locationLat ?? null,
        locationLng: dto.locationLng ?? null,
        occurredAt: new Date(dto.occurredAt),
      },
      include: INCIDENT_INCLUDE,
    });

    this.auditService
      .log({
        actorId: actor.id,
        action: AuditActions.INCIDENT_CREATED,
        entityType: EntityTypes.INCIDENT,
        entityId: incident.id,
        afterJson: { type: dto.type, severity: incident.severity, vehicleId: dto.vehicleId },
      })
      .catch(() => {});

    // FIX 1+2 — D-15 : si BREAKDOWN → enregistrer événement disponibilité + mettre à jour statut véhicule
    if (dto.type === IncidentType.BREAKDOWN) {
      // Mettre le véhicule en IMMOBILIZED
      this.prisma.vehicle.update({
        where: { id: dto.vehicleId },
        data: { status: VehicleStatus.IMMOBILIZED },
      }).catch((err) => this.logger.warn(`Mise à jour statut véhicule BREAKDOWN échouée: ${err?.message}`));

      this.availabilityService
        .recordEvent(
          {
            vehicleId: dto.vehicleId,
            driverId: dto.driverId ?? undefined,
            type: VehicleAvailabilityEventType.BREAKDOWN,
            startDate: dto.occurredAt,
            sourceEntityType: EntityTypes.INCIDENT,
            sourceEntityId: incident.id,
            notes: `Panne déclarée: ${dto.description}`,
          },
          actor,
        )
        .catch((err) => this.logger.warn(`Availability event breakdown échoué: ${err?.message}`));
    }

    // Notifier le manager responsable si spécifié
    if (dto.managerId) {
      const notifType = dto.type === IncidentType.ACCIDENT
        ? NotificationType.ACCIDENT_DECLARED
        : NotificationType.BREAKDOWN_DECLARED;

      this.notificationsService
        .send({
          userId: dto.managerId,
          type: notifType,
          title: `Nouvel incident ${dto.type}`,
          message: `Un incident ${dto.type} a été signalé pour le véhicule ${vehicle.plateNumber ?? dto.vehicleId}.`,
          priority: dto.severity === IncidentSeverity.CRITICAL
            ? NotificationPriority.HIGH
            : NotificationPriority.NORMAL,
          entityType: EntityTypes.INCIDENT,
          entityId: incident.id,
        })
        .catch(() => {});
    }

    return this.findById(incident.id);
  }

  // ─── Mise à jour ───────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateIncidentDto, actor: User) {
    const incident = await this.prisma.incident.findFirst({ where: { id } });
    if (!incident) throw new NotFoundException('Incident introuvable');
    await this.assertManagerVehicleScope(incident.vehicleId, actor);
    if (incident.status === IncidentStatus.CLOSED) {
      throw new BadRequestException('Impossible de modifier un incident clôturé');
    }

    return this.prisma.incident.update({
      where: { id },
      data: {
        severity: dto.severity ?? undefined,
        notes: dto.notes ?? undefined,
        managerId: dto.managerId ?? undefined,
      },
      include: INCIDENT_INCLUDE,
    });
  }

  // ─── Cycle de vie ──────────────────────────────────────────────────────────

  async markInProgress(id: string, actor: User) {
    const incident = await this.prisma.incident.findFirst({ where: { id } });
    if (!incident) throw new NotFoundException('Incident introuvable');
    await this.assertManagerVehicleScope(incident.vehicleId, actor);
    if (incident.status !== IncidentStatus.OPEN) {
      throw new BadRequestException(
        `Incident ${incident.status} — transition vers IN_PROGRESS impossible`,
      );
    }

    return this.prisma.incident.update({
      where: { id },
      data: { status: IncidentStatus.IN_PROGRESS },
      include: INCIDENT_INCLUDE,
    });
  }

  async resolve(id: string, dto: ResolveIncidentDto, actor: User) {
    const incident = await this.prisma.incident.findFirst({ where: { id } });
    if (!incident) throw new NotFoundException('Incident introuvable');
    await this.assertManagerVehicleScope(incident.vehicleId, actor);

    const allowedStatuses: IncidentStatus[] = [IncidentStatus.OPEN, IncidentStatus.IN_PROGRESS];
    if (!allowedStatuses.includes(incident.status)) {
      throw new BadRequestException(
        `Incident ${incident.status} — résolution impossible`,
      );
    }

    const notes = dto.notes
      ? (incident.notes ? `${incident.notes}\n${dto.notes}` : dto.notes)
      : undefined;

    const updated = await this.prisma.incident.update({
      where: { id },
      data: {
        status: IncidentStatus.RESOLVED,
        resolvedAt: new Date(),
        ...(notes !== undefined && { notes }),
      },
      include: INCIDENT_INCLUDE,
    });

    this.auditService
      .log({
        actorId: actor.id,
        action: AuditActions.INCIDENT_RESOLVED,
        entityType: EntityTypes.INCIDENT,
        entityId: id,
        afterJson: { status: IncidentStatus.RESOLVED },
      })
      .catch(() => {});

    // FIX 1 — D-15 : résoudre l'événement de disponibilité si BREAKDOWN
    if (incident.type === IncidentType.BREAKDOWN) {
      this.availabilityService
        .resolveActiveEventsForSource(EntityTypes.INCIDENT, id, actor)
        .catch((err) => this.logger.warn(`Résolution availability BREAKDOWN échouée: ${err?.message}`));

      // FIX 2 : restaurer statut véhicule
      this.restoreVehicleStatus(incident.vehicleId)
        .catch((err) => this.logger.warn(`Restauration statut véhicule incident échouée: ${err?.message}`));
    }

    // Notifier le manager responsable
    if (incident.managerId) {
      this.notificationsService
        .send({
          userId: incident.managerId,
          type: NotificationType.BREAKDOWN_DECLARED,
          title: 'Incident résolu',
          message: `L'incident ${incident.type} sur le véhicule ${incident.vehicleId} a été marqué comme résolu.`,
          priority: NotificationPriority.NORMAL,
          entityType: EntityTypes.INCIDENT,
          entityId: id,
        })
        .catch(() => {});
    }

    return updated;
  }

  async close(id: string, actor: User) {
    const incident = await this.prisma.incident.findFirst({ where: { id } });
    if (!incident) throw new NotFoundException('Incident introuvable');
    if (incident.status !== IncidentStatus.RESOLVED) {
      throw new BadRequestException(
        `L'incident doit être RESOLVED avant d'être clôturé — statut actuel: ${incident.status}`,
      );
    }

    const updated = await this.prisma.incident.update({
      where: { id },
      data: { status: IncidentStatus.CLOSED },
      include: INCIDENT_INCLUDE,
    });

    this.auditService
      .log({
        actorId: actor.id,
        action: AuditActions.INCIDENT_CLOSED,
        entityType: EntityTypes.INCIDENT,
        entityId: id,
        afterJson: { status: IncidentStatus.CLOSED },
      })
      .catch(() => {});

    return updated;
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  /** Restaure le statut du véhicule après résolution d'un incident */
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

    this.logger.log(`Véhicule ${vehicleId} restauré → ${newStatus} après résolution incident`);
  }
}
