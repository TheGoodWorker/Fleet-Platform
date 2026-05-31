import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DailyEntriesService } from './daily-entries.service';
import { PrismaService } from '../../prisma/prisma.service';
import { DayStatus } from '@prisma/client';
import { Decimal } from 'decimal.js';

// ─── Mock Prisma ──────────────────────────────────────────────────────────────

const mockPrisma = {
  contract: {
    findFirst: jest.fn(),
    update: jest.fn(),
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
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('DailyEntriesService — allocatePaymentToEntries()', () => {
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

  const CONTRACT_ID = 'contract-id';
  const VEHICLE_ID = 'vehicle-id';
  const DRIVER_ID = 'driver-id';
  const PAYMENT_ID = 'payment-id';
  const DAILY_AMOUNT = new Decimal(20000);

  const setupContract = (validatedDays = 0, targetDays = 365) => {
    mockPrisma.contract.findFirst.mockResolvedValue({
      dailyAmount: DAILY_AMOUNT,
      validatedDays,
      targetDays,
    });
    mockPrisma.contract.update.mockResolvedValue({
      validatedDays: validatedDays + 1,
      targetDays,
    });
  };

  // ─── Paiement exact ─────────────────────────────────────────────────────────

  describe('paiement exact = dailyAmount (20 000)', () => {
    it('valide 1 jour UNPAID → VALIDATED, validatedDays +1', async () => {
      setupContract();

      mockPrisma.dailyEntry.findMany.mockResolvedValue([
        {
          id: 'entry-1',
          date: new Date('2026-01-01'),
          status: DayStatus.UNPAID,
          paidAmount: null,
        },
      ]);
      mockPrisma.dailyEntry.update.mockResolvedValue({});
      mockPrisma.dailyEntry.findFirst.mockResolvedValue(null); // pas de dernier entry pour surplus

      const result = await service.allocatePaymentToEntries(
        mockPrisma as any,
        CONTRACT_ID,
        VEHICLE_ID,
        DRIVER_ID,
        PAYMENT_ID,
        DAILY_AMOUNT,
        new Date(),
      );

      expect(result.validatedCount).toBe(1);
      expect(result.partialCount).toBe(0);
      expect(mockPrisma.dailyEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: DayStatus.VALIDATED }),
        }),
      );
      // validatedDays incrémenté
      expect(mockPrisma.contract.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ validatedDays: { increment: 1 } }),
        }),
      );
    });
  });

  // ─── Paiement supérieur ─────────────────────────────────────────────────────

  describe('paiement supérieur 45 000 > dailyAmount (20 000)', () => {
    it('valide 2 jours UNPAID + crée 1 jour PARTIALLY_PAID avec le reliquat 5 000', async () => {
      setupContract();

      mockPrisma.dailyEntry.findMany.mockResolvedValue([
        { id: 'entry-1', date: new Date('2026-01-01'), status: DayStatus.UNPAID, paidAmount: null },
        { id: 'entry-2', date: new Date('2026-01-02'), status: DayStatus.UNPAID, paidAmount: null },
      ]);
      mockPrisma.dailyEntry.update.mockResolvedValue({});
      // Dernier entry pour calcul date du surplus
      mockPrisma.dailyEntry.findFirst.mockResolvedValue({ date: new Date('2026-01-02') });
      mockPrisma.dailyEntry.create.mockResolvedValue({ id: 'entry-3' });

      mockPrisma.contract.update.mockResolvedValue({ validatedDays: 2, targetDays: 365 });

      const result = await service.allocatePaymentToEntries(
        mockPrisma as any,
        CONTRACT_ID,
        VEHICLE_ID,
        DRIVER_ID,
        PAYMENT_ID,
        new Decimal(45000),
        new Date(),
      );

      expect(result.validatedCount).toBe(2);
      expect(result.partialCount).toBe(1); // reliquat 5 000

      // Jour supplémentaire PARTIALLY_PAID créé
      expect(mockPrisma.dailyEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: DayStatus.PARTIALLY_PAID,
            paidAmount: new Decimal(5000),
          }),
        }),
      );
    });
  });

  // ─── Paiement partiel ───────────────────────────────────────────────────────

  describe('paiement partiel 5 000 < dailyAmount (20 000)', () => {
    it('passe le jour en PARTIALLY_PAID, validatedDays ne change pas', async () => {
      setupContract(0);

      mockPrisma.dailyEntry.findMany.mockResolvedValue([
        { id: 'entry-1', date: new Date('2026-01-01'), status: DayStatus.UNPAID, paidAmount: null },
      ]);
      mockPrisma.dailyEntry.update.mockResolvedValue({});
      mockPrisma.dailyEntry.findFirst.mockResolvedValue(null);

      const result = await service.allocatePaymentToEntries(
        mockPrisma as any,
        CONTRACT_ID,
        VEHICLE_ID,
        DRIVER_ID,
        PAYMENT_ID,
        new Decimal(5000),
        new Date(),
      );

      expect(result.validatedCount).toBe(0);
      expect(result.partialCount).toBe(1);

      // Statut mis à PARTIALLY_PAID
      expect(mockPrisma.dailyEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: DayStatus.PARTIALLY_PAID }),
        }),
      );

      // validatedDays NE doit PAS être incrémenté (R-01)
      expect(mockPrisma.contract.update).not.toHaveBeenCalled();
    });
  });

  // ─── PARTIALLY_PAID prioritaire ────────────────────────────────────────────

  describe('priorité PARTIALLY_PAID sur UNPAID', () => {
    it('complète d\'abord le jour PARTIALLY_PAID avant de passer au UNPAID', async () => {
      setupContract(1);

      // Un jour PARTIALLY_PAID (déjà 15 000 payés) + un UNPAID
      mockPrisma.dailyEntry.findMany.mockResolvedValue([
        {
          id: 'entry-partial',
          date: new Date('2026-01-01'),
          status: DayStatus.PARTIALLY_PAID,
          paidAmount: new Decimal(15000),
        },
        {
          id: 'entry-unpaid',
          date: new Date('2026-01-02'),
          status: DayStatus.UNPAID,
          paidAmount: null,
        },
      ]);
      mockPrisma.dailyEntry.update.mockResolvedValue({});
      mockPrisma.dailyEntry.findFirst.mockResolvedValue(null);

      // 5 000 suffit à compléter le PARTIALLY_PAID (20 000 - 15 000 = 5 000)
      mockPrisma.contract.update.mockResolvedValue({ validatedDays: 2, targetDays: 365 });

      const result = await service.allocatePaymentToEntries(
        mockPrisma as any,
        CONTRACT_ID,
        VEHICLE_ID,
        DRIVER_ID,
        PAYMENT_ID,
        new Decimal(5000),
        new Date(),
      );

      expect(result.validatedCount).toBe(1);
      // Le premier appel update doit concerner entry-partial
      const firstCall = mockPrisma.dailyEntry.update.mock.calls[0];
      expect(firstCall[0].where.id).toBe('entry-partial');
      expect(firstCall[0].data.status).toBe(DayStatus.VALIDATED);
    });
  });

  // ─── Contrat introuvable ────────────────────────────────────────────────────

  it('lève NotFoundException si le contrat est introuvable', async () => {
    mockPrisma.contract.findFirst.mockResolvedValue(null);

    await expect(
      service.allocatePaymentToEntries(
        mockPrisma as any,
        'nonexistent',
        VEHICLE_ID,
        DRIVER_ID,
        PAYMENT_ID,
        DAILY_AMOUNT,
        new Date(),
      ),
    ).rejects.toThrow(NotFoundException);
  });
});

