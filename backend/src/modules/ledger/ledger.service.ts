import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LedgerDirection, LedgerEntryType } from '@prisma/client';
import { Decimal } from 'decimal.js';

export interface CreateLedgerEntryDto {
  contractId?: string;
  vehicleId?: string;
  driverId?: string;
  ownerId?: string;
  settlementId?: string;

  entryType: LedgerEntryType;
  direction: LedgerDirection;
  amount: Decimal | number;
  currency?: string;

  // Nommage unifié : entityType/entityId = sourceType/sourceId (alias acceptés)
  entityType?: string;
  entityId?: string;
  sourceType?: string;  // alias de entityType
  sourceId?: string;    // alias de entityId

  description?: string;
  actorId?: string;       // alias de recordedById
  recordedById?: string;

  occurredAt?: Date; // Défaut: new Date()
}

@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Crée une entrée de grand livre.
   * Fire-and-forget : les erreurs sont loggées mais n'interrompent jamais l'opération principale.
   * Une entrée par événement réel (D-10).
   */
  async createEntry(dto: CreateLedgerEntryDto): Promise<void> {
    try {
      await this.prisma.ledgerEntry.create({
        data: {
          contractId: dto.contractId,
          vehicleId: dto.vehicleId,
          driverId: dto.driverId,
          ownerId: dto.ownerId,
          settlementId: dto.settlementId,
          entryType: dto.entryType,
          direction: dto.direction,
          amount: new Decimal(dto.amount.toString()),
          currency: dto.currency ?? 'XOF',
          sourceType: dto.entityType ?? dto.sourceType,
          sourceId: dto.entityId ?? dto.sourceId,
          description: dto.description,
          recordedById: dto.actorId ?? dto.recordedById,
          occurredAt: dto.occurredAt ?? new Date(),
        },
      });
    } catch (error) {
      this.logger.error('Échec création LedgerEntry — opération principale non interrompue', error);
    }
  }

  async findByContract(contractId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.ledgerEntry.findMany({
        where: { contractId },
        skip,
        take: limit,
        orderBy: { occurredAt: 'desc' },
      }),
      this.prisma.ledgerEntry.count({ where: { contractId } }),
    ]);
    return { data, meta: { page, limit, total } };
  }
}
