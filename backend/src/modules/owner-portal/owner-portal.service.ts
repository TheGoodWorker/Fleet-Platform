import {
  Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import {
  ContractType, RentalPaymentStatus, NotificationType, NotificationPriority, User,
} from '@prisma/client';
import { Decimal } from 'decimal.js';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditActions } from '../../common/constants/audit-actions';
import { EntityTypes } from '../../common/constants/entity-types';
import {
  UpdateVisibilitySettingsDto, RecordRentalPaymentDto,
  UpdateRentalPaymentStatusDto, RentalPaymentFiltersDto,
  OwnerDashboardDto, OwnerFinancialSummaryDto,
} from './dto/owner-portal.dto';

@Injectable()
export class OwnerPortalService {
  private readonly logger = new Logger(OwnerPortalService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private notificationsService: NotificationsService,
  ) {}

  // ─── Paramètres de visibilité ──────────────────────────────────────────────

  async getVisibilitySettings(contractId: string) {
    const settings = await this.prisma.ownerPortalVisibilitySettings.findFirst({
      where: { contractId },
    });
    if (!settings) throw new NotFoundException(`Paramètres de visibilité pour le contrat ${contractId} introuvables`);
    return settings;
  }

  async upsertVisibilitySettings(
    contractId: string,
    dto: UpdateVisibilitySettingsDto,
    actor: User,
  ) {
    const contract = await this.prisma.contract.findFirst({ where: { id: contractId } });
    if (!contract) throw new NotFoundException('Contrat introuvable');

    // D-16 : Pour SIMPLE_RENTAL, les flags financiers chauffeur doivent rester false
    if (contract.type === ContractType.SIMPLE_RENTAL) {
      if (dto.showDailyEntries || dto.showDriverPayments || dto.showCharges || dto.showGrossRevenue) {
        throw new BadRequestException(
          'D-16 : Pour un contrat SIMPLE_RENTAL, les données financières chauffeur (dailyEntries, driverPayments, charges, grossRevenue) ne peuvent pas être exposées au propriétaire.',
        );
      }
    }

    const settings = await this.prisma.ownerPortalVisibilitySettings.upsert({
      where: { contractId },
      create: {
        contractId,
        showDailyEntries: dto.showDailyEntries ?? false,
        showDriverPayments: dto.showDriverPayments ?? false,
        showCharges: dto.showCharges ?? false,
        showGrossRevenue: dto.showGrossRevenue ?? false,
        showDriverName: dto.showDriverName ?? true,
        showVehicleDetails: dto.showVehicleDetails ?? true,
        showGps: dto.showGps ?? false,
        showDocuments: dto.showDocuments ?? false,
        showAccidents: dto.showAccidents ?? false,
        showMaintenance: dto.showMaintenance ?? false,
        showNotifications: dto.showNotifications ?? true,
        showRoi: dto.showRoi ?? false,
      },
      update: {
        ...(dto.showDailyEntries !== undefined && { showDailyEntries: dto.showDailyEntries }),
        ...(dto.showDriverPayments !== undefined && { showDriverPayments: dto.showDriverPayments }),
        ...(dto.showCharges !== undefined && { showCharges: dto.showCharges }),
        ...(dto.showGrossRevenue !== undefined && { showGrossRevenue: dto.showGrossRevenue }),
        ...(dto.showDriverName !== undefined && { showDriverName: dto.showDriverName }),
        ...(dto.showVehicleDetails !== undefined && { showVehicleDetails: dto.showVehicleDetails }),
        ...(dto.showGps !== undefined && { showGps: dto.showGps }),
        ...(dto.showDocuments !== undefined && { showDocuments: dto.showDocuments }),
        ...(dto.showAccidents !== undefined && { showAccidents: dto.showAccidents }),
        ...(dto.showMaintenance !== undefined && { showMaintenance: dto.showMaintenance }),
        ...(dto.showNotifications !== undefined && { showNotifications: dto.showNotifications }),
        ...(dto.showRoi !== undefined && { showRoi: dto.showRoi }),
      },
    });

    this.auditService
      .log({
        actorId: actor.id,
        action: AuditActions.OWNER_VISIBILITY_CONFIGURED,
        entityType: EntityTypes.CONTRACT,
        entityId: contractId,
        afterJson: { ...dto },
      })
      .catch(() => {});

    return settings;
  }

