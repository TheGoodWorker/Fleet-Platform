import {
  Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import {
  SpecialAbsenceStatus, NotificationType, NotificationPriority, User, UserRole,
  VehicleAvailabilityEventType, DayStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AvailabilityService } from '../availability/availability.service';
import { AuditActions } from '../../common/constants/audit-actions';
import { EntityTypes } from '../../common/constants/entity-types';
import {
  RequestSpecialAbsenceDto, ReviewAbsenceDto, SmValidateAbsenceDto,
  CloseAbsenceDto, SpecialAbsenceFiltersDto,
} from './dto/special-absence.dto';

const ABSENCE_INCLUDE = {
  driver: { select: { id: true, userId: true } },
  contract: { select: { id: true, type: true, vehicleId: true, managerId: true } },
};

@Injectable()
export class SpecialAbsencesService {
  private readonly logger = new Logger(SpecialAbsencesService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private notificationsService: NotificationsService,
    private availabilityService: AvailabilityService,
  ) {}

  // ─── Lecture ───────────────────────────────────────────────────────────────

  async findAll(filters: SpecialAbsenceFiltersDto, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (filters.driverId) where.driverId = filters.driverId;
    if (filters.contractId) where.contractId = filters.contractId;
    if (filters.status) where.status = filters.status;

    const [data, total] = await Promise.all([
      this.prisma.specialAbsence.findMany({
        where, skip, take: limit,
        include: ABSENCE_INCLUDE,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.specialAbsence.count({ where }),
    ]);
    return { data, meta: { page, limit, total } };
  }

  async findById(id: string, requestingUser?: User) {
    const absence = await this.prisma.specialAbsence.findFirst({
      where: { id },
      include: ABSENCE_INCLUDE,
    });
    if (!absence) throw new NotFoundException(`Absence spéciale ${id} introuvable`);

    // IDOR — un chauffeur ne peut consulter que ses propres absences
    if (requestingUser?.role === UserRole.DRIVER &&
        absence.driver.userId !== requestingUser.id) {
      throw new ForbiddenException('Accès refusé — cette absence ne vous concerne pas');
    }
    return absence;
  }

  // ─── Demande (chauffeur) ───────────────────────────────────────────────────

  async request(dto: RequestSpecialAbsenceDto, actor: User) {
    const driver = await this.prisma.driver.findFirst({ where: { id: dto.driverId } });
    if (!driver) throw new NotFoundException('Chauffeur introuvable');

    // IDOR — un chauffeur ne peut demander une absence que pour lui-même
    if (actor.role === UserRole.DRIVER && driver.userId !== actor.id) {
      throw new ForbiddenException(
        'Accès refusé — vous ne pouvez demander une absence que pour vous-même',
      );
    }

    const contract = await this.prisma.contract.findFirst({ where: { id: dto.contractId } });
    if (!contract) throw new NotFoundException('Contrat introuvable');

    const absence = await this.prisma.specialAbsence.create({
      data: {
        driverId: dto.driverId,
        contractId: dto.contractId,
        reason: dto.reason,
        details: dto.details ?? null,
        startDate: new Date(dto.startDate),
        estimatedDays: dto.estimatedDays,
        status: SpecialAbsenceStatus.PENDING,
      },
      include: ABSENCE_INCLUDE,
    });

    this.auditService
      .log({
        actorId: actor.id,
        action: AuditActions.SPECIAL_ABSENCE_REQUESTED,
        entityType: EntityTypes.SPECIAL_ABSENCE,
        entityId: absence.id,
        afterJson: { driverId: dto.driverId, reason: dto.reason, estimatedDays: dto.estimatedDays },
      })
      .catch(() => {});

    // Notifier le manager du contrat
    if (contract.managerId) {
      this.notificationsService
        .send({
          userId: contract.managerId,
          type: NotificationType.SPECIAL_ABSENCE_REQUESTED,
          title: 'Demande d\'absence spéciale',
          message: `Le chauffeur ${dto.driverId} demande une absence de ${dto.estimatedDays} jour(s). Raison : ${dto.reason}`,
          priority: NotificationPriority.NORMAL,
          entityType: EntityTypes.SPECIAL_ABSENCE,
          entityId: absence.id,
        })
        .catch(() => {});
    }

    return absence;
  }

  // ─── Examen manager ────────────────────────────────────────────────────────

  async managerReview(id: string, dto: ReviewAbsenceDto, actor: User) {
    const absence = await this.prisma.specialAbsence.findFirst({
      where: { id },
      include: ABSENCE_INCLUDE,
    });
    if (!absence) throw new NotFoundException('Absence spéciale introuvable');
    if (absence.status !== SpecialAbsenceStatus.PENDING) {
      throw new BadRequestException(
        `Absence ${absence.status} — examen manager impossible`,
      );
    }

    const now = new Date();

    if (dto.decision === 'approved') {
      // Manager approuve seul (absences courtes / raisons simples)
      const updated = await this.prisma.specialAbsence.update({
        where: { id },
        data: {
          status: SpecialAbsenceStatus.APPROVED,
          reviewedById: actor.id,
          reviewedAt: now,
          reviewComment: dto.reviewComment ?? null,
        },
        include: ABSENCE_INCLUDE,
      });

      await this.onApproved(updated, actor);
      return updated;
    } else {
      // Escalade vers Super Manager
      const updated = await this.prisma.specialAbsence.update({
        where: { id },
        data: {
          status: SpecialAbsenceStatus.MANAGER_REVIEWED,
          reviewedById: actor.id,
          reviewedAt: now,
          reviewComment: dto.reviewComment ?? null,
        },
        include: ABSENCE_INCLUDE,
      });

      // Notifier les super managers
      const superManagers = await this.prisma.user.findMany({
        where: { role: 'SUPER_MANAGER', status: 'ACTIVE', deletedAt: null },
        select: { id: true },
        take: 5,
      });
      for (const sm of superManagers) {
        this.notificationsService
          .send({
            userId: sm.id,
            type: NotificationType.SPECIAL_ABSENCE_REQUESTED,
            title: 'Absence spéciale à valider (SM)',
            message: `Le manager a soumis une demande d'absence pour validation Super Manager.`,
            priority: NotificationPriority.NORMAL,
            entityType: EntityTypes.SPECIAL_ABSENCE,
            entityId: id,
          })
          .catch(() => {});
      }

      return updated;
    }
  }

  // ─── Validation Super Manager ──────────────────────────────────────────────

  async smValidate(id: string, dto: SmValidateAbsenceDto, actor: User) {
    const absence = await this.prisma.specialAbsence.findFirst({
      where: { id },
      include: ABSENCE_INCLUDE,
    });
    if (!absence) throw new NotFoundException('Absence spéciale introuvable');

    const allowedStatuses: SpecialAbsenceStatus[] = [
      SpecialAbsenceStatus.MANAGER_REVIEWED,
      SpecialAbsenceStatus.PENDING, // SM peut approuver directement
    ];
    if (!allowedStatuses.includes(absence.status)) {
      throw new BadRequestException(
        `Absence ${absence.status} — validation SM impossible`,
      );
    }

    if (dto.decision === 'approved') {
      const updated = await this.prisma.specialAbsence.update({
        where: { id },
        data: {
          status: SpecialAbsenceStatus.APPROVED,
          smValidatedById: actor.id,
          smValidatedAt: new Date(),
        },
        include: ABSENCE_INCLUDE,
      });

      await this.onApproved(updated, actor);
      return updated;
    } else {
      const updated = await this.prisma.specialAbsence.update({
        where: { id },
        data: {
          status: SpecialAbsenceStatus.REJECTED,
          smValidatedById: actor.id,
          smValidatedAt: new Date(),
          reviewComment: dto.rejectionReason ?? absence.reviewComment,
        },
        include: ABSENCE_INCLUDE,
      });

      this.auditService
        .log({
          actorId: actor.id,
          action: AuditActions.SPECIAL_ABSENCE_REJECTED,
          entityType: EntityTypes.SPECIAL_ABSENCE,
          entityId: id,
        })
        .catch(() => {});

      await this.notifyDriver(absence, NotificationType.SPECIAL_ABSENCE_REJECTED, dto.rejectionReason);
      return updated;
    }
  }

  // ─── Annulation (chauffeur) ────────────────────────────────────────────────

  async cancel(id: string, actor: User) {
    const absence = await this.prisma.specialAbsence.findFirst({ where: { id } });
    if (!absence) throw new NotFoundException('Absence spéciale introuvable');

    const cancellableStatuses: SpecialAbsenceStatus[] = [
      SpecialAbsenceStatus.PENDING,
      SpecialAbsenceStatus.MANAGER_REVIEWED,
    ];
    if (!cancellableStatuses.includes(absence.status)) {
      throw new BadRequestException(
        `Absence ${absence.status} — annulation impossible`,
      );
    }

    const updated = await this.prisma.specialAbsence.update({
      where: { id },
      data: { status: SpecialAbsenceStatus.CANCELLED },
      include: ABSENCE_INCLUDE,
    });

    this.auditService
      .log({
        actorId: actor.id,
        action: AuditActions.SPECIAL_ABSENCE_CANCELLED,
        entityType: EntityTypes.SPECIAL_ABSENCE,
        entityId: id,
      })
      .catch(() => {});

    // Résoudre l'événement de disponibilité si déjà créé
    this.availabilityService
      .resolveActiveEventsForSource(EntityTypes.SPECIAL_ABSENCE, id, actor)
      .catch(() => {});

    return updated;
  }

  // ─── Clôture (fin effective) ───────────────────────────────────────────────

  async close(id: string, dto: CloseAbsenceDto, actor: User) {
    const absence = await this.prisma.specialAbsence.findFirst({ where: { id } });
    if (!absence) throw new NotFoundException('Absence spéciale introuvable');
    if (absence.status !== SpecialAbsenceStatus.APPROVED) {
      throw new BadRequestException('Seule une absence approuvée peut être clôturée');
    }

    const actualEnd = dto.actualEnd ? new Date(dto.actualEnd) : new Date();

    const updated = await this.prisma.specialAbsence.update({
      where: { id },
      data: { actualEnd },
      include: ABSENCE_INCLUDE,
    });

    // Résoudre l'événement de disponibilité
    this.availabilityService
      .resolveActiveEventsForSource(EntityTypes.SPECIAL_ABSENCE, id, actor)
      .catch(() => {});

    return updated;
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private async onApproved(absence: any, actor: User): Promise<void> {
    this.auditService
      .log({
        actorId: actor.id,
        action: AuditActions.SPECIAL_ABSENCE_APPROVED,
        entityType: EntityTypes.SPECIAL_ABSENCE,
        entityId: absence.id,
        afterJson: { estimatedDays: absence.estimatedDays, reason: absence.reason },
      })
      .catch(() => {});

    // FIX 9 : mettre à jour les DailyEntry concernées → EXCUSED
    // EXCUSED days ne comptent pas dans validatedDays (règle R-03)
    if (absence.contractId) {
      const startDate = new Date(absence.startDate);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + absence.estimatedDays);

      this.prisma.dailyEntry.updateMany({
        where: {
          contractId: absence.contractId,
          date: {
            gte: startDate,
            lt: endDate,
          },
          status: { not: DayStatus.VALIDATED }, // Ne pas toucher les jours déjà payés
        },
        data: { status: DayStatus.EXCUSED },
      }).catch((err) => this.logger.warn(`Mise à jour DailyEntry EXCUSED échouée: ${err?.message}`));
    }

    // D-15 : enregistrer événement de disponibilité
    const endDate = new Date(absence.startDate);
    endDate.setDate(endDate.getDate() + absence.estimatedDays);

    this.availabilityService
      .recordEvent(
        {
          vehicleId: absence.contract?.vehicleId,
          contractId: absence.contractId,
          driverId: absence.driverId,
          type: VehicleAvailabilityEventType.SPECIAL_ABSENCE,
          startDate: absence.startDate.toISOString(),
          endDate: endDate.toISOString(),
          sourceEntityType: EntityTypes.SPECIAL_ABSENCE,
          sourceEntityId: absence.id,
          notes: `Absence spéciale : ${absence.reason}`,
        },
        actor,
      )
      .catch((err) => this.logger.warn(`Availability event failed: ${err?.message}`));

    await this.notifyDriver(absence, NotificationType.SPECIAL_ABSENCE_APPROVED);
  }

  private async notifyDriver(
    absence: any,
    type: NotificationType,
    reason?: string,
  ): Promise<void> {
    if (!absence.driver?.userId) return;
    const msg = type === NotificationType.SPECIAL_ABSENCE_APPROVED
      ? `Votre absence de ${absence.estimatedDays} jour(s) a été approuvée.`
      : `Votre demande d'absence a été refusée.${reason ? ` Raison : ${reason}` : ''}`;

    this.notificationsService
      .send({
        userId: absence.driver.userId,
        type,
        title: type === NotificationType.SPECIAL_ABSENCE_APPROVED
          ? 'Absence approuvée'
          : 'Absence refusée',
        message: msg,
        priority: NotificationPriority.NORMAL,
        entityType: EntityTypes.SPECIAL_ABSENCE,
        entityId: absence.id,
      })
      .catch(() => {});
  }
}