// ─── getProgressSummary() ─────────────────────────────────────────────────────

describe('DailyEntriesService — getProgressSummary()', () => {
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

  it('calcule progressPercent = 50% quand validatedDays = 182 / targetDays = 365', async () => {
    mockPrisma.contract.findFirst.mockResolvedValue({
      id: 'c1',
      type: 'OWNERSHIP_PROGRAM',
      dailyAmount: new Decimal(20000),
      targetDays: 365,
      validatedDays: 182,
      status: 'ACTIVE',
      restDay: null,
    });
    mockPrisma.dailyEntry.groupBy.mockResolvedValue([
      { status: 'VALIDATED', _count: { status: 182 } },
      { status: 'UNPAID', _count: { status: 100 } },
    ]);
    mockPrisma.dailyEntry.aggregate.mockResolvedValue({
      _sum: { paidAmount: new Decimal(3640000) },
    });
    mockPrisma.dailyEntry.findFirst.mockResolvedValue({
      date: new Date('2026-06-01'),
      status: 'UNPAID',
      paidAmount: null,
      expectedAmount: new Decimal(20000),
    });

    const result = await service.getProgressSummary('c1');

    expect(result.progressPercent).toBeCloseTo(49.86, 1); // 182/365 ≈ 49.86%
    expect(result.validatedDays).toBe(182);
    expect(result.remainingDays).toBe(183);
    expect(result.nextExpectedPayment).toBe('20000');
  });
});
