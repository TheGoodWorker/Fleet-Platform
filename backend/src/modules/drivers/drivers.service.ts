import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ContractStatus, DriverStatus, FieldValidationStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuditActions } from '../../common/constants/audit-actions';
import { EntityTypes } from '../../common/constants/entity-types';
import { CreateDriverDto, UpdateDriverDto, DriverFiltersDto, ValidateFieldDto } from './dto/driver.dto';

const DRIVER_INCLUDE = {
  user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, status: true } },
  kyc: { select: { id: true, fullNameVerified: true, photoVerified: true, idCardVerified: true, licenseVerified: true, phoneVerified: true } },
  fieldValidation: { select: { id: true, status: true, homeVisitDone: true } },
  _count: { select: { contracts: true, payments: true, charges: true } },
};

/** Statuts contractuels pour lesquels la checklist KYC/terrain est encore pertinente */
const CHECKLIST_CONTRACT_STATUSES = [
  ContractStatus.DRAFT,
  ContractStatus.PENDING_APPROVAL,
] as ContractStatus[];

@Injectable()
export class DriversService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(filters: DriverFiltersDto, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters.status) where.status = filters.status;
    if (filters.search) {
      where.OR = [
        { user: { firstName: { contains: filters.search, mode: 'insensitive' } } },
        { user: { lastName: { contains: filters.search, mode: 'insensitive' } } },
        { user: { phone: { contains: filters.search } } },
        { idCardNumber: { contains: filters.search } },
        { licenseNumber: { contains: filters.search } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.driver.findMany({ where, skip, take: limit, include: DRIVER_INCLUDE, orderBy: { createdAt: 'desc' } }),
      this.prisma.driver.count({ where }),
    ]);
    return { data, meta: { page, limit, total } };
  }

  async findById(id: string) {
    const driver = await this.prisma.driver.findFirst({ where: { id }, include: DRIVER_INCLUDE });
    if (!driver) throw new NotFoundException(`Chauffeur ${id} introuvable`);
    return driver;
  }

  async findByUserId(userId: string) {
    const driver = await this.prisma.driver.findFirst({ where: { userId }, include: DRIVER_INCLUDE });
    if (!driver) throw new NotFoundException(`Chauffeur pour user ${userId} introuvable`);
    return driver;
  }

  async create(dto: CreateDriverDto) {
    const exists = await this.prisma.driver.findFirst({ where: { userId: dto.userId } });
    if (exists) throw new ConflictException('Ce compte utilisateur a déjà un profil chauffeur');

    return this.prisma.driver.create({
      data: {
        userId: dto.userId,
        idCardNumber: dto.idCardNumber,
        licenseNumber: dto.licenseNumber,
        address: dto.address,
        emergencyContact: dto.emergencyContact,
        familyContacts: dto.familyContacts ?? [],
        kyc: { create: {} }, // KYC vide créé automatiquement
      },
      include: DRIVER_INCLUDE,
    });
  }

  async update(id: string, dto: UpdateDriverDto) {
    await this.findById(id);
    return this.prisma.driver.update({ where: { id }, data: dto, include: DRIVER_INCLUDE });
  }

  async updateStatus(id: string, status: DriverStatus) {
    await this.findById(id);
    return this.prisma.driver.update({ where: { id }, data: { status }, include: DRIVER_INCLUDE });
  }

  // ─── Gap 5 : Validation KYC ────────────────────────────────────────────────

  /**
   * Valide toutes les rubriques KYC d'un chauffeur.
   *
   * Effets :
   * - DriverKYC : tous les champs *Verified = true
   * - Driver.status : PENDING_KYC → PENDING_FIELD_VALIDATION
   * - Contract.kycValidated = true sur tous les contrats DRAFT/PENDING_APPROVAL du chauffeur
   * - AuditLog DRIVER_KYC_VALIDATED
   *
   * @param driverId  ID du chauffeur
   * @param actorId   ID de l'utilisateur qui effectue la validation
   */
  async validateKyc(driverId: string, actorId: string): Promise<void> {
    const driver = await this.prisma.driver.findFirst({
      where: { id: driverId },
      include: { kyc: true },
    });
    if (!driver) throw new NotFoundException(`Chauffeur ${driverId} introuvable`);

    if (driver.status !== DriverStatus.PENDING_KYC) {
      throw new BadRequestException(
        `Le chauffeur n'est pas en statut PENDING_KYC (actuel : ${driver.status})`,
      );
    }

    const now = new Date();

    // C-04 : les 3 opérations de mutation sont atomiques dans une transaction.
    // Sans transaction, un échec partiel (ex. réseau sur contract.updateMany)
    // laisserait le KYC validé sans que la checklist contrat soit mise à jour.
    await this.prisma.$transaction(async (tx) => {
      // 1. Marquer tous les champs KYC validés
      if (driver.kyc) {
        await tx.driverKYC.update({
          where: { driverId },
          data: {
            fullNameVerified: true,
            photoVerified: true,
            idCardVerified: true,
            licenseVerified: true,
            phoneVerified: true,
            validatedById: actorId,
            validatedAt: now,
          },
        });
      } else {
        await tx.driverKYC.create({
          data: {
            driverId,
            fullNameVerified: true,
            photoVerified: true,
            idCardVerified: true,
            licenseVerified: true,
            phoneVerified: true,
            validatedById: actorId,
            validatedAt: now,
          },
        });
      }

      // 2. Mettre à jour le statut du chauffeur
      await tx.driver.update({
        where: { id: driverId },
        data: { status: DriverStatus.PENDING_FIELD_VALIDATION },
      });

      // 3. Propager kycValidated = true sur tous les contrats en cours de montage
      await tx.contract.updateMany({
        where: { driverId, status: { in: CHECKLIST_CONTRACT_STATUSES } },
        data: { kycValidated: true },
      });
    });

    // 4. Audit (fire-and-forget — hors transaction, ne bloque pas l'opération)
    this.audit
      .log({
        actorId,
        action: AuditActions.DRIVER_KYC_VALIDATED,
        entityType: EntityTypes.DRIVER,
        entityId: driverId,
        metadata: { previousStatus: DriverStatus.PENDING_KYC, newStatus: DriverStatus.PENDING_FIELD_VALIDATION },
      })
      .catch(() => undefined);
  }

  // ─── Gap 5 : Validation terrain ────────────────────────────────────────────

  /**
   * Valide la visite terrain d'un chauffeur.
   *
   * Effets :
   * - DriverFieldValidation : status = VALIDATED, homeVisitDone = true (ou fourni), managerId, reviewedAt
   * - Driver.status : PENDING_FIELD_VALIDATION → APPROVED
   * - Contract.fieldValidated = true sur tous les contrats DRAFT/PENDING_APPROVAL du chauffeur
   * - AuditLog DRIVER_FIELD_VALIDATED
   *
   * @param driverId  ID du chauffeur
   * @param actorId   ID du Manager qui effectue la validation
   * @param dto       Informations de visite terrain
   */
  async validateField(driverId: string, actorId: string, dto: ValidateFieldDto): Promise<void> {
    const driver = await this.prisma.driver.findFirst({
      where: { id: driverId },
      include: { fieldValidation: true },
    });
    if (!driver) throw new NotFoundException(`Chauffeur ${driverId} introuvable`);

    if (driver.status !== DriverStatus.PENDING_FIELD_VALIDATION) {
      throw new BadRequestException(
        `Le chauffeur n'est pas en statut PENDING_FIELD_VALIDATION (actuel : ${driver.status})`,
      );
    }

    const now = new Date();
    const fieldData = {
      homeVisitDone: dto.homeVisitDone ?? true,
      homeVisitPhotoUrl: dto.homeVisitPhotoUrl,
      gpsLocationLat: dto.gpsLocationLat,
      gpsLocationLng: dto.gpsLocationLng,
      environmentPhotoUrl: dto.environmentPhotoUrl,
      resourcePersonName: dto.resourcePersonName,
      resourcePersonPhone: dto.resourcePersonPhone,
      familyContactsNotes: dto.familyContactsNotes,
      managerComment: dto.managerComment,
      notes: dto.notes,
      managerId: actorId,
      status: FieldValidationStatus.VALIDATED,
      reviewedAt: now,
    };

    // C-04 : les 3 opérations de mutation sont atomiques dans une transaction.
    await this.prisma.$transaction(async (tx) => {
      // 1. Upsert DriverFieldValidation
      if (driver.fieldValidation) {
        await tx.driverFieldValidation.update({
          where: { driverId },
          data: fieldData,
        });
      } else {
        await tx.driverFieldValidation.create({
          data: { driverId, ...fieldData },
        });
      }

      // 2. Mettre à jour le statut du chauffeur
      await tx.driver.update({
        where: { id: driverId },
        data: { status: DriverStatus.APPROVED },
      });

      // 3. Propager fieldValidated = true sur tous les contrats en cours de montage
      await tx.contract.updateMany({
        where: { driverId, status: { in: CHECKLIST_CONTRACT_STATUSES } },
        data: { fieldValidated: true },
      });
    });

    // 4. Audit (fire-and-forget — hors transaction)
    this.audit
      .log({
        actorId,
        action: AuditActions.DRIVER_FIELD_VALIDATED,
        entityType: EntityTypes.DRIVER,
        entityId: driverId,
        metadata: { previousStatus: DriverStatus.PENDING_FIELD_VALIDATION, newStatus: DriverStatus.APPROVED },
      })
      .catch(() => undefined);
  }

  async softDelete(id: string) {
    const driver = await this.findById(id);
    return this.prisma.user.update({
      where: { id: driver.userId },
      data: { deletedAt: new Date(), status: 'DELETED' },
      select: { id: true, deletedAt: true },
    });
  }
}
