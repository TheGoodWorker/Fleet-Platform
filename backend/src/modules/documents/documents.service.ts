import {
  Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { DocumentStatus, DocumentType, DocumentEntityType, User, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditActions } from '../../common/constants/audit-actions';
import { EntityTypes } from '../../common/constants/entity-types';
import { CreateDocumentDto, UpdateDocumentDto, DocumentFiltersDto } from './dto/document.dto';

const DOC_INCLUDE = {
  mediaAsset: {
    select: { id: true, fileUrl: true, mimeType: true, fileSize: true, mediaType: true },
  },
};

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  // ─── Lecture ───────────────────────────────────────────────────────────────

  // TODO(IDOR-scoping) : cette liste générique n'est PAS scopée pour MANAGER.
  // Le modèle Document est polymorphe (entityType/entityId sans relation Prisma),
  // un `where` simple ne peut pas joindre vers vehicle.currentManagerId.
  // Les accès par id (findById) et par entité (findLatestForEntity) sont verrouillés.
  // Options à trancher : exiger un filtre entityType+entityId pour MANAGER,
  // ou ajouter des relations optionnelles (vehicleId/contractId/driverId) au modèle.
  async findAll(filters: DocumentFiltersDto, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.entityId) where.entityId = filters.entityId;
    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;
    if (filters.isLatest !== undefined) where.isLatest = filters.isLatest;

    const [data, total] = await Promise.all([
      this.prisma.document.findMany({
        where, skip, take: limit,
        include: DOC_INCLUDE,
        orderBy: [{ isLatest: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.document.count({ where }),
    ]);
    return { data, meta: { page, limit, total } };
  }

  async findById(id: string, requestingUser?: User) {
    const doc = await this.prisma.document.findFirst({
      where: { id },
      include: { ...DOC_INCLUDE, parentDoc: true, childDocs: true },
    });
    if (!doc) throw new NotFoundException(`Document ${id} introuvable`);
    await this.assertDriverCanAccessEntity(
      doc.entityType, doc.entityId, requestingUser,
    );
    return doc;
  }

  async findLatestForEntity(
    entityType: DocumentEntityType,
    entityId: string,
    type?: DocumentType,
    requestingUser?: User,
  ) {
    await this.assertDriverCanAccessEntity(entityType, entityId, requestingUser);
    const where: any = { entityType, entityId, isLatest: true };
    if (type) where.type = type;

    return this.prisma.document.findMany({
      where,
      include: DOC_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * IDOR — scoping par entité du document :
   * - DRIVER : son profil chauffeur, son véhicule courant, ses propres contrats
   * - MANAGER : entités de son périmètre (véhicules gérés, contrats gérés,
   *   chauffeurs liés, propriétaires de ses véhicules)
   */
  private async assertDriverCanAccessEntity(
    entityType: DocumentEntityType,
    entityId: string,
    requestingUser?: User,
  ) {
    if (requestingUser?.role === UserRole.DRIVER) {
      const driver = await this.prisma.driver.findFirst({
        where: { userId: requestingUser.id }, select: { id: true },
      });
      const denied = new ForbiddenException(
        'Accès refusé — ce document ne vous concerne pas',
      );
      if (!driver) throw denied;

      switch (entityType) {
        case DocumentEntityType.DRIVER:
          if (entityId !== driver.id) throw denied;
          return;
        case DocumentEntityType.VEHICLE: {
          const vehicle = await this.prisma.vehicle.findFirst({
            where: { id: entityId }, select: { currentDriverId: true },
          });
          if (vehicle?.currentDriverId !== driver.id) throw denied;
          return;
        }
        case DocumentEntityType.CONTRACT: {
          const contract = await this.prisma.contract.findFirst({
            where: { id: entityId }, select: { driverId: true },
          });
          if (contract?.driverId !== driver.id) throw denied;
          return;
        }
        default:
          // OWNER et autres types : jamais accessibles à un chauffeur
          throw denied;
      }
    }

    if (requestingUser?.role === UserRole.MANAGER) {
      const managerId = requestingUser.id;
      const denied = new ForbiddenException(
        'Accès refusé — ce document est hors de votre périmètre',
      );
      switch (entityType) {
        case DocumentEntityType.VEHICLE: {
          const v = await this.prisma.vehicle.findFirst({
            where: { id: entityId, currentManagerId: managerId }, select: { id: true },
          });
          if (!v) throw denied;
          return;
        }
        case DocumentEntityType.CONTRACT: {
          const c = await this.prisma.contract.findFirst({
            where: { id: entityId, managerId }, select: { id: true },
          });
          if (!c) throw denied;
          return;
        }
        case DocumentEntityType.DRIVER: {
          const d = await this.prisma.driver.findFirst({
            where: {
              id: entityId,
              OR: [
                { contracts: { some: { managerId } } },
                { currentVehicles: { some: { currentManagerId: managerId } } },
              ],
            },
            select: { id: true },
          });
          if (!d) throw denied;
          return;
        }
        case DocumentEntityType.OWNER: {
          const o = await this.prisma.owner.findFirst({
            where: { id: entityId, vehicles: { some: { currentManagerId: managerId } } },
            select: { id: true },
          });
          if (!o) throw denied;
          return;
        }
        default:
          throw denied;
      }
    }
  }

  // ─── Création avec versioning ──────────────────────────────────────────────

  async create(dto: CreateDocumentDto, actor: User) {
    // IDOR — MANAGER ne crée des documents que sur les entités de son périmètre
    await this.assertDriverCanAccessEntity(dto.entityType, dto.entityId, actor);

    // Vérification MediaAsset si fourni
    if (dto.mediaAssetId) {
      const asset = await this.prisma.mediaAsset.findFirst({ where: { id: dto.mediaAssetId } });
      if (!asset) throw new NotFoundException('MediaAsset introuvable');
      if (asset.document) {
        throw new BadRequestException('Ce MediaAsset est déjà lié à un Document');
      }
    }

    // Si ce type de document existe déjà pour cette entité → archiver la version précédente
    const existing = await this.prisma.document.findFirst({
      where: {
        entityType: dto.entityType,
        entityId: dto.entityId,
        type: dto.type,
        isLatest: true,
      },
    });

    let parentDocId: string | null = null;
    let version = 1;

    if (existing) {
      // Archiver la version précédente
      await this.prisma.document.update({
        where: { id: existing.id },
        data: { isLatest: false, status: DocumentStatus.ARCHIVED },
      });
      parentDocId = existing.id;
      version = existing.version + 1;
    }

    // Calculer le statut initial
    const status = this.computeStatus(
      dto.alwaysValid ?? false,
      dto.validUntil ? new Date(dto.validUntil) : null,
    );

    const doc = await this.prisma.document.create({
      data: {
        entityType: dto.entityType,
        entityId: dto.entityId,
        type: dto.type,
        mediaAssetId: dto.mediaAssetId ?? null,
        title: dto.title ?? null,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        alwaysValid: dto.alwaysValid ?? false,
        status,
        isCritical: dto.isCritical ?? false,
        notifyOwner: dto.notifyOwner ?? false,
        notes: dto.notes ?? null,
        version,
        isLatest: true,
        parentDocId,
        uploadedById: actor.id,
      },
      include: { ...DOC_INCLUDE },
    });

    this.auditService
      .log({
        actorId: actor.id,
        action: AuditActions.DOCUMENT_UPLOADED,
        entityType: EntityTypes.VEHICLE, // Utilisé pour le log — l'entité réelle est dans dto
        entityId: dto.entityId,
        afterJson: {
          documentId: doc.id,
          type: dto.type,
          entityType: dto.entityType,
          version,
        },
      })
      .catch(() => {});

    return doc;
  }

  async update(id: string, dto: UpdateDocumentDto, actor: User) {
    const doc = await this.prisma.document.findFirst({ where: { id } });
    if (!doc) throw new NotFoundException(`Document ${id} introuvable`);

    // IDOR — MANAGER ne modifie que les documents des entités de son périmètre
    await this.assertDriverCanAccessEntity(doc.entityType, doc.entityId, actor);

    const updatedStatus = this.computeStatus(
      dto.alwaysValid ?? doc.alwaysValid,
      dto.validUntil ? new Date(dto.validUntil) : doc.validUntil,
    );

    return this.prisma.document.update({
      where: { id },
      data: {
        title: dto.title ?? doc.title,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : doc.validFrom,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : doc.validUntil,
        alwaysValid: dto.alwaysValid ?? doc.alwaysValid,
        isCritical: dto.isCritical ?? doc.isCritical,
        notifyOwner: dto.notifyOwner ?? doc.notifyOwner,
        notes: dto.notes ?? doc.notes,
        status: updatedStatus,
      },
      include: DOC_INCLUDE,
    });
  }

  async archive(id: string, actor: User) {
    const doc = await this.prisma.document.findFirst({ where: { id } });
    if (!doc) throw new NotFoundException(`Document ${id} introuvable`);
    if (doc.status === DocumentStatus.ARCHIVED) {
      throw new BadRequestException('Document déjà archivé');
    }

    const archived = await this.prisma.document.update({
      where: { id },
      data: { status: DocumentStatus.ARCHIVED, isLatest: false },
    });

    this.auditService
      .log({
        actorId: actor.id,
        action: AuditActions.DOCUMENT_ARCHIVED,
        entityType: EntityTypes.VEHICLE,
        entityId: doc.entityId,
        afterJson: { documentId: id, type: doc.type },
      })
      .catch(() => {});

    return archived;
  }

  // ─── Utilitaires ───────────────────────────────────────────────────────────

  private computeStatus(alwaysValid: boolean, validUntil: Date | null): DocumentStatus {
    if (alwaysValid) return DocumentStatus.ALWAYS_VALID;
    if (!validUntil) return DocumentStatus.VALID;

    const now = new Date();
    const daysUntilExpiry = Math.ceil(
      (validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysUntilExpiry < 0) return DocumentStatus.EXPIRED;
    if (daysUntilExpiry <= 30) return DocumentStatus.EXPIRING_SOON;
    return DocumentStatus.VALID;
  }
}
