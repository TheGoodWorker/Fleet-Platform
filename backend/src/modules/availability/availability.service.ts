import {
  BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException,
} from '@nestjs/common';
import { VehicleAvailabilityEventType, User, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditActions } from '../../common/constants/audit-actions';
import { EntityTypes } from '../../common/constants/entity-types';
import {
  CreateAvailabilityEventDto, ResolveAvailabilityEventDto, AvailabilityFiltersDto,
} from './dto/availability.dto';

const EVENT_INCLUDE = {
  vehicle: { select: { id: true, plateNumber: true, brand: true, model: true, status: true } },
  contract: { select: { id: true, type: true } },
  resolvedBy: { select: { id: true, firstName: true, lastName: true } },
};

@Injectable()
export class AvailabilityService {
  private readonly logger = new Logger(AvailabilityService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  // ─── Lecture ───────────────────────────────────────────────────────────────

  async findAll(filters: AvailabilityFiltersDto, page = 1, limit = 20, requestingUser?: User) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (filters.vehicleId) where.vehicleId = filters.vehicleId;
    if (filters.contractId) where.contractId = filters.contractId;
    if (filters.type) where.type = filters.type;
    if (filters.active === 'true') where.resolvedAt = null;
    if (filters.active === 'false') where.resolvedAt = { not: null };

    // IDOR — MANAGER ne voit que les événements des véhicules de son périmètre
    if (requestingUser?.role === UserRole.MANAGER) {
      where.vehicle = { currentManagerId: requestingUser.id };
    }

    const [data, total] = await Promise.all([
      this.prisma.vehicleAvailabilityEvent.findMany({
        where, skip, take: limit,
        include: EVENT_INCLUDE,
        orderBy: { startDate: 'desc' },
      }),
      this.prisma.vehicleAvailabilityEvent.count({ where }),
    ]);
    return { data, meta: { page, limit, total } };
  }

  async findById(id: string, requestingUser?: User) {
    const event = await this.prisma.vehicleAvailabilityEvent.findFirst({
      where: { id },
      include: EVENT_INCLUDE,
    });
    if (!event) throw new NotFoundException(`Événement disponibilité ${id} introuvable`);
    await this.assertManagerVehicleScope(event.vehicleId, requestingUser);
    return event;
  }

  /**
   * Récupère l'événement actif (non résolu) pour un véhicule.
   * Utilisé pour vérifier l'état courant du véhicule.
   */
  async findActiveForVehicle(vehicleId: string, requestingUser?: User) {
    await this.assertManagerVehicleScope(vehicleId, requestingUser);
    return this.prisma.vehicleAvailabilityEvent.findFirst({
      where: { vehicleId, resolvedAt: null },
      include: EVENT_INCLUDE,
      orderBy: { startDate: 'desc' },
    });
  }

  /** IDOR — MANAGER ne voit que les événements des véhicules de son périmètre */
  private async assertManagerVehicleScope(vehicleId: string, requestingUser?: User) {
    if (requestingUser?.role !== UserRole.MANAGER) return;
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, currentManagerId: requestingUser.id },
      select: { id: true },
    });
    if (!vehicle) {
      throw new ForbiddenException('Accès refusé — ce véhicule est hors de votre périmètre');
    }
  }

  // ─── Création (D-15) ───────────────────────────────────────────────────────

  /**
   * Enregistre un événement de disponibilité.
   * Appelé par ImmobilizationsService, SpecialAbsencesService, IncidentsService,
   * MaintenanceService, AccidentsService — jamais directement par le controller.
   */
  async recordEvent(dto: CreateAvailabilityEventDto, actor: User) {
    const event = await this.prisma.vehicleAvailabilityEvent.create({
      data: {
        vehicleId: dto.vehicleId,
        contractId: dto.contractId ?? null,
        driverId: dto.driverId ?? null,
        type: dto.type,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        sourceEntityType: dto.sourceEntityType ?? null,
        sourceEntityId: dto.sourceEntityId ?? null,
        notes: dto.notes ?? null,
        createdById: actor.id,
      },
      include: EVENT_INCLUDE,
    });

    this.auditService
      .log({
        actorId: actor.id,
        action: AuditActions.AVAILABILITY_EVENT_RECORDED,
        entityType: EntityTypes.AVAILABILITY_EVENT,
        entityId: event.id,
        afterJson: { type: dto.type, vehicleId: dto.vehicleId },
      })
      .catch(() => {});

    this.logger.log(
      `Événement disponibilité ${dto.type} enregistré pour véhicule ${dto.vehicleId}`,
    );

    return event;
  }

  // ─── Résolution ────────────────────────────────────────────────────────────

  /**
   * Résout un événement de disponibilité (marque resolvedAt).
   * Peut être appelé directement par les services qui ont ouvert l'événement.
   */
  async resolveEvent(id: string, dto: ResolveAvailabilityEventDto, actor: User) {
    const event = await this.prisma.vehicleAvailabilityEvent.findFirst({ where: { id } });
    if (!event) throw new NotFoundException(`Événement disponibilité ${id} introuvable`);
    if (event.resolvedAt) throw new BadRequestException(`Événement ${id} déjà résolu`);

    const resolved = await this.prisma.vehicleAvailabilityEvent.update({
      where: { id },
      data: {
        resolvedAt: new Date(),
        resolvedById: actor.id,
        endDate: event.endDate ?? new Date(),
        notes: dto.notes
          ? (event.notes ? `${event.notes}\n${dto.notes}` : dto.notes)
          : undefined,
      },
      include: EVENT_INCLUDE,
    });

    this.auditService
      .log({
        actorId: actor.id,
        action: AuditActions.AVAILABILITY_EVENT_RESOLVED,
        entityType: EntityTypes.AVAILABILITY_EVENT,
        entityId: id,
        afterJson: { resolvedAt: resolved.resolvedAt },
      })
      .catch(() => {});

    return resolved;
  }

  /**
   * Résout tous les événements actifs d'un véhicule pour un type donné.
   * Utilisé pour clore automatiquement les événements liés à une immobilisation
   * ou une absence quand celle-ci prend fin.
   */
  async resolveActiveEventsForSource(
    sourceEntityType: string,
    sourceEntityId: string,
    actor: User,
  ): Promise<void> {
    const events = await this.prisma.vehicleAvailabilityEvent.findMany({
      where: { sourceEntityType, sourceEntityId, resolvedAt: null },
    });

    for (const event of events) {
      await this.resolveEvent(event.id, {}, actor);
    }
  }
}
