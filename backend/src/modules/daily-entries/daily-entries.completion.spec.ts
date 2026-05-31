/**
 * Tests d'intégration — Complétion automatique du contrat
 *
 * Couvre les scénarios Gap 2 & 3 :
 * - Le contrat passe COMPLETED quand validatedDays >= targetDays
 * - Aucune entrée surplus n'est créée une fois le contrat terminé
 * - Le véhicule est libéré (AVAILABLE) à la complétion
 * - L'entrée surplus est bien créée AVANT la complétion
 */

import { Test, TestingModule } from '@nestjs/testing';
import { DailyEntriesService } from './daily-entries.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ContractStatus, DayStatus, VehicleStatus } from '@prisma/client';
import { Decimal } from 'decimal.js';

// ─── Mock Prisma ──────────────────────────────────────────────────────────────

const mockPrisma = {
  contract: {
    findFirst: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  dailyEntry: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    groupBy: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
  },
  vehicle: {
    update: jest.fn(),
  },
};

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const CONTRACT_ID = 'contract-id';
const VEHICLE_ID = 'vehicle-id';
const DRIVER_ID = 'driver-id';
const PAYMENT_ID = 'payment-id';
const DAILY_AMOUNT = new Decimal(20000);

const buildTx = (contractUpdateResult: any) => ({
  contract: {
    // Le service lit le contrat via tx.contract.findFirst — on délègue au mock
    // racine que chaque test configure (dailyAmount/validatedDays/targetDays).
    findFirst: jest.fn((...args: any[]) => mockPrisma.contract.findFirst(...args)),
    update: jest.fn().mockResolvedValue(contractUpdateResult),
  },
  dailyEntry: {
    findMany: jest.fn(),
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({ id: 'surplus-entry' }),
    update: jest.fn().mockResolvedValue({}),
    groupBy: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
  },
  vehicle: {
    update: jest.fn().mockResolvedValue({}),
  },
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('DailyEntriesService — complétion automatique du contrat', () => {
  let service: DailyEntriesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DailyEntriesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<DailyEntriesService>(DailyEntriesService);
    jest.clearAllMocks();
  });

  // ─── Scénario 1 : Dernier jour payé → contrat COMPLETED ───────────────────

  describe('dernier jour payé → contrat COMPLETED (validatedDays + 1 === targetDays)', () => {
    it('passe le contrat en COMPLETED et libère le véhicule', async () => {
      // Contract avec 364 jours validés sur 365 cible
      mockPrisma.contract.findFirst.mockResolvedValue({
        dailyAmount: DAILY_AMOUNT,
        validatedDays: 364,
        targetDays: 365,
      });

      // Un seul jour UNPAID restant (le 365e)
      const tx = buildTx({
        validatedDays: 365, // après increment
        targetDays: 365,
        status: ContractStatus.ACTIVE,
      });

      // Le contract.update est appelé deux fois :
      // 1ère fois : increment validatedDays → renvoie {validatedDays:365, targetDays:365}
      // 2ème fois : status = COMPLETED
      tx.contract.update
        .mockResolvedValueOnce({ validatedDays: 365, targetDays: 365 })
        .mockResolvedValueOnce({ status: ContractStatus.COMPLETED });

      tx.dailyEntry.findMany.mockResolvedValue([
        { id: 'entry-365', date: new Date('2026-12-31'), status: DayStatus.UNPAID, paidAmount: null },
      ]);

      const result = await service.allocatePaymentToEntries(
        tx as any,
        CONTRACT_ID,
        VEHICLE_ID,
        DRIVER_ID,
        PAYMENT_ID,
        DAILY_AMOUNT,
        new Date(),
      );

      expect(result.validatedCount).toBe(1);
      expect(result.contractCompleted).toBe(true);

      // Contrat passé en COMPLETED
      const completionCall = tx.contract.update.mock.calls.find(
        (call: any[]) => call[0]?.data?.status === ContractStatus.COMPLETED,
      );
      expect(completionCall).toBeDefined();
      expect(completionCall[0].data).toMatchObject({
        status: ContractStatus.COMPLETED,
      });

      // Véhicule libéré
      expect(tx.vehicle.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: VehicleStatus.AVAILABLE,
            currentContractId: null,
            currentDriverId: null,
          }),
        }),
      );
    });
  });

  // ─── Scénario 2 : Pas d'entrée surplus après complétion ───────────────────

  describe('pas de surplus après complétion du contrat', () => {
    it('ne crée PAS d\'entrée PARTIALLY_PAID si le contrat vient d\'être complété', async () => {
      mockPrisma.contract.findFirst.mockResolvedValue({
        dailyAmount: DAILY_AMOUNT,
        validatedDays: 364,
        targetDays: 365,
      });

      const tx = buildTx({ validatedDays: 365, targetDays: 365 });

      // Paiement supérieur : 25 000 alors que dailyAmount = 20 000
      // Après validation du dernier jour, reste 5 000 → surplus potentiel
      tx.contract.update
        .mockResolvedValueOnce({ validatedDays: 365, targetDays: 365 })
        .mockResolvedValueOnce({ status: ContractStatus.COMPLETED });

      tx.dailyEntry.findMany.mockResolvedValue([
        { id: 'entry-365', date: new Date('2026-12-31'), status: DayStatus.UNPAID, paidAmount: null },
      ]);
      tx.dailyEntry.findFirst.mockResolvedValue({ date: new Date('2026-12-31') });

      const result = await service.allocatePaymentToEntries(
        tx as any,
        CONTRACT_ID,
        VEHICLE_ID,
        DRIVER_ID,
        PAYMENT_ID,
        new Decimal(25000), // supérieur — reliquat = 5 000
        new Date(),
      );

      expect(result.validatedCount).toBe(1);
      expect(result.contractCompleted).toBe(true);

      // CRITIQUE : aucune entrée surplus créée après complétion
      expect(tx.dailyEntry.create).not.toHaveBeenCalled();
    });
  });

  // ─── Scénario 3 : Surplus créé quand le contrat n'est PAS complété ─────────

  describe('surplus créé quand le contrat n\'est PAS encore complété', () => {
    it('crée une entrée PARTIALLY_PAID si remaining > 0 et contrat non complété', async () => {
      mockPrisma.contract.findFirst.mockResolvedValue({
        dailyAmount: DAILY_AMOUNT,
        validatedDays: 0,
        targetDays: 365,
      });

      const tx = buildTx({ validatedDays: 2, targetDays: 365 });

      // Paiement 45 000 = 2 jours + reliquat 5 000
      tx.contract.update
        .mockResolvedValueOnce({ validatedDays: 2, targetDays: 365 }); // pas encore complété

      tx.dailyEntry.findMany.mockResolvedValue([
        { id: 'entry-1', date: new Date('2026-01-01'), status: DayStatus.UNPAID, paidAmount: null },
        { id: 'entry-2', date: new Date('2026-01-02'), status: DayStatus.UNPAID, paidAmount: null },
      ]);
      tx.dailyEntry.findFirst.mockResolvedValue({ date: new Date('2026-01-02') });

      const result = await service.allocatePaymentToEntries(
        tx as any,
        CONTRACT_ID,
        VEHICLE_ID,
        DRIVER_ID,
        PAYMENT_ID,
        new Decimal(45000),
        new Date(),
      );

      expect(result.validatedCount).toBe(2);
      expect(result.partialCount).toBe(1);
      expect(result.contractCompleted).toBe(false);

      // Entrée surplus PARTIALLY_PAID bien créée
      expect(tx.dailyEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: DayStatus.PARTIALLY_PAID,
            paidAmount: new Decimal(5000),
          }),
        }),
      );

      // Véhicule NON libéré (contrat toujours actif)
      expect(tx.vehicle.update).not.toHaveBeenCalled();
    });
  });

  // ─── Scénario 4 : Libération véhicule → champs nullés correctement ─────────

  describe('libération véhicule à la complétion — champs nullés', () => {
    it('libère le véhicule (contrat + chauffeur nullés) en conservant le manager', async () => {
      mockPrisma.contract.findFirst.mockResolvedValue({
        dailyAmount: DAILY_AMOUNT,
        validatedDays: 364,
        targetDays: 365,
      });

      const tx = buildTx({ validatedDays: 365, targetDays: 365 });
      tx.contract.update
        .mockResolvedValueOnce({ validatedDays: 365, targetDays: 365 })
        .mockResolvedValueOnce({ status: ContractStatus.COMPLETED });

      tx.dailyEntry.findMany.mockResolvedValue([
        { id: 'entry-365', date: new Date('2026-12-31'), status: DayStatus.UNPAID, paidAmount: null },
      ]);

      await service.allocatePaymentToEntries(
        tx as any,
        CONTRACT_ID,
        VEHICLE_ID,
        DRIVER_ID,
        PAYMENT_ID,
        DAILY_AMOUNT,
        new Date(),
      );

      // La libération à la complétion détache le contrat et le chauffeur et
      // repasse le véhicule AVAILABLE. L'assignation manager (currentManagerId)
      // est indépendante du contrat (VehicleManagerAssignment) et persiste.
      const updateCall = tx.vehicle.update.mock.calls[0][0];
      expect(updateCall.where).toEqual({ id: VEHICLE_ID });
      expect(updateCall.data).toMatchObject({
        status: VehicleStatus.AVAILABLE,
        currentContractId: null,
        currentDriverId: null,
      });
      expect(updateCall.data).not.toHaveProperty('currentManagerId');
    });
  });
});
