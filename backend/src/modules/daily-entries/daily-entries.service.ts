import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { DayStatus, ContractStatus, ContractType, VehicleStatus } from '@prisma/client';
import { Decimal } from 'decimal.js';
import { DailyEntryFiltersDto } from './dto/daily-entry.dto';

export interface DailyEntryAllocationResult {
  /** Nombre de jours passés à VALIDATED lors de cette allocation */
  validatedCount: number;
  /** Nombre de jours PARTIALLY_PAID créés ou mis à jour */
  partialCount: number;
  /** Liste des DailyEntry IDs affectés */
  entryIds: string[];
  /** true si le contrat vient d'atteindre targetDays → COMPLETED */
  contractCompleted: boolean;
}

/**
 * DailyEntriesService — Moteur de progression du contrat
 *
 * Règles fondamentales (D-08, R-01 à R-04) :
 * - validatedDays ne peut qu'augmenter
 * - Un jour est VALIDATED uniquement quand dailyAmount est intégralement payé
 * - REST_DAY, IMMOBILIZED, EXCUSED ne comptent pas
 * - La date de fin n'est jamais fixe — progression = validatedDays / targetDays
 * - Un surplus après targetDays atteint est SUPPRIMÉ (jamais créé)
 */
@Injectable()
export class DailyEntriesService {
  private readonly logger = new Logger(DailyEntriesService.name);

  constructor(private prisma: PrismaService) {}

  // ─── Lecture ───────────────────────────────────────────────────────────────

