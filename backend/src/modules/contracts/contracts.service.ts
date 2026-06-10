import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ContractStatus, ContractType, User, UserRole, VehicleStatus, AssignmentSource } from '@prisma/client';
import { CreateContractDto, UpdateContractDto, ContractFiltersDto } from './dto/contract.dto';
import { DailyEntriesService } from '../daily-entries/daily-entries.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditActions } from '../../common/constants/audit-actions';
import { EntityTypes } from '../../common/constants/entity-types';
import { Decimal } from 'decimal.js';

const CONTRACT_INCLUDE = {
  vehicle: { select: { id: true, plateNumber: true, brand: true, model: true, status: true } },
  driver: { select: { id: true, user: { select: { firstName: true, lastName: true, phone: true } } } },
  owner: { select: { id: true, name: true, type: true } },
  deposit: { select: { id: true, status: true, paidAmount: true, remainingAmount: true } },
  _count: { select: { payments: true, dailyEntries: true, charges: true } },
};

@Injectable()
export class ContractsService {
  private readonly logger = new Logger(ContractsService.name);

  constructor(
    private prisma: PrismaService,
    private dailyEntriesService: DailyEntriesService,
    private auditService: AuditService,
    private notificationsService: NotificationsService,
  ) {}

  async findAll(filters: ContractFiltersDto, page = 1, limit = 20, requestingUser: User) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters.type) where.type = filters.type;
    if (filters.vehicleId) where.vehicleId = filters.vehicleId;
    if (filters.driverId) where.driverId = filters.driverId;
    if (filters.ownerId) where.ownerId = filters.ownerId;

    if (requestingUser.role === UserRole.MANAGER) {
      where.managerId = requestingUser.id;
    }
    if (requestingUser.role === UserRole.DRIVER) {
      const driver = await this.prisma.driver.findFirst({ where: { userId: requestingUser.id } });
      if (driver) where.driverId = driver.id;
    }

    const [data, total] = await Promise.all([
      this.prisma.contract.findMany({ where, skip, take: limit, include: CONTRACT_INCLUDE, orderBy: { createdAt: 'desc' } }),
      this.prisma.contract.count({ where }),
    ]);
    return { data, meta: { page, limit, total } };
  }

  async findById(id: string, requestingUser?: User) {
    const contract = await this.prisma.contract.findFirst({ where: { id }, include: CONTRACT_INCLUDE });
    if (!contract) throw new NotFoundException(`Contrat ${id} introuvable`);

    // IDOR — un chauffeur ne peut consulter que ses propres contrats
    if (requestingUser?.role === UserRole.DRIVER) {
      const driver = await this.prisma.driver.findFirst({
        where: { userId: requestingUser.id }, select: { id: true },
      });
      if (!driver || contract.driverId !== driver.id) {
        throw new ForbiddenException('Accès refusé — ce contrat ne vous appartient pas');
      }
    }

    // IDOR — MANAGER ne voit que les contrats de son périmètre
    if (requestingUser?.role === UserRole.MANAGER &&
        contract.managerId !== requestingUser.id) {
      throw new ForbiddenException('Accès refusé — ce contrat est hors de votre périmètre');
    }
    return contract;
  }

  async create(dto: CreateContractDto, actorId: string) {
    if (dto.type === ContractType.PARTNER_FLEET && !dto.ownerId) {
      throw new BadRequestException('Un contrat PARTNER_FLEET requiert un propriétaire (ownerId)');
    }
    if (dto.type === ContractType.OWNERSHIP_PROGRAM && !dto.targetDays) {
      throw new BadRequestException('Un contrat OWNERSHIP_PROGRAM requiert un nombre de jours cibles (targetDays)');
    }
    // Validation SIMPLE_RENTAL — champs requis (D-17)
    if (dto.type === ContractType.SIMPLE_RENTAL) {
      if (!dto.simpleRentalMonthlyAmount) {
        throw new BadRequestException('Un contrat SIMPLE_RENTAL requiert un loyer mensuel (simpleRentalMonthlyAmount)');
      }
      if (!dto.ownerPaymentFrequency) {
        throw new BadRequestException('Un contrat SIMPLE_RENTAL requiert une fréquence de versement (ownerPaymentFrequency)');
      }
    }

    const vehicle = await this.prisma.vehicle.findFirst({ where: { id: dto.vehicleId } });
    if (!vehicle) throw new NotFoundException('Véhicule introuvable');

    // Vérifier que le véhicule n'est pas REPOSSESSED (R-15)
    if (vehicle.status === VehicleStatus.REPOSSESSED) {
      throw new BadRequestException('Impossible de créer un contrat sur un véhicule REPOSSESSED (R-15)');
    }

    return this.prisma.contract.create({
      data: {
        type: dto.type,
        vehicleId: dto.vehicleId,
        managerId: dto.managerId,
        driverId: dto.driverId,
        ownerId: dto.ownerId,
        dailyAmount: new Decimal(dto.dailyAmount),
        targetDays: dto.targetDays,
        restDay: dto.restDay,
        mgmtFeeType: dto.mgmtFeeType,
        mgmtFeeBase: dto.mgmtFeeBase,
        mgmtFeePercentage: dto.mgmtFeePercentage !== undefined ? new Decimal(dto.mgmtFeePercentage) : undefined,
        mgmtFeeFixed: dto.mgmtFeeFixed !== undefined ? new Decimal(dto.mgmtFeeFixed) : undefined,
        notes: dto.notes,
        // Champs SIMPLE_RENTAL (D-17)
        vehicleInvestmentCost: dto.vehicleInvestmentCost !== undefined ? new Decimal(dto.vehicleInvestmentCost) : undefined,
        simpleRentalMonthlyAmount: dto.simpleRentalMonthlyAmount !== undefined ? new Decimal(dto.simpleRentalMonthlyAmount) : undefined,
        ownerPaymentFrequency: dto.ownerPaymentFrequency ?? undefined,
      },
      include: CONTRACT_INCLUDE,
    });
  }

  async update(id: string, dto: UpdateContractDto) {
    const contract = await this.findById(id);
    if (contract.status !== ContractStatus.DRAFT) {
      throw new BadRequestException('Seul un contrat DRAFT peut être modifié librement');
    }
    return this.prisma.contract.update({
      where: { id },
      data: {
        dailyAmount: dto.dailyAmount !== undefined ? new Decimal(dto.dailyAmount) : undefined,
        targetDays: dto.targetDays,
        restDay: dto.restDay,
        mgmtFeeType: dto.mgmtFeeType,
        mgmtFeeBase: dto.mgmtFeeBase,
        mgmtFeePercentage: dto.mgmtFeePercentage !== undefined ? new Decimal(dto.mgmtFeePercentage) : undefined,
        mgmtFeeFixed: dto.mgmtFeeFixed !== undefined ? new Decimal(dto.mgmtFeeFixed) : undefined,
        notes: dto.notes,
      },
      include: CONTRACT_INCLUDE,
    });
  }

  async softDelete(id: string) {
    const contract = await this.findById(id);
    if (contract.status !== ContractStatus.DRAFT) {
      throw new BadRequestException('Seul un contrat DRAFT peut être supprimé');
    }
    return this.prisma.contract.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, deletedAt: true },
    });
  }

  // ─── Activation contrat ────────────────────────────────────────────────────

  /**
   * Active un contrat après vérification de la checklist complète.
   *
   * Pré-requis pour OWNERSHIP_PROGRAM (règle 7 du cahier Phase 3-A) :
   * - kycValidated = true
   * - fieldValidated = true
   * - depositPaid = true   (R-05)
   * - contractSigned = true
   * - managerApproved = true
   * - adminApproved = true
   * - véhicule disponible
   * - chauffeur approuvé
   *
   * Actions post-activation :
   * - status = ACTIVE
   * - Vehicle.currentContractId = contract.id
   * - Vehicle.currentDriverId = driver.id
   * - Vehicle.currentManagerId = contract.managerId
   * - Génère les 7 premiers DailyEntry
   */
  async activate(id: string, actor: User) {
    const contract = await this.prisma.contract.findFirst({
      where: { id },
      include: {
        ...CONTRACT_INCLUDE,
        driver: {
          select: {
            id: true,
            status: true,
            user: { select: { id: true, firstName: true, lastName: true, phone: true } },
          },
        },
        vehicle: { select: { id: true, plateNumber: true, status: true } },
        deposit: { select: { id: true, status: true } },
      },
    });
    if (!contract) throw new NotFoundException(`Contrat ${id} introuvable`);

    if (contract.status !== ContractStatus.DRAFT && contract.status !== ContractStatus.PENDING_APPROVAL) {
      throw new BadRequestException(
        `Seul un contrat DRAFT ou PENDING_APPROVAL peut être activé (statut actuel: ${contract.status})`,
      );
    }

    // ── Checklist OWNERSHIP_PROGRAM ───────────────────────────────────────────
    if (contract.type === ContractType.OWNERSHIP_PROGRAM) {
      const errors: string[] = [];

      if (!contract.kycValidated) errors.push('KYC non validé (kycValidated = false)');
      if (!contract.fieldValidated) errors.push('Validation terrain non effectuée (fieldValidated = false)');
      if (!contract.depositPaid) errors.push('Caution non payée (depositPaid = false) — R-05');
      if (!contract.contractSigned) errors.push('Contrat non signé (contractSigned = false)');
      if (!contract.managerApproved) errors.push('Approbation Manager manquante (managerApproved = false)');
      if (!contract.adminApproved) errors.push('Approbation Admin manquante (adminApproved = false)');

      // Vérifier le chauffeur
      if (!contract.driverId) {
        errors.push('Aucun chauffeur assigné au contrat');
      } else if (contract.driver) {
        const driverStatus = (contract.driver as any).status;
        if (!['APPROVED', 'ACTIVE'].includes(driverStatus)) {
          errors.push(`Chauffeur non approuvé (statut: ${driverStatus})`);
        }
      }

      // Vérifier le véhicule
      const vehicleStatus = (contract.vehicle as any).status;
      if (!['AVAILABLE', 'ASSIGNED'].includes(vehicleStatus)) {
        errors.push(`Véhicule non disponible (statut: ${vehicleStatus})`);
      }

      if (errors.length > 0) {
        throw new BadRequestException({
          message: 'Checklist d\'activation incomplète',
          errors,
        });
      }
    }

    const now = new Date();

    // ── Activation dans une transaction ───────────────────────────────────────
    await this.prisma.$transaction(async (tx) => {
      // 1. Activer le contrat
      await tx.contract.update({
        where: { id },
        data: {
          status: ContractStatus.ACTIVE,
          activatedAt: now,
          startDate: now,
        },
      });

      // 2. Mettre à jour le véhicule (dénormalisation)
      await tx.vehicle.update({
        where: { id: contract.vehicleId },
        data: {
          status: VehicleStatus.ASSIGNED,
          currentContractId: id,
          currentDriverId: contract.driverId ?? undefined,
          currentManagerId: contract.managerId,
        },
      });

      // 3. Mettre à jour le statut du chauffeur si APPROVED → ACTIVE
      if (contract.driverId) {
        const driver = await tx.driver.findFirst({
          where: { id: contract.driverId },
          select: { status: true },
        });
        if (driver?.status === 'APPROVED') {
          await tx.driver.update({
            where: { id: contract.driverId },
            data: { status: 'ACTIVE' },
          });
        }
      }

      // FIX 3 : créer VehicleDriverAssignment si un chauffeur est assigné
      // Guard idempotence : ne pas créer si un assignment actif existe déjà
      if (contract.driverId) {
        const existingAssignment = await tx.vehicleDriverAssignment.findFirst({
          where: { vehicleId: contract.vehicleId, driverId: contract.driverId, isActive: true },
        });
        if (!existingAssignment) {
          await tx.vehicleDriverAssignment.create({
            data: {
              vehicleId: contract.vehicleId,
              driverId: contract.driverId,
              contractId: id,
              startDate: now,
              isActive: true,
              source: AssignmentSource.MANAGER,
            },
          });
        }
      }

      // 4. Générer les 7 premiers DailyEntry
      if (contract.type === ContractType.OWNERSHIP_PROGRAM) {
        await this.dailyEntriesService.initializeContractEntries(
          tx as any,
          id,
          contract.vehicleId,
          contract.driverId ?? null,
          now,
          contract.restDay ?? null,
          7,
        );
      }
    });

    // 5. Audit
    await this.auditService.log({
      action: AuditActions.CONTRACT_ACTIVATED,
      actorId: actor.id,
      entityType: EntityTypes.CONTRACT,
      entityId: id,
      metadata: {
        contractType: contract.type,
        vehicleId: contract.vehicleId,
        driverId: contract.driverId,
      },
    });

    // 6. Notification chauffeur
    if (contract.driverId) {
      const driver = await this.prisma.driver.findFirst({
        where: { id: contract.driverId },
        select: { userId: true },
      });
      if (driver?.userId) {
        await this.notificationsService
          .send({
            userId: driver.userId,
            type: 'CONTRACT_ACTIVATED' as any,
            title: 'Contrat activé',
            message: `Votre contrat sur le véhicule ${(contract.vehicle as any)?.plateNumber} est maintenant actif`,
            priority: 'HIGH' as any,
            entityType: EntityTypes.CONTRACT,
            entityId: id,
          })
          .catch(() => {});
      }
    }

    return this.findById(id);
  }

  // ─── Suspension / Clôture ──────────────────────────────────────────────────

  async suspend(id: string, reason: string, actor: User) {
    const contract = await this.findById(id);
    if (contract.status !== ContractStatus.ACTIVE) {
      throw new BadRequestException('Seul un contrat ACTIVE peut être suspendu');
    }

    const updated = await this.prisma.contract.update({
      where: { id },
      data: { status: ContractStatus.SUSPENDED, notes: reason },
      include: CONTRACT_INCLUDE,
    });

    await this.auditService.log({
      action: AuditActions.CONTRACT_SUSPENDED,
      actorId: actor.id,
      entityType: EntityTypes.CONTRACT,
      entityId: id,
      metadata: { reason },
    });

    return updated;
  }

  async close(id: string, actor: User) {
    const contract = await this.findById(id);

    if (!['ACTIVE', 'SUSPENDED'].includes(contract.status)) {
      throw new BadRequestException('Seul un contrat ACTIVE ou SUSPENDED peut être clôturé');
    }

    const closeDate = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.contract.update({
        where: { id },
        data: {
          status: ContractStatus.TERMINATED,
          closedAt: closeDate,
          endDate: closeDate,
        },
      });

      // Libérer le véhicule
      await tx.vehicle.update({
        where: { id: contract.vehicleId },
        data: {
          status: VehicleStatus.AVAILABLE,
          currentContractId: null,
          currentDriverId: null,
        },
      });

      // FIX 3 : fermer l'assignment actif du chauffeur
      if (contract.driverId) {
        await tx.vehicleDriverAssignment.updateMany({
          where: { contractId: id, isActive: true },
          data: { isActive: false, endDate: closeDate },
        });
      }
    });

    await this.auditService.log({
      action: AuditActions.CONTRACT_CLOSED,
      actorId: actor.id,
      entityType: EntityTypes.CONTRACT,
      entityId: id,
      metadata: { vehicleId: contract.vehicleId },
    });

    return this.findById(id);
  }

  // ─── Mise à jour checklist ─────────────────────────────────────────────────

  /**
   * Met à jour les champs de la checklist pré-activation.
   * Appelé par les services KYC, FieldValidation, Deposit, etc.
   */
  async updateChecklist(
    id: string,
    fields: Partial<{
      kycValidated: boolean;
      fieldValidated: boolean;
      depositPaid: boolean;
      contractSigned: boolean;
      managerApproved: boolean;
      adminApproved: boolean;
    }>,
  ) {
    return this.prisma.contract.update({
      where: { id },
      data: fields,
      select: {
        id: true,
        kycValidated: true,
        fieldValidated: true,
        depositPaid: true,
        contractSigned: true,
        managerApproved: true,
        adminApproved: true,
        status: true,
      },
    });
  }
}
