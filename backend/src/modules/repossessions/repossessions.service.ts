import {
  Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import {
  RepossessionStatus, VehicleStatus, ContractStatus,
  NotificationType, NotificationPriority, UserRole, User,
  AssignmentSource,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditActions } from '../../common/constants/audit-actions';
import { EntityTypes } from '../../common/constants/entity-types';
import {
  CreateRepossessionDto, SmValidateRepossessionDto,
  AdminApproveRepossessionDto, RepossessionFiltersDto,
} from './dto/repossession.dto';

const REPOSSESSION_INCLUDE = {
  vehicle: { select: { id: true, plateNumber: true, brand: true, model: true, status: true } },
  contract: { select: { id: true, type: true, status: true, driverId: true } },
};

/**
 * RepossessionsService
 *
 * R-14 : Workflow 3 niveaux strict
 *   1. Manager propose          → PROPOSED
 *   2. Super Manager valide     → SM_VALIDATED
 *   3. Admin approuve           → ADMIN_APPROVED
 *      → vehicle.status = REPOSSESSED
 *      → contract.status = VEHICLE_REPOSSESSED
 *      → VehicleDriverAssignment fermé
 *
 * R-15 : Un véhicule REPOSSESSED ne peut pas recevoir de nouveau contrat
 *        (enforced dans ContractsService.create())
 */
@Injectable()
export class RepossessionsService {
  private readonly logger = new Logger(RepossessionsService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private notificationsService: NotificationsService,
  ) {}

  // ─── Lecture ───────────────────────────────────────────────────────────────

  async findAll(filters: RepossessionFiltersDto, page = 1, limit = 20, requestingUser?: User) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (filters.vehicleId) where.vehicleId = filters.vehicleId;
    if (filters.status) where.status = filters.status;

    // IDOR — MANAGER ne voit que les dossiers des véhicules de son périmètre
    if (requestingUser?.role === UserRole.MANAGER) {
      where.vehicle = { currentManagerId: requestingUser.id };
    }

    const [data, total] = await Promise.all([
      this.prisma.vehicleRepossession.findMany({
        where, skip, take: limit,
        include: REPOSSESSION_INCLUDE,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.vehicleRepossession.count({ where }),
    ]);
    return { data, meta: { page, limit, total } };
  }

  async findById(id: string, requestingUser?: User) {
    const repossession = await this.prisma.vehicleRepossession.findFirst({
      where: { id },
      include: REPOSSESSION_INCLUDE,
    });
    if (!repossession) throw new NotFoundException(`Dossier reprise ${id} introuvable`);

    // IDOR — MANAGER ne voit que les dossiers des véhicules de son périmètre
    if (requestingUser?.role === UserRole.MANAGER) {
      const vehicle = await this.prisma.vehicle.findFirst({
        where: { id: repossession.vehicleId, currentManagerId: requestingUser.id },
        select: { id: true },
      });
      if (!vehicle) {
        throw new ForbiddenException('Accès refusé — ce dossier reprise est hors de votre périmètre');
      }
    }
    return repossession;
  }

  // ─── Étape 1 : Manager propose ─────────────────────────────────────────────

  async propose(dto: CreateRepossessionDto, actor: User) {
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id: dto.vehicleId } });
    if (!vehicle) throw new NotFoundException('Véhicule introuvable');

    // IDOR — MANAGER ne peut proposer une reprise que sur ses véhicules
    if (actor.role === UserRole.MANAGER && vehicle.currentManagerId !== actor.id) {
      throw new ForbiddenException('Accès refusé — ce véhicule est hors de votre périmètre');
    }

    if (vehicle.status === VehicleStatus.REPOSSESSED) {
      throw new BadRequestException('Ce véhicule est déjà REPOSSESSED');
    }

    // Vérifier qu'aucune reprise active n'existe pour ce véhicule
    const existingActive = await this.prisma.vehicleRepossession.findFirst({
      where: {
        vehicleId: dto.vehicleId,
        status: { in: [RepossessionStatus.PROPOSED, RepossessionStatus.SM_VALIDATED] },
      },
    });
    if (existingActive) {
      throw new BadRequestException(
        `Une demande de reprise est déjà en cours pour ce véhicule (id: ${existingActive.id}, statut: ${existingActive.status})`,
      );
    }

    // Si un contractId est fourni, vérifier qu'il existe
    if (dto.contractId) {
      const contract = await this.prisma.contract.findFirst({ where: { id: dto.contractId } });
      if (!contract) throw new NotFoundException('Contrat introuvable');
    }

    const repossession = await this.prisma.vehicleRepossession.create({
      data: {
        vehicleId: dto.vehicleId,
        contractId: dto.contractId ?? null,
        status: RepossessionStatus.PROPOSED,
        reason: dto.reason,
        details: dto.details ?? null,
        proposedById: actor.id,
        proposedAt: new Date(),
      },
      include: REPOSSESSION_INCLUDE,
    });

    this.auditService
      .log({
        actorId: actor.id,
        action: AuditActions.REPOSSESSION_PROPOSED,
        entityType: EntityTypes.REPOSSESSION,
        entityId: repossession.id,
        afterJson: { vehicleId: dto.vehicleId, reason: dto.reason },
      })
      .catch(() => {});

    // Notifier les Super Managers (R-14)
    const superManagers = await this.prisma.user.findMany({
      where: { role: UserRole.SUPER_MANAGER, status: 'ACTIVE', deletedAt: null },
      select: { id: true },
      take: 5,
    });
    for (const sm of superManagers) {
      this.notificationsService
        .send({
          userId: sm.id,
          type: NotificationType.REPOSSESSION_REQUESTED,
          title: 'Demande de reprise à valider',
          message: `Manager ${actor.id} propose la reprise du véhicule ${vehicle.plateNumber}. Raison : ${dto.reason}`,
          priority: NotificationPriority.HIGH,
          entityType: EntityTypes.REPOSSESSION,
          entityId: repossession.id,
        })
        .catch(() => {});
    }

    return repossession;
  }

  // ─── Étape 2 : Super Manager valide ────────────────────────────────────────

  async smValidate(id: string, dto: SmValidateRepossessionDto, actor: User) {
    const repossession = await this.prisma.vehicleRepossession.findFirst({ where: { id } });
    if (!repossession) throw new NotFoundException('Dossier reprise introuvable');

    if (repossession.status !== RepossessionStatus.PROPOSED) {
      throw new BadRequestException(
        `Reprise ${repossession.status} — validation SM impossible (attendu: PROPOSED)`,
      );
    }

    if (dto.decision === 'rejected') {
      const updated = await this.prisma.vehicleRepossession.update({
        where: { id },
        data: {
          status: RepossessionStatus.CONTRACT_CLOSED, // Terminal — rejet
          smValidatedById: actor.id,
          smValidatedAt: new Date(),
          notes: dto.notes ?? null,
          closedAt: new Date(),
        },
        include: REPOSSESSION_INCLUDE,
      });

      this.auditService
        .log({
          actorId: actor.id,
          action: AuditActions.REPOSSESSION_SM_VALIDATED,
          entityType: EntityTypes.REPOSSESSION,
          entityId: id,
          afterJson: { decision: 'rejected', notes: dto.notes },
        })
        .catch(() => {});

      return updated;
    }

    const updated = await this.prisma.vehicleRepossession.update({
      where: { id },
      data: {
        status: RepossessionStatus.SM_VALIDATED,
        smValidatedById: actor.id,
        smValidatedAt: new Date(),
        notes: dto.notes ?? null,
      },
      include: REPOSSESSION_INCLUDE,
    });

    this.auditService
      .log({
        actorId: actor.id,
        action: AuditActions.REPOSSESSION_SM_VALIDATED,
        entityType: EntityTypes.REPOSSESSION,
        entityId: id,
        afterJson: { decision: 'approved' },
      })
      .catch(() => {});

    // Notifier les Admins
    const admins = await this.prisma.user.findMany({
      where: { role: UserRole.ADMIN, status: 'ACTIVE', deletedAt: null },
      select: { id: true },
      take: 3,
    });
    for (const admin of admins) {
      this.notificationsService
        .send({
          userId: admin.id,
          type: NotificationType.REPOSSESSION_REQUESTED,
          title: 'Reprise à approuver (Admin)',
          message: `Le Super Manager a validé la reprise du véhicule ${repossession.vehicleId}. Approbation Admin requise.`,
          priority: NotificationPriority.HIGH,
          entityType: EntityTypes.REPOSSESSION,
          entityId: id,
        })
        .catch(() => {});
    }

    return updated;
  }

  // ─── Étape 3 : Admin approuve ──────────────────────────────────────────────

  async adminApprove(id: string, dto: AdminApproveRepossessionDto, actor: User) {
    const repossession = await this.prisma.vehicleRepossession.findFirst({
      where: { id },
      include: { contract: { select: { id: true, driverId: true, status: true } } },
    });
    if (!repossession) throw new NotFoundException('Dossier reprise introuvable');

    if (repossession.status !== RepossessionStatus.SM_VALIDATED) {
      throw new BadRequestException(
        `Reprise ${repossession.status} — approbation Admin impossible (attendu: SM_VALIDATED)`,
      );
    }

    if (dto.decision === 'rejected') {
      const updated = await this.prisma.vehicleRepossession.update({
        where: { id },
        data: {
          status: RepossessionStatus.CONTRACT_CLOSED,
          adminApprovedById: actor.id,
          adminApprovedAt: new Date(),
          notes: dto.notes ?? null,
          closedAt: new Date(),
        },
        include: REPOSSESSION_INCLUDE,
      });

      this.auditService
        .log({
          actorId: actor.id,
          action: AuditActions.REPOSSESSION_ADMIN_APPROVED,
          entityType: EntityTypes.REPOSSESSION,
          entityId: id,
          afterJson: { decision: 'rejected' },
        })
        .catch(() => {});

      return updated;
    }

    const now = new Date();

    // R-14 : Approbation Admin → exécuter la reprise
    await this.prisma.$transaction(async (tx) => {
      // 1. Mettre à jour la reprise
      await tx.vehicleRepossession.update({
        where: { id },
        data: {
          status: RepossessionStatus.ADMIN_APPROVED,
          adminApprovedById: actor.id,
          adminApprovedAt: now,
          repossessionDate: dto.repossessionDate ? new Date(dto.repossessionDate) : now,
          notes: dto.notes ?? null,
        },
      });

      // 2. R-14 : vehicle.status = REPOSSESSED
      await tx.vehicle.update({
        where: { id: repossession.vehicleId },
        data: {
          status: VehicleStatus.REPOSSESSED,
          currentContractId: null,
          currentDriverId: null,
        },
      });

      // 3. R-14 : contract.status = VEHICLE_REPOSSESSED
      if (repossession.contractId) {
        await tx.contract.update({
          where: { id: repossession.contractId },
          data: {
            status: ContractStatus.VEHICLE_REPOSSESSED,
            closedAt: now,
            endDate: now,
          },
        });

        // 4. Fermer l'assignment actif du chauffeur
        if (repossession.contract?.driverId) {
          await tx.vehicleDriverAssignment.updateMany({
            where: { contractId: repossession.contractId, isActive: true },
            data: { isActive: false, endDate: now },
          });
        }
      }
    });

    this.auditService
      .log({
        actorId: actor.id,
        action: AuditActions.REPOSSESSION_ADMIN_APPROVED,
        entityType: EntityTypes.REPOSSESSION,
        entityId: id,
        afterJson: {
          vehicleId: repossession.vehicleId,
          contractId: repossession.contractId,
          repossessionDate: dto.repossessionDate,
        },
      })
      .catch(() => {});

    // Notifier les Super Managers de la finalisation
    const superManagers = await this.prisma.user.findMany({
      where: { role: UserRole.SUPER_MANAGER, status: 'ACTIVE', deletedAt: null },
      select: { id: true },
      take: 5,
    });
    for (const sm of superManagers) {
      this.notificationsService
        .send({
          userId: sm.id,
          type: NotificationType.REPOSSESSION_APPROVED,
          title: 'Reprise approuvée par l\'Admin',
          message: `La reprise du véhicule ${repossession.vehicleId} a été approuvée. Statut → REPOSSESSED.`,
          priority: NotificationPriority.HIGH,
          entityType: EntityTypes.REPOSSESSION,
          entityId: id,
        })
        .catch(() => {});
    }

    return this.findById(id);
  }
}
