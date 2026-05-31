import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { DepositsService } from './deposits.service';
import { PrismaService } from '../../prisma/prisma.service';
import { LedgerService } from '../ledger/ledger.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { DepositStatus, UserRole, UserStatus } from '@prisma/client';
import { Decimal } from 'decimal.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockActor = {
  id: 'actor-id',
  role: UserRole.SUPER_MANAGER,
  firstName: 'Marie',
  lastName: 'Super',
  status: UserStatus.ACTIVE,
};

const activeContract = {
  id: 'contract-id',
  dailyAmount: new Decimal(25000),
  status: 'ACTIVE',
};

const mockPrisma = {
  contract: { findFirst: jest.fn(), update: jest.fn() },
  deposit: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  depositTransaction: { create: jest.fn() },
  $transaction: jest.fn(),
};

const mockLedger = { createEntry: jest.fn().mockResolvedValue(undefined) };
const mockAudit = { log: jest.fn().mockResolvedValue(undefined) };
const mockNotifications = { send: jest.fn().mockResolvedValue(undefined) };

// ─── Helper ───────────────────────────────────────────────────────────────────

const buildDeposit = (overrides = {}) => ({
  id: 'deposit-id',
  contractId: 'contract-id',
  recommendedAmount: new Decimal(50000),
  requestedAmount: new Decimal(50000),
  validatedAmount: null,
  paidAmount: new Decimal(0),
  remainingAmount: new Decimal(50000),
  usedAmount: new Decimal(0),
  refundedAmount: new Decimal(0),
  status: DepositStatus.PENDING,
  isStandardAmount: true,
  proposedById: 'actor-id',
  adminValidatedById: null,
  validatedAt: null,
  notes: null,
  transactions: [],
  contract: activeContract,
  ...overrides,
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('DepositsService', () => {
  let service: DepositsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DepositsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: LedgerService, useValue: mockLedger },
        { provide: AuditService, useValue: mockAudit },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<DepositsService>(DepositsService);
    jest.clearAllMocks();
  });

  // ─── create() ─────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('crée une caution standard — 2×25000 = 50 000 FCFA', async () => {
      mockPrisma.contract.findFirst.mockResolvedValue(activeContract);
      mockPrisma.deposit.findFirst.mockResolvedValue(null); // pas encore de caution
      mockPrisma.deposit.create.mockResolvedValue(buildDeposit());

      const result = await service.create(
        { contractId: 'contract-id', requestedAmount: 50000 },
        mockActor as any,
      );

      expect(mockPrisma.deposit.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isStandardAmount: true,
            requestedAmount: expect.any(Decimal),
          }),
        }),
      );
      // Pas de notification Admin pour un montant standard
      expect(mockNotifications.send).not.toHaveBeenCalled();
    });

    it('marque isStandardAmount=false et notifie l\'Admin pour montant hors-barème', async () => {
      mockPrisma.contract.findFirst.mockResolvedValue(activeContract);
      mockPrisma.deposit.findFirst.mockResolvedValue(null);
      mockPrisma.deposit.create.mockResolvedValue(buildDeposit({
        requestedAmount: new Decimal(30000),
        isStandardAmount: false,
      }));

      await service.create(
        { contractId: 'contract-id', requestedAmount: 30000 },
        mockActor as any,
      );

      expect(mockPrisma.deposit.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isStandardAmount: false }),
        }),
      );
      expect(mockNotifications.send).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'DEPOSIT_VALIDATION_REQUIRED', priority: 'HIGH' }),
      );
    });

    it('lève ConflictException si une caution existe déjà', async () => {
      mockPrisma.contract.findFirst.mockResolvedValue(activeContract);
      mockPrisma.deposit.findFirst.mockResolvedValue(buildDeposit());

      await expect(
        service.create({ contractId: 'contract-id', requestedAmount: 50000 }, mockActor as any),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── recordPayment() ──────────────────────────────────────────────────────

  describe('recordPayment()', () => {
    it('paiement partiel → statut PARTIAL', async () => {
      const deposit = buildDeposit();
      mockPrisma.deposit.findFirst.mockResolvedValue(deposit);

      const txResult = buildDeposit({
        paidAmount: new Decimal(25000),
        remainingAmount: new Decimal(25000),
        status: DepositStatus.PARTIAL,
      });

      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          deposit: { update: jest.fn().mockResolvedValue(txResult) },
          depositTransaction: { create: jest.fn() },
          contract: { update: jest.fn() },
        };
        return fn(tx);
      });

      // Re-fetch après transaction
      mockPrisma.deposit.findFirst.mockResolvedValueOnce(deposit);
      mockPrisma.deposit.findFirst.mockResolvedValueOnce(txResult);

      const result = await service.recordPayment('deposit-id', { amount: 25000 }, mockActor as any);
      expect(result.status).toBe(DepositStatus.PARTIAL);
    });

    it('paiement total → statut PAID + depositPaid = true sur le contrat', async () => {
      const deposit = buildDeposit();
      mockPrisma.deposit.findFirst.mockResolvedValue(deposit);

      const paidDeposit = buildDeposit({
        paidAmount: new Decimal(50000),
        remainingAmount: new Decimal(0),
        status: DepositStatus.PAID,
      });

      let contractUpdated = false;
      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          deposit: { update: jest.fn().mockResolvedValue(paidDeposit) },
          depositTransaction: { create: jest.fn() },
          contract: {
            update: jest.fn().mockImplementation(() => {
              contractUpdated = true;
              return {};
            }),
          },
        };
        return fn(tx);
      });
      mockPrisma.deposit.findFirst
        .mockResolvedValueOnce(deposit)
        .mockResolvedValueOnce(paidDeposit);

      await service.recordPayment('deposit-id', { amount: 50000 }, mockActor as any);

      // depositPaid = true sur le contrat (R-05)
      expect(contractUpdated).toBe(true);
    });

    it('bloque si caution hors-barème non validée par Admin (D-13)', async () => {
      const deposit = buildDeposit({ isStandardAmount: false, validatedAmount: null });
      mockPrisma.deposit.findFirst.mockResolvedValue(deposit);

      await expect(
        service.recordPayment('deposit-id', { amount: 30000 }, mockActor as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('lève BadRequestException si paiement > restant', async () => {
      const deposit = buildDeposit();
      mockPrisma.deposit.findFirst.mockResolvedValue(deposit);

      await expect(
        service.recordPayment('deposit-id', { amount: 99999 }, mockActor as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── refund() — R-06 ──────────────────────────────────────────────────────

  describe('refund() — R-06', () => {
    it('bloque le remboursement si le contrat est encore ACTIVE', async () => {
      const deposit = buildDeposit({ status: DepositStatus.PAID });
      mockPrisma.deposit.findFirst.mockResolvedValue(deposit);
      mockPrisma.contract.findFirst.mockResolvedValue({ status: 'ACTIVE' });

      await expect(
        service.refund('deposit-id', { amount: 50000 }, mockActor as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('autorise le remboursement après COMPLETED', async () => {
      const deposit = buildDeposit({ status: DepositStatus.PAID });
      mockPrisma.deposit.findFirst.mockResolvedValue(deposit);
      mockPrisma.contract.findFirst.mockResolvedValue({ status: 'COMPLETED' });

      const refundedDeposit = buildDeposit({
        refundedAmount: new Decimal(50000),
        remainingAmount: new Decimal(0),
        status: DepositStatus.REFUNDED,
      });
      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          deposit: { update: jest.fn().mockResolvedValue(refundedDeposit) },
          depositTransaction: { create: jest.fn() },
        };
        return fn(tx);
      });
      mockPrisma.deposit.findFirst
        .mockResolvedValueOnce(deposit)
        .mockResolvedValueOnce(refundedDeposit);

      const result = await service.refund('deposit-id', { amount: 50000 }, mockActor as any);
      expect(result.status).toBe(DepositStatus.REFUNDED);
    });
  });
});
