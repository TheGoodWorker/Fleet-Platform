import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ChargesService } from './charges.service';
import { PrismaService } from '../../prisma/prisma.service';
import { DailyEntriesService } from '../daily-entries/daily-entries.service';
import { LedgerService } from '../ledger/ledger.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ChargeStatus, ChargeType, UserRole, UserStatus } from '@prisma/client';
import { Decimal } from 'decimal.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockManager = {
  id: 'manager-id',
  role: UserRole.MANAGER,
  firstName: 'Paul',
  lastName: 'Manager',
  status: UserStatus.ACTIVE,
};

const mockSuperManager = {
  id: 'sm-id',
  role: UserRole.SUPER_MANAGER,
  firstName: 'Sophie',
  lastName: 'Super',
  status: UserStatus.ACTIVE,
};

const buildCharge = (overrides = {}) => ({
  id: 'charge-id',
  type: ChargeType.FRANCHISE,
  status: ChargeStatus.DRAFT,
  amount: new Decimal(75000),
  paidAmount: new Decimal(0),
  vehicleId: 'vehicle-id',
  contractId: 'contract-id',
  driverId: 'driver-id',
  proposedResponsible: 'DRIVER',
  validatedResponsible: null,
  createdById: 'manager-id',
  validatedById: null,
  validatedAt: null,
  rejectionReason: null,
  extraDaysAdded: null,
  vehicle: {},
  contract: { dailyAmount: new Decimal(25000), status: 'ACTIVE' },
  driver: {},
  createdBy: {},
  validatedBy: null,
  ...overrides,
});

const mockPrisma = {
  charge: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  vehicle: { findFirst: jest.fn() },
  contract: { findFirst: jest.fn() },
  $transaction: jest.fn(),
};

const mockDailyEntries = { createChargeEntries: jest.fn() };
const mockLedger = { createEntry: jest.fn().mockResolvedValue(undefined) };
const mockAudit = { log: jest.fn().mockResolvedValue(undefined) };
const mockNotifications = { send: jest.fn().mockResolvedValue(undefined) };

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ChargesService', () => {
  let service: ChargesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChargesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: DailyEntriesService, useValue: mockDailyEntries },
        { provide: LedgerService, useValue: mockLedger },
        { provide: AuditService, useValue: mockAudit },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<ChargesService>(ChargesService);
    jest.clearAllMocks();
  });

  // ─── validate() ───────────────────────────────────────────────────────────

  describe('validate()', () => {
    it('valide une charge PENDING_VALIDATION → VALIDATED', async () => {
      const charge = buildCharge({ status: ChargeStatus.PENDING_VALIDATION });
      mockPrisma.charge.findFirst.mockResolvedValue(charge);
      mockPrisma.charge.update.mockResolvedValue({ ...charge, status: ChargeStatus.VALIDATED });

      await service.validate('charge-id', { validatedResponsible: 'DRIVER' as any }, mockSuperManager as any);

      expect(mockPrisma.charge.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: ChargeStatus.VALIDATED }),
        }),
      );
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CHARGE_VALIDATED' }),
      );
    });

    it('lève BadRequestException si statut n\'est pas PENDING_VALIDATION', async () => {
      const charge = buildCharge({ status: ChargeStatus.DRAFT });
      mockPrisma.charge.findFirst.mockResolvedValue(charge);

      await expect(
        service.validate('charge-id', { validatedResponsible: 'DRIVER' as any }, mockSuperManager as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── addToContract() — règle 5 ────────────────────────────────────────────

  describe('addToContract() — charge DRIVER ajoutée au contrat', () => {
    const DAILY_AMOUNT = 25000;
    const CHARGE_AMOUNT = 75000; // 3 jours

    it('génère 3 DailyEntry supplémentaires pour une charge de 75 000 FCFA', async () => {
      const charge = buildCharge({
        status: ChargeStatus.VALIDATED,
        validatedResponsible: 'DRIVER',
      });
      const contract = {
        id: 'contract-id',
        vehicleId: 'vehicle-id',
        driverId: 'driver-id',
        dailyAmount: new Decimal(DAILY_AMOUNT),
        status: 'ACTIVE',
      };

      mockPrisma.charge.findFirst.mockResolvedValue(charge);
      mockPrisma.contract.findFirst.mockResolvedValue(contract);

      mockDailyEntries.createChargeEntries.mockResolvedValue({
        extraDaysAdded: 3,
        entryIds: ['e1', 'e2', 'e3'],
      });

      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          charge: { update: jest.fn() },
          dailyEntry: { findFirst: jest.fn(), update: jest.fn() },
        };
        return fn(tx);
      });
      mockPrisma.charge.findFirst.mockResolvedValueOnce(charge).mockResolvedValueOnce({
        ...charge,
        status: ChargeStatus.ADDED_TO_CONTRACT,
        extraDaysAdded: 3,
      });

      await service.addToContract(
        'charge-id',
        { contractId: 'contract-id' },
        mockSuperManager as any,
      );

      expect(mockDailyEntries.createChargeEntries).toHaveBeenCalledWith(
        expect.anything(), // tx
        'contract-id',
        'vehicle-id',
        'driver-id',
        'charge-id',
        ChargeType.FRANCHISE,
        expect.objectContaining({ s: '75000' }),
      );
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CHARGE_ADDED_TO_CONTRACT' }),
      );
    });

    it('lève BadRequestException si la charge n\'est pas validée', async () => {
      mockPrisma.charge.findFirst.mockResolvedValue(buildCharge({ status: ChargeStatus.DRAFT }));
      await expect(
        service.addToContract('charge-id', { contractId: 'contract-id' }, mockSuperManager as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('lève BadRequestException si validatedResponsible n\'est pas DRIVER', async () => {
      mockPrisma.charge.findFirst.mockResolvedValue(
        buildCharge({ status: ChargeStatus.VALIDATED, validatedResponsible: 'COMPANY' }),
      );
      await expect(
        service.addToContract('charge-id', { contractId: 'contract-id' }, mockSuperManager as any),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
