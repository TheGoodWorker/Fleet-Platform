import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateAuditLogDto {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  /** Données avant la modification */
  beforeJson?: Record<string, unknown>;
  /** Données après la modification OU métadonnées libres */
  afterJson?: Record<string, unknown>;
  /** Alias pour afterJson — accepté pour compatibilité */
  metadata?: Record<string, unknown>;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Enregistre une action sensible dans le journal d'audit.
   * Fire-and-forget : les erreurs ne bloquent jamais l'opération principale.
   * Immuable : jamais supprimé, jamais modifié (D-05).
   */
  async log(dto: CreateAuditLogDto): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: dto.actorId,
          action: dto.action,
          entityType: dto.entityType,
          entityId: dto.entityId,
          beforeJson: dto.beforeJson ?? undefined,
          afterJson: dto.afterJson ?? dto.metadata ?? undefined,
          reason: dto.reason,
          ipAddress: dto.ipAddress,
          userAgent: dto.userAgent,
        },
      });
    } catch (error) {
      this.logger.error('Échec enregistrement AuditLog — opération principale non interrompue', error);
    }
  }

  async findAll(
    page = 1,
    limit = 50,
    filters?: {
      entityType?: string;
      entityId?: string;
      actorId?: string;
      action?: string;
    },
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters?.entityType) where.entityType = filters.entityType;
    if (filters?.entityId) where.entityId = filters.entityId;
    if (filters?.actorId) where.actorId = filters.actorId;
    if (filters?.action) where.action = { contains: filters.action };

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        include: {
          actor: { select: { id: true, firstName: true, lastName: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, meta: { page, limit, total } };
  }
}