  // ─── Dashboard propriétaire ────────────────────────────────────────────────

  async getDashboard(contractId: string, ownerUserId: string): Promise<OwnerDashboardDto> {
    // Charger le contrat avec le propriétaire et les paramètres de visibilité
    const contract = await this.prisma.contract.findFirst({
      where: { id: contractId },
      include: {
        vehicle: { select: { id: true, plateNumber: true, brand: true, model: true } },
        driver: { select: { id: true } },
        owner: { select: { id: true, userId: true } },
        ownerPortalSettings: true,
        ownerRentalPayments: { orderBy: { periodYear: 'desc' }, take: 12 },
      },
    });
    if (!contract) throw new NotFoundException('Contrat introuvable');

    // Vérifier que le propriétaire est bien l'owner du contrat
    if (contract.owner?.userId !== ownerUserId) {
      throw new ForbiddenException('Accès au portail propriétaire refusé pour ce contrat');
    }

    const s = contract.ownerPortalSettings;

    // ── Détails véhicule ──────────────────────────────────────────────────────
    const vehicleDetails = s?.showVehicleDetails && contract.vehicle
      ? contract.vehicle
      : null;

    // ── Nom chauffeur ─────────────────────────────────────────────────────────
    let driverName: string | null = null;
    if (s?.showDriverName && contract.driver) {
      const driverUser = await this.prisma.driver.findFirst({
        where: { id: contract.driver.id },
        include: { user: { select: { firstName: true, lastName: true } } },
      });
      driverName = driverUser?.user
        ? `${driverUser.user.firstName} ${driverUser.user.lastName}`
        : null;
    }

    // ── Versements SIMPLE_RENTAL ───────────────────────────────────────────────
    let rentalPayments: OwnerDashboardDto['rentalPayments'] = null;
    if (contract.type === ContractType.SIMPLE_RENTAL) {
      const payments = contract.ownerRentalPayments;
      rentalPayments = {
        total: payments.length,
        paid: payments.filter((p) => p.status === RentalPaymentStatus.PAID).length,
        pending: payments.filter((p) => p.status === RentalPaymentStatus.PENDING).length,
        late: payments.filter((p) => p.status === RentalPaymentStatus.LATE).length,
        history: payments,
      };
    }

    // ── ROI (SIMPLE_RENTAL — Arbitrage I : ROI brut) ───────────────────────────
    let roi: OwnerDashboardDto['roi'] = null;
    if (s?.showRoi && contract.type === ContractType.SIMPLE_RENTAL) {
      const investmentCost = contract.vehicleInvestmentCost
        ? new Decimal(contract.vehicleInvestmentCost.toString()).toNumber()
        : null;

      const payments = contract.ownerRentalPayments;
      const cumulativeExpected = payments.reduce(
        (sum, p) => sum + new Decimal(p.expectedAmount.toString()).toNumber(),
        0,
      );
      const cumulativePaid = payments
        .filter((p) => p.status === RentalPaymentStatus.PAID)
        .reduce(
          (sum, p) => sum + (p.actualAmount ? new Decimal(p.actualAmount.toString()).toNumber() : 0),
          0,
        );

      const roiPercent =
        investmentCost && investmentCost > 0
          ? ((cumulativePaid - investmentCost) / investmentCost) * 100
          : null;

      roi = { investmentCost, cumulativeExpected, cumulativePaid, roiPercent };
    }

    // ── Documents ─────────────────────────────────────────────────────────────
    let documents: any[] | null = null;
    if (s?.showDocuments && contract.vehicle) {
      documents = await this.prisma.document.findMany({
        where: { entityType: 'VEHICLE', entityId: contract.vehicle.id, isLatest: true },
        select: { id: true, type: true, title: true, status: true, validUntil: true },
      });
    }

    // ── Accidents en cours ─────────────────────────────────────────────────────
    let accidents: any[] | null = null;
    if (s?.showAccidents && contract.vehicle) {
      accidents = await this.prisma.accidentCase.findMany({
        where: {
          incident: { vehicleId: contract.vehicle.id },
          status: 'OPEN',
        },
        select: { id: true, currentStep: true, status: true, createdAt: true },
        take: 5,
      });
    }

    // ── Maintenance ────────────────────────────────────────────────────────────
    let maintenance: any[] | null = null;
    if (s?.showMaintenance && contract.vehicle) {
      maintenance = await this.prisma.maintenanceRecord.findMany({
        where: { vehicleId: contract.vehicle.id },
        select: { id: true, type: true, status: true, scheduledAt: true, completedAt: true, cost: true },
        orderBy: { scheduledAt: 'desc' },
        take: 10,
      });
    }

    // ── Notifications propriétaire ─────────────────────────────────────────────
    let notifications: any[] | null = null;
    if (s?.showNotifications && contract.owner?.userId) {
      notifications = await this.prisma.notification.findMany({
        where: { userId: contract.owner.userId },
        select: { id: true, type: true, title: true, message: true, createdAt: true, isRead: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
    }

    return {
      contractId,
      contractType: contract.type,
      vehicleDetails,
      driverName,
      activeContractStatus: contract.status,
      rentalPayments,
      roi,
      documents,
      accidents,
      maintenance,
      notifications,
    };
  }

  // ─── Résumé financier par période ─────────────────────────────────────────

  async getFinancialSummary(
    contractId: string,
    periodYear: number,
    periodMonth: number,
  ): Promise<OwnerFinancialSummaryDto> {
    const contract = await this.prisma.contract.findFirst({
      where: { id: contractId, type: ContractType.SIMPLE_RENTAL },
    });
    if (!contract) throw new NotFoundException('Contrat SIMPLE_RENTAL introuvable');

    const payment = await this.prisma.ownerRentalPayment.findFirst({
      where: { contractId, periodYear, periodMonth },
    });

    // Calcul du bilan global
    const allPayments = await this.prisma.ownerRentalPayment.findMany({
      where: { contractId },
    });
    const totalExpected = allPayments.reduce(
      (sum, p) => sum + new Decimal(p.expectedAmount.toString()).toNumber(),
      0,
    );
    const totalPaid = allPayments
      .filter((p) => p.status === RentalPaymentStatus.PAID)
      .reduce(
        (sum, p) => sum + (p.actualAmount ? new Decimal(p.actualAmount.toString()).toNumber() : 0),
        0,
      );

    return {
      contractId,
      periodMonth,
      periodYear,
      rentalPayment: payment
        ? {
            expectedAmount: new Decimal(payment.expectedAmount.toString()).toNumber(),
            actualAmount: payment.actualAmount
              ? new Decimal(payment.actualAmount.toString()).toNumber()
              : null,
            status: payment.status,
            dueDate: payment.dueDate?.toISOString() ?? null,
            paidAt: payment.paidAt?.toISOString() ?? null,
          }
        : null,
      balance: {
        totalExpected,
        totalPaid,
        totalRemaining: totalExpected - totalPaid,
      },
    };
  }

  // ─── Versements SIMPLE_RENTAL ──────────────────────────────────────────────

  async findRentalPayments(filters: RentalPaymentFiltersDto, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (filters.contractId) where.contractId = filters.contractId;
    if (filters.ownerId) where.ownerId = filters.ownerId;
    if (filters.status) where.status = filters.status;
    if (filters.periodYear) where.periodYear = filters.periodYear;

    const [data, total] = await Promise.all([
      this.prisma.ownerRentalPayment.findMany({
        where, skip, take: limit,
        orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
      }),
      this.prisma.ownerRentalPayment.count({ where }),
    ]);
    return { data, meta: { page, limit, total } };
  }

  async recordRentalPayment(dto: RecordRentalPaymentDto, actor: User) {
    const contract = await this.prisma.contract.findFirst({ where: { id: dto.contractId } });
    if (!contract) throw new NotFoundException('Contrat introuvable');
    if (contract.type !== ContractType.SIMPLE_RENTAL) {
      throw new BadRequestException('Les versements SIMPLE_RENTAL ne s\'appliquent qu\'aux contrats de type SIMPLE_RENTAL');
    }

    const owner = await this.prisma.owner.findFirst({ where: { id: dto.ownerId } });
    if (!owner) throw new NotFoundException('Propriétaire introuvable');

    // Vérifier l'unicité (contractId, periodYear, periodMonth)
    const existing = await this.prisma.ownerRentalPayment.findFirst({
      where: { contractId: dto.contractId, periodYear: dto.periodYear, periodMonth: dto.periodMonth },
    });
    if (existing) {
      throw new BadRequestException(
        `Un versement existe déjà pour ${dto.periodYear}-${String(dto.periodMonth).padStart(2, '0')} (id: ${existing.id})`,
      );
    }

    const actualAmount = dto.actualAmount ?? dto.expectedAmount;
    const status = actualAmount >= dto.expectedAmount
      ? RentalPaymentStatus.PAID
      : RentalPaymentStatus.PENDING;

    const payment = await this.prisma.ownerRentalPayment.create({
      data: {
        contractId: dto.contractId,
        ownerId: dto.ownerId,
        expectedAmount: dto.expectedAmount,
        actualAmount: dto.actualAmount ?? null,
        status,
        periodMonth: dto.periodMonth,
        periodYear: dto.periodYear,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        paidAt: dto.paidAt ? new Date(dto.paidAt) : (status === RentalPaymentStatus.PAID ? new Date() : null),
        paymentMethod: dto.paymentMethod ?? null,
        reference: dto.reference ?? null,
        notes: dto.notes ?? null,
        recordedById: actor.id,
      },
    });

    this.auditService
      .log({
        actorId: actor.id,
        action: AuditActions.OWNER_PAYMENT_RECORDED,
        entityType: EntityTypes.OWNER_RENTAL_PAYMENT,
        entityId: payment.id,
        afterJson: {
          contractId: dto.contractId,
          periodYear: dto.periodYear,
          periodMonth: dto.periodMonth,
          expectedAmount: dto.expectedAmount,
          actualAmount: dto.actualAmount,
          status,
        },
      })
      .catch(() => {});

    // Notifier le propriétaire
    if (owner.userId) {
      this.notificationsService
        .send({
          userId: owner.userId,
          type: NotificationType.OWNER_RENTAL_PAYMENT_RECORDED,
          title: 'Versement enregistré',
          message: `Votre versement de ${actualAmount} MAD pour ${dto.periodYear}/${String(dto.periodMonth).padStart(2, '0')} a été enregistré.`,
          priority: NotificationPriority.NORMAL,
          entityType: EntityTypes.OWNER_RENTAL_PAYMENT,
          entityId: payment.id,
        })
        .catch(() => {});
    }

    return payment;
  }

  async updateRentalPaymentStatus(id: string, dto: UpdateRentalPaymentStatusDto, actor: User) {
    const payment = await this.prisma.ownerRentalPayment.findFirst({ where: { id } });
    if (!payment) throw new NotFoundException('Versement introuvable');

    return this.prisma.ownerRentalPayment.update({
      where: { id },
      data: {
        status: dto.status,
        notes: dto.notes ? (payment.notes ? `${payment.notes}\n${dto.notes}` : dto.notes) : undefined,
        paidAt:
          dto.status === RentalPaymentStatus.PAID && !payment.paidAt
            ? new Date()
            : undefined,
      },
    });
  }
}