  async findByContract(
    contractId: string,
    filters: DailyEntryFiltersDto,
    page = 1,
    limit = 60,
  ) {
    const skip = (page - 1) * limit;
    const where: any = { contractId };

    if (filters.status) where.status = filters.status;
    if (filters.from || filters.to) {
      where.date = {};
      if (filters.from) where.date.gte = new Date(filters.from);
      if (filters.to) where.date.lte = new Date(filters.to);
    }

    const [data, total] = await Promise.all([
      this.prisma.dailyEntry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'asc' },
        include: {
          payment: { select: { id: true, amount: true, paidAt: true, source: true } },
        },
      }),
      this.prisma.dailyEntry.count({ where }),
    ]);

    return { data, meta: { page, limit, total } };
  }

  /**
   * Résumé de progression — dashboard et app chauffeur
   */
  async getProgressSummary(contractId: string) {
    const contract = await this.prisma.contract.findFirst({
      where: { id: contractId },
      select: {
        id: true,
        type: true,
        dailyAmount: true,
        targetDays: true,
        validatedDays: true,
        status: true,
        restDay: true,
      },
    });
    if (!contract) throw new NotFoundException(`Contrat ${contractId} introuvable`);

    const statusCounts = await this.prisma.dailyEntry.groupBy({
      by: ['status'],
      where: { contractId },
      _count: { status: true },
    });

    const countMap: Record<string, number> = {};
    for (const row of statusCounts) {
      countMap[row.status] = row._count.status;
    }

    const totalPaidAgg = await this.prisma.dailyEntry.aggregate({
      where: { contractId, paidAmount: { gt: 0 } },
      _sum: { paidAmount: true },
    });

    const validatedDays = contract.validatedDays;
    const targetDays = contract.targetDays ?? 0;
    const remainingDays = Math.max(0, targetDays - validatedDays);
    const progressPercent =
      targetDays > 0 ? Number(((validatedDays / targetDays) * 100).toFixed(2)) : 0;

    const nextUnpaid = await this.prisma.dailyEntry.findFirst({
      where: {
        contractId,
        status: { in: [DayStatus.UNPAID, DayStatus.PARTIALLY_PAID] },
      },
      orderBy: { date: 'asc' },
      select: { date: true, status: true, paidAmount: true, expectedAmount: true },
    });

    const dailyAmount = new Decimal(contract.dailyAmount.toString());
    const alreadyPaidOnPartial = nextUnpaid?.paidAmount
      ? new Decimal(nextUnpaid.paidAmount.toString())
      : new Decimal(0);
    const nextExpectedPayment = dailyAmount.minus(alreadyPaidOnPartial);

    return {
      contractId,
      targetDays,
      validatedDays,
      remainingDays,
      partiallyPaidDays: countMap[DayStatus.PARTIALLY_PAID] ?? 0,
      unpaidDays: countMap[DayStatus.UNPAID] ?? 0,
      restDays: countMap[DayStatus.REST_DAY] ?? 0,
      immobilizedDays: countMap[DayStatus.IMMOBILIZED] ?? 0,
      progressPercent,
      totalPaid: totalPaidAgg._sum.paidAmount?.toString() ?? '0',
      nextExpectedPayment: nextExpectedPayment.toString(),
      nextUnpaidDate: nextUnpaid?.date ?? null,
    };
  }

  async getNextUnpaidEntry(contractId: string) {
    return this.prisma.dailyEntry.findFirst({
      where: {
        contractId,
        status: { in: [DayStatus.UNPAID, DayStatus.PARTIALLY_PAID] },
      },
      orderBy: { date: 'asc' },
    });
  }

  // ─── Moteur d'allocation ───────────────────────────────────────────────────

  /**
   * Alloue un montant de paiement sur les DailyEntry d'un contrat.
   *
   * Ordre de traitement : PARTIALLY_PAID en premier (date ASC), puis UNPAID (date ASC)
   *
   * RÈGLE CRITIQUE (gap 2 & 3) :
   *   1. On traite tous les candidats existants
   *   2. On incrémente validatedDays et on vérifie la complétion du contrat
   *   3. On crée le surplus UNIQUEMENT si le contrat n'est PAS encore terminé
   *
   * Doit être appelé DANS une transaction Prisma.
   */
  async allocatePaymentToEntries(
    tx: any,
    contractId: string,
    vehicleId: string,
    driverId: string,
    paymentId: string,
    amount: Decimal,
    paidAt: Date,
  ): Promise<DailyEntryAllocationResult> {
    const contract = await tx.contract.findFirst({
      where: { id: contractId },
      select: { dailyAmount: true, validatedDays: true, targetDays: true },
    });
    if (!contract) throw new NotFoundException(`Contrat ${contractId} introuvable`);

    const dailyAmount = new Decimal(contract.dailyAmount.toString());
    let remaining = new Decimal(amount.toString());

    // Candidats : PARTIALLY_PAID en premier, puis UNPAID, triés par date ASC
    const allCandidates: any[] = await tx.dailyEntry.findMany({
      where: {
        contractId,
        status: { in: [DayStatus.PARTIALLY_PAID, DayStatus.UNPAID] },
      },
      orderBy: { date: 'asc' },
    });

    // Trier : PARTIALLY_PAID avant UNPAID (date ASC à l'intérieur de chaque groupe)
    const candidates = [
      ...allCandidates.filter((e: any) => e.status === DayStatus.PARTIALLY_PAID),
      ...allCandidates.filter((e: any) => e.status === DayStatus.UNPAID),
    ];

    const entryIds: string[] = [];
    let newlyValidated = 0;
    let partialCount = 0;

    // ── Étape 1 : Absorber les candidats existants ──────────────────────────
    for (const entry of candidates) {
      if (remaining.lte(0)) break;

      const alreadyPaid = entry.paidAmount
        ? new Decimal(entry.paidAmount.toString())
        : new Decimal(0);
      const needed = dailyAmount.minus(alreadyPaid);
      const absorbed = Decimal.min(remaining, needed);
      const newPaid = alreadyPaid.plus(absorbed);

      remaining = remaining.minus(absorbed);

      const isFullyPaid = newPaid.gte(dailyAmount);
      const newStatus: DayStatus = isFullyPaid ? DayStatus.VALIDATED : DayStatus.PARTIALLY_PAID;

      await tx.dailyEntry.update({
        where: { id: entry.id },
        data: {
          paidAmount: newPaid,
          status: newStatus,
          paymentId,
          ...(isFullyPaid ? { validatedAt: paidAt } : {}),
        },
      });

      entryIds.push(entry.id);
      if (isFullyPaid) newlyValidated++;
      else partialCount++;
    }

    // ── Étape 2 : Incrémenter validatedDays + vérifier complétion ──────────
    // L'ordre est CRITIQUE : on vérifie la complétion AVANT de créer le surplus
    let contractCompleted = false;

    if (newlyValidated > 0) {
      const updatedContract = await tx.contract.update({
        where: { id: contractId },
        data: { validatedDays: { increment: newlyValidated } },
        select: { validatedDays: true, targetDays: true },
      });

      // R-01 : validatedDays ne peut que croître — déjà garanti par l'increment
      if (
        updatedContract.targetDays !== null &&
        updatedContract.validatedDays >= updatedContract.targetDays
      ) {
        // Contrat complété : mettre à jour le statut
        await tx.contract.update({
          where: { id: contractId },
          data: { status: ContractStatus.COMPLETED, closedAt: new Date() },
        });

        // Libérer le véhicule dans la transaction (atomique avec la complétion)
        await tx.vehicle.update({
          where: { id: vehicleId },
          data: {
            status: VehicleStatus.AVAILABLE,
            currentContractId: null,
            currentDriverId: null,
          },
        });

        contractCompleted = true;
        this.logger.log(
          `🎉 Contrat ${contractId} complété — ${updatedContract.validatedDays}/${updatedContract.targetDays} jours validés`,
        );
      }
    }

    // ── Étape 3 : Créer le surplus UNIQUEMENT si le contrat n'est pas terminé ──
    // Gap 2 fix : un surplus après targetDays est étouffé (règle D-08)
    if (remaining.gt(0) && !contractCompleted) {
      const lastEntryDate: any = await tx.dailyEntry.findFirst({
        where: { contractId },
        orderBy: { date: 'desc' },
        select: { date: true },
      });

      const nextDate = lastEntryDate
        ? new Date(lastEntryDate.date.getTime() + 86400_000)
        : new Date(paidAt);

      const newEntry = await tx.dailyEntry.create({
        data: {
          contractId,
          vehicleId,
          driverId,
          date: nextDate,
          status: DayStatus.PARTIALLY_PAID,
          expectedAmount: dailyAmount,
          paidAmount: remaining,
          paymentId,
        },
      });
      entryIds.push(newEntry.id);
      partialCount++;
    }

    return { validatedCount: newlyValidated, partialCount, entryIds, contractCompleted };
  }

  /**
   * Génère des DailyEntry supplémentaires pour une charge ajoutée au contrat.
   * Doit être appelé DANS une transaction Prisma.
   */
  async createChargeEntries(
    tx: any,
    contractId: string,
    vehicleId: string,
    driverId: string | null,
    chargeId: string,
    chargeType: import('@prisma/client').ChargeType,
    chargeAmount: Decimal,
  ): Promise<{ extraDaysAdded: number; entryIds: string[] }> {
    const contract: any = await tx.contract.findFirst({
      where: { id: contractId },
      select: { dailyAmount: true },
    });
    if (!contract) throw new NotFoundException(`Contrat ${contractId} introuvable`);

    const dailyAmount = new Decimal(contract.dailyAmount.toString());
    if (dailyAmount.isZero()) {
      throw new BadRequestException('dailyAmount ne peut pas être zéro');
    }

    const extraDays = Math.ceil(chargeAmount.div(dailyAmount).toNumber());

    const lastEntry: any = await tx.dailyEntry.findFirst({
      where: { contractId },
      orderBy: { date: 'desc' },
      select: { date: true },
    });

    const startDate = lastEntry
      ? new Date(lastEntry.date.getTime() + 86400_000)
      : new Date();

    const entryIds: string[] = [];
    let remaining = new Decimal(chargeAmount.toString());

    for (let i = 0; i < extraDays; i++) {
      const entryDate = new Date(startDate.getTime() + i * 86400_000);
      const entryAmount = Decimal.min(remaining, dailyAmount);
      remaining = remaining.minus(entryAmount);

      const entry: any = await tx.dailyEntry.create({
        data: {
          contractId,
          vehicleId,
          driverId: driverId ?? undefined,
          date: entryDate,
          status: DayStatus.UNPAID,
          expectedAmount: entryAmount,
          paidAmount: new Decimal(0),
          chargeId,
          chargeType,
        },
      });
      entryIds.push(entry.id);
    }

    return { extraDaysAdded: extraDays, entryIds };
  }

  /**
   * Initialise les premiers DailyEntry d'un contrat à son activation.
   * Doit être appelé DANS une transaction Prisma.
   */
  async initializeContractEntries(
    tx: any,
    contractId: string,
    vehicleId: string,
    driverId: string | null,
    startDate: Date,
    restDay: number | null,
    daysToGenerate = 7,
  ): Promise<string[]> {
    const contract: any = await tx.contract.findFirst({
      where: { id: contractId },
      select: { dailyAmount: true, targetDays: true, validatedDays: true },
    });
    if (!contract) throw new NotFoundException(`Contrat ${contractId} introuvable`);

    const entryIds: string[] = [];
    const targetDays = contract.targetDays ?? Infinity;

    for (let i = 0; i < daysToGenerate; i++) {
      const entryDate = new Date(startDate.getTime() + i * 86400_000);
      const isRest = restDay !== null && entryDate.getDay() === restDay;

      const entry: any = await tx.dailyEntry.create({
        data: {
          contractId,
          vehicleId,
          driverId: driverId ?? undefined,
          date: entryDate,
          status: isRest ? DayStatus.REST_DAY : DayStatus.UNPAID,
          expectedAmount: isRest ? null : contract.dailyAmount,
          isRestDay: isRest,
        },
      });
      entryIds.push(entry.id);
    }

    return entryIds;
  }

  // ─── Génération continue (Gap 1) ──────────────────────────────────────────

  /**
   * Assure qu'un contrat OWNERSHIP_PROGRAM actif a au moins `daysAhead`
   * entrées UNPAID/PARTIALLY_PAID futures à partir d'aujourd'hui.
   *
   * Appelé :
   *  1. Par le cron quotidien à 2h00
   *  2. Par PaymentsService après chaque paiement (en dehors de la transaction)
   *
   * Ne crée PAS d'entrées si le contrat est terminé ou si targetDays est déjà atteint.
   */
  async ensureEntriesAhead(contractId: string, daysAhead = 30): Promise<number> {
    const contract = await this.prisma.contract.findFirst({
      where: { id: contractId },
      select: {
        id: true,
        type: true,
        status: true,
        dailyAmount: true,
        targetDays: true,
        validatedDays: true,
        restDay: true,
        vehicleId: true,
        driverId: true,
      },
    });

    if (!contract) return 0;
    if (contract.status !== ContractStatus.ACTIVE) return 0;
    if (contract.type !== ContractType.OWNERSHIP_PROGRAM) return 0;

    const targetDays = contract.targetDays ?? Infinity;
    const remainingToGenerate = targetDays - contract.validatedDays;
    if (remainingToGenerate <= 0) return 0;

    // Compter les entrées UNPAID ou PARTIALLY_PAID existantes dans le futur
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingFuture = await this.prisma.dailyEntry.count({
      where: {
        contractId,
        date: { gte: today },
        status: { in: [DayStatus.UNPAID, DayStatus.PARTIALLY_PAID] },
      },
    });

    const toGenerate = Math.min(
      Math.max(0, daysAhead - existingFuture),
      remainingToGenerate - existingFuture,
    );

    if (toGenerate <= 0) return 0;

    // Trouver la dernière date existante pour enchaîner
    const lastEntry = await this.prisma.dailyEntry.findFirst({
      where: { contractId },
      orderBy: { date: 'desc' },
      select: { date: true },
    });

    const startDate = lastEntry
      ? new Date(lastEntry.date.getTime() + 86400_000)
      : today;

    const created: string[] = [];
    const restDay = contract.restDay ?? null;

    for (let i = 0; i < toGenerate; i++) {
      const entryDate = new Date(startDate.getTime() + i * 86400_000);
      const isRest = restDay !== null && entryDate.getDay() === restDay;

      try {
        await this.prisma.dailyEntry.create({
          data: {
            contractId,
            vehicleId: contract.vehicleId,
            driverId: contract.driverId ?? undefined,
            date: entryDate,
            status: isRest ? DayStatus.REST_DAY : DayStatus.UNPAID,
            expectedAmount: isRest ? null : contract.dailyAmount,
            isRestDay: isRest,
          },
        });
        created.push(entryDate.toISOString().split('T')[0]);
      } catch {
        // @@unique([contractId, date]) — entrée déjà existante, on saute
      }
    }

    if (created.length > 0) {
      this.logger.debug(
        `Contrat ${contractId} : ${created.length} nouvelle(s) entrée(s) générée(s)`,
      );
    }

    return created.length;
  }

  /**
   * Cron quotidien à 2h00 — génère les entrées futures manquantes
   * pour tous les contrats OWNERSHIP_PROGRAM actifs.
   *
   * Idempotent : si les entrées existent déjà, rien n'est créé (@@unique).
   */
  @Cron('0 2 * * *', { name: 'daily_entry_generation' })
  async dailyEntryGenerationCron(): Promise<void> {
    this.logger.log('⏰ Cron : génération des DailyEntry futures...');

    const activeContracts = await this.prisma.contract.findMany({
      where: {
        type: ContractType.OWNERSHIP_PROGRAM,
        status: ContractStatus.ACTIVE,
      },
      select: { id: true },
    });

    let totalGenerated = 0;
    for (const { id } of activeContracts) {
      try {
        const count = await this.ensureEntriesAhead(id, 30);
        totalGenerated += count;
      } catch (err) {
        this.logger.error(`Cron : erreur génération contrat ${id}`, err);
      }
    }

    this.logger.log(
      `⏰ Cron terminé : ${totalGenerated} entrée(s) créée(s) sur ${activeContracts.length} contrat(s)`,
    );
  }
}
