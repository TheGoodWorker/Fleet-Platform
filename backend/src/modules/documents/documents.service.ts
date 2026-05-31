import {
  Injectable, Logger, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { DocumentStatus, DocumentType, DocumentEntityType, User } from '@prisma/client';
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

  async findById(id: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id },
      include: { ...DOC_INCLUDE, parentDoc: true, childDocs: true },
    });
    if (!doc) throw new NotFoundException(`Document ${id} introuvable`);
    return doc;
  }

  async findLatestForEntity(
    entityType: DocumentEntityType,
    entityId: string,
    type?: DocumentType,
  ) {
    const where: any = { entityType, entityId, isLatest: true };
    if (type) where.type = type;

    return this.prisma.document.findMany({
      where,
      include: DOC_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Création avec versioning ──────────────────────────────────────────────

  async create(dto: CreateDocumentDto, actor: User) {
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
