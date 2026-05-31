import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../../prisma/prisma.service';
import { DailyEntriesService } from '../daily-entries/daily-entries.service';
import { LedgerService } from '../ledger/ledger.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ContractStatus, PaymentSource, UserRole, UserStatus } from '@prisma/client';
import { Decimal } from 'decimal.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockActor = {
  id: 'actor-id',
  role: UserRole.MANAGER,
  firstName: 'Jean',
  lastName: 'Manager',
  status: UserStatus.ACTIVE,
};

const activeContract = {
  id: 'contract-id',
  type: 'OWNERSHIP_PROGRAM',
  status: ContractStatus.ACTIVE,
  dailyAmount: new Decimal(20000),
  validatedDays: 0,
  targetDays: 365,
  driverId: 'driver-id',
  vehicleId: 'vehicle-id',
};

const mockPrisma = {
  contract: { findFirst: jest.fn() },
  payment: { create: jest.fn(), update: jest.fn(), findFirst: jest.fn() },
  $transaction: jest.fn(),
};

const mockDailyEntries = {
  allocatePaymentToEntries: jest.fn(),
};

const mockLedger = { createEntry: jest.fn().mockResolvedValue(undefined) };
const mockAudit = { log: jest.fn().mockResolvedValue(undefined) };
const mockNotifications = { send: jest.fn().mockResolvedValue(undefined) };

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PaymentsService', () => {
  let service: PaymentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: DailyEntriesService, useValue: mockDailyEntries },
        { provide: LedgerService, useValue: mockLedger },
        { provide: AuditService, useValue: mockAudit },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    jest.clearAllMocks();
  });

  describe('recordPayment()', () => {
    const baseDto = {
      contractId: 'contract-id',
      vehicleId: 'vehicle-id',
      driverId: 'driver-id',
      amount: 20000,
      source: PaymentSource.MANUAL,
      paidAt: new Date().toISOString(),
    };

    const setupTransaction = (validatedCount: number, partialCount: number) => {
      const mockPayment = { id: 'payment-id', amount: new Decimal(baseDto.amount) };
      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          payment: {
            create: jest.fn().mockResolvedValue(mockPayment),
            update: jest.fn().mockResolvedValue(mockPayment),
            findFirst: jest.fn().mockResolvedValue({ ...mockPayment, dailyEntries: [] }),
          },
          contract: { update: jest.fn() },
        };
        mockDailyEntries.allocatePaymentToEntries.mockResolvedValue({
          validatedCount,
          partialCount,
          entryIds: ['entry-1'],
        });
        return fn(tx);
      });
      mockPrisma.payment.findFirst.mockResolvedValue({
        ...mockPayment,
        contract: activeContract,
        vehicle: {},
        driver: {},
        createdBy: {},
        dailyEntries: [],
      });
    };

    it('lève NotFoundException si le contrat n\'existe pas', async () => {
      mockPrisma.contract.findFirst.mockResolvedValue(null);
      await expect(service.recordPayment(baseDto as any, mockActor as any)).rejects.toThrow(NotFoundException);
    });

    it('lève BadRequestException si le contrat n\'est pas ACTIVE', async () => {
      mockPrisma.contract.findFirst.mockResolvedValue({ ...activeContract, status: 'DRAFT' });
      await expect(service.recordPayment(baseDto as any, mockActor as any)).rejects.toThrow(BadRequestException);
    });

    it('lève BadRequestException si le montant est 0', async () => {
      mockPrisma.contract.findFirst.mockResolvedValue(activeContract);
      await expect(
        service.recordPayment({ ...baseDto, amount: 0 } as any, mockActor as any),
      ).rejects.toThrow(BadRequestException);
    });

    describe('paiement exact (20 000 = dailyAmount)', () => {
      it('crée 1 jour VALIDATED', async () => {
        mockPrisma.contract.findFirst.mockResolvedValue(activeContract);
        setupTransaction(1, 0);

        const result = await service.recordPayment(baseDto as any, mockActor as any);

        expect(mockDailyEntries.allocatePaymentToEntries).toHaveBeenCalledWith(
          expect.anything(),
          'contract-id',
          'vehicle-id',
          'driver-id',
          'payment-id',
          expect.objectContaining({ s: expect.any(String) }), // Decimal
          expect.any(Date),
        );
        expect(mockAudit.log).toHaveBeenCalledWith(
          expect.objectContaining({ action: 'PAYMENT_RECORDED' }),
        );
      });
    });

    describe('paiement supérieur (45 000 = 2j + reliquat)', () => {
      it('crée 2 jours VALIDATED + 1 PARTIALLY_PAID', async () => {
        mockPrisma.contract.findFirst.mockResolvedValue(activeContract);
        const dto = { ...baseDto, amount: 45000 };
        setupTransaction(2, 1);

        await service.recordPayment(dto as any, mockActor as any);

        // La notification doit être PAYMENT_RECEIVED car validatedCount > 0
        expect(mockNotifications.send).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'PAYMENT_RECEIVED' }),
        );
      });
    });

    describe('paiement partiel (5 000 < dailyAmount)', () => {
      it('crée 0 jour validé et 1 PARTIALLY_PAID', async () => {
        mockPrisma.contract.findFirst.mockResolvedValue(activeContract);
        const dto = { ...baseDto, amount: 5000 };
        setupTransaction(0, 1);

        await service.recordPayment(dto as any, mockActor as any);

        expect(mockNotifications.send).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'PAYMENT_INCOMPLETE' }),
        );
      });
    });
  });
});
