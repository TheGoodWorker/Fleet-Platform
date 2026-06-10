import {
  Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import {
  ContraventionSource, ChargeType, ChargeStatus, ChargeResponsible, User, UserRole,
} from '@prisma/client';
import { Decimal } from 'decimal.js';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditActions } from '../../common/constants/audit-actions';
import { EntityTypes } from '../../common/constants/entity-types';
import {
  CreateContraventionDto, MarkPaidDto, ConvertToChargeDto, ContraventionFiltersDto,
} from './dto/contravention.dto';

/**
 * ContraventionsService
 *
 * D-12 : La responsabilité d'une contravention est TOUJOURS côté DRIVER.
 * Elle peut être convertie en Charge de type FINE avec :
 * - validatedResponsible = DRIVER
 * - impactsProfit = false (ne doit pas impacter le bénéfice propriétaire)
 */
@Injectable()
export class ContraventionsService {
  private readonly logger = new Logger(ContraventionsService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  // ─── Lecture ───────────────────────────────────────────────────────────────

  async findAll(filters: ContraventionFiltersDto, page = 1, limit = 20, requestingUser?: User) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (filters.vehicleId) where.vehicleId = filters.vehicleId;
    if (filters.driverId) where.driverId = filters.driverId;
    if (filters.source) where.source = filters.source;
    if (filters.isPaid !== undefined) where.isPaid = filters.isPaid;

    // IDOR — MANAGER ne voit que les contraventions des véhicules de son périmètre
    if (requestingUser?.role === UserRole.MANAGER) {
      where.vehicle = { currentManagerId: requestingUser.id };
    }

    const [data, total] = await Promise.all([
      this.prisma.contravention.findMany({
        where, skip, take: limit,
        include: {
          vehicle: { select: { id: true, plateNumber: true, brand: true, model: true } },
          driver: { select: { id: true, userId: true } },
        },
        orderBy: { date: 'desc' },
      }),
      this.prisma.contravention.count({ where }),
    ]);
    return { data, meta: { page, limit, total } };
  }

  async findById(id: string, requestingUser?: User) {
    const contravention = await this.prisma.contravention.findFirst({
      where: { id },
      include: {
        vehicle: { select: { id: true, plateNumber: true, brand: true, model: true } },
        driver: { select: { id: true, userId: true } },
      },
    });
    if (!contravention) throw new NotFoundException(`Contravention ${id} introuvable`);

    // IDOR — MANAGER ne voit que les contraventions des véhicules de son périmètre
    if (requestingUser?.role === UserRole.MANAGER) {
      const vehicle = await this.prisma.vehicle.findFirst({
        where: { id: contravention.vehicleId, currentManagerId: requestingUser.id },
        select: { id: true },
      });
      if (!vehicle) {
        throw new ForbiddenException('Accès refusé — cette contravention est hors de votre périmètre');
      }
    }
    return contravention;
  }

  // ─── Création ──────────────────────────────────────────────────────────────

  /**
   * D-12 : toute contravention est à la charge du DRIVER.
   * Cette règle est enforced ici — aucun DTO ne peut changer la responsabilité.
   */
  async create(dto: CreateContraventionDto, actor: User) {
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id: dto.vehicleId } });
    if (!vehicle) throw new NotFoundException('Véhicule introuvable');

    // Vérifier que le chauffeur existe si spécifié
    if (dto.driverId) {
      const driver = await this.prisma.driver.findFirst({ where: { id: dto.driverId } });
      if (!driver) throw new NotFoundException('Chauffeur introuvable');
    }

    const contravention = await this.prisma.contravention.create({
      data: {
        vehicleId: dto.vehicleId,
        driverId: dto.driverId ?? null,
        contractId: dto.contractId ?? null,
        amount: new Decimal(dto.amount),
        source: dto.source ?? ContraventionSource.MANUAL,
        carculRef: dto.carculRef ?? null,
        infraction: dto.infraction ?? null,
        date: new Date(dto.date),
        location: dto.location ?? null,
        // D-12 : isPaid = false par défaut, responsabilité = DRIVER implicitement
      },
      include: {
        vehicle: { select: { id: true, plateNumber: true } },
        driver: { select: { id: true, userId: true } },
      },
    });

    this.auditService
      .log({
        actorId: actor.id,
        action: AuditActions.CONTRAVENTION_CREATED,
        entityType: EntityTypes.CONTRAVENTION,
        entityId: contravention.id,
        afterJson: {
          vehicleId: dto.vehicleId,
          driverId: dto.driverId,
          amount: dto.amount,
          source: dto.source ?? ContraventionSource.MANUAL,
        },
      })
      .catch(() => {});

    return contravention;
  }

  // ─── Marquage payé ─────────────────────────────────────────────────────────

  async markPaid(id: string, dto: MarkPaidDto, actor: User) {
    const contravention = await this.prisma.contravention.findFirst({ where: { id } });
    if (!contravention) throw new NotFoundException('Contravention introuvable');
    if (contravention.isPaid) {
      throw new BadRequestException('Contravention déjà marquée comme payée');
    }

    const updated = await this.prisma.contravention.update({
      where: { id },
      data: {
        isPaid: true,
        paidAt: new Date(),
        paidAmount: new Decimal(dto.paidAmount),
      },
    });

    this.auditService
      .log({
        actorId: actor.id,
        action: AuditActions.CONTRAVENTION_PAID,
        entityType: EntityTypes.CONTRAVENTION,
        entityId: id,
        afterJson: { paidAmount: dto.paidAmount },
      })
      .catch(() => {});

    return updated;
  }

  // ─── Conversion en Charge ──────────────────────────────────────────────────

  /**
   * D-12 : la charge créée a :
   * - type = FINE
   * - proposedResponsible = DRIVER (inviolable)
   * La charge doit passer par le workflow normal (PENDING_VALIDATION → VALIDATED)
   */
  async convertToCharge(id: string, dto: ConvertToChargeDto, actor: User) {
    const contravention = await this.prisma.contravention.findFirst({ where: { id } });
    if (!contravention) throw new NotFoundException('Contravention introuvable');
    if (contravention.chargeId) {
      throw new BadRequestException('Cette contravention a déjà été convertie en charge');
    }

    const charge = await this.prisma.charge.create({
      data: {
        type: ChargeType.FINE,
        status: ChargeStatus.PENDING_VALIDATION,
        amount: contravention.amount,
        vehicleId: contravention.vehicleId,
        contractId: contravention.contractId ?? undefined,
        driverId: contravention.driverId ?? undefined,
        // D-12 : responsabilité TOUJOURS DRIVER pour une contravention
        proposedResponsible: ChargeResponsible.DRIVER,
        description:
          dto.description ??
          `Contravention ${contravention.infraction ?? ''} du ${contravention.date.toISOString().split('T')[0]} — ${contravention.location ?? ''} (montant: ${contravention.amount.toString()} FCFA)`,
        createdById: actor.id,
      },
    });

    // Lier la charge à la contravention
    await this.prisma.contravention.update({
      where: { id },
      data: { chargeId: charge.id },
    });

    this.auditService
      .log({
        actorId: actor.id,
        action: AuditActions.CONTRAVENTION_CONVERTED,
        entityType: EntityTypes.CONTRAVENTION,
        entityId: id,
        afterJson: { chargeId: charge.id },
      })
      .catch(() => {});

    return charge;
  }
}
