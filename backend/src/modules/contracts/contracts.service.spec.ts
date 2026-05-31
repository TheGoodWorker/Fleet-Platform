import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { PrismaService } from '../../prisma/prisma.service';
import { DailyEntriesService } from '../daily-entries/daily-entries.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ContractStatus, ContractType, UserRole, UserStatus, VehicleStatus } from '@prisma/client';
import { Decimal } from 'decimal.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockAdmin = {
  id: 'admin-id',
  role: UserRole.ADMIN,
  firstName: 'Admin',
  lastName: 'Fleet',
  status: UserStatus.ACTIVE,
};

const buildContract = (overrides = {}) => ({
  id: 'contract-id',
  type: ContractType.OWNERSHIP_PROGRAM,
  status: ContractStatus.DRAFT,
  vehicleId: 'vehicle-id',
  driverId: 'driver-id',
  managerId: 'manager-id',
  dailyAmount: new Decimal(20000),
  targetDays: 365,
  validatedDays: 0,
  restDay: 0,
  // Checklist
  kycValidated: true,
  fieldValidated: true,
  depositPaid: true,
  contractSigned: true,
  managerApproved: true,
  adminApproved: true,
  // Relations
  vehicle: { id: 'vehicle-id', plateNumber: 'AB-1234', status: VehicleStatus.AVAILABLE },
  driver: { id: 'driver-id', status: 'APPROVED', user: { id: 'user-id', firstName: 'Moussa', lastName: 'Driver' } },
  owner: null,
  deposit: { id: 'deposit-id', status: 'PAID', paidAmount: new Decimal(40000), remainingAmount: new Decimal(40000) },
  _count: { payments: 0, dailyEntries: 0, charges: 0 },
  ...overrides,
});

const mockPrisma = {
  contract: { findFirst: jest.fn(), update: jest.fn() },
  vehicle: { update: jest.fn() },
  driver: { findFirst: jest.fn(), update: jest.fn() },
  $transaction: jest.fn(),
};

const mockDailyEntries = { initializeContractEntries: jest.fn().mockResolvedValue(['e1', 'e2']) };
const mockAudit = { log: jest.fn().mockResolvedValue(undefined) };
const mockNotifications = { send: jest.fn().mockResolvedValue(undefined) };

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ContractsService — activate()', () => {
  let service: ContractsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContractsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: DailyEntriesService, useValue: mockDailyEntries },
        { provide: AuditService, useValue: mockAudit },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<ContractsService>(ContractsService);
    jest.clearAllMocks();
  });

  // ─── Activation réussie ────────────────────────────────────────────────────

  it('active un contrat OWNERSHIP_PROGRAM avec checklist complète', async () => {
    const contract = buildContract();
    mockPrisma.contract.findFirst
      .mockResolvedValueOnce(contract)   // findFirst dans activate()
      .mockResolvedValueOnce(contract);  // findById en retour final

    mockPrisma.$transaction.mockImplementation(async (fn: any) => {
      const tx = {
        contract: { update: jest.fn() },
        vehicle: { update: jest.fn() },
        driver: {
          findFirst: jest.fn().mockResolvedValue({ status: 'APPROVED' }),
          update: jest.fn(),
        },
      };
      return fn(tx);
    });

    mockPrisma.driver.findFirst.mockResolvedValue({ userId: 'user-id' });

    await service.activate('contract-id', mockAdmin as any);

    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(mockDailyEntries.initializeContractEntries).toHaveBeenCalledWith(
      expect.anything(), // tx
      'contract-id',
      'vehicle-id',
      'driver-id',
      expect.any(Date),
      0, // restDay
      7,
    );
    expect(mockAudit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CONTRACT_ACTIVATED' }),
    );
  });

  // ─── Activation impossible sans caution (R-05) ────────────────────────────

  it('lève BadRequestException si depositPaid = false (R-05)', async () => {
    const contract = buildContract({ depositPaid: false });
    mockPrisma.contract.findFirst.mockResolvedValue(contract);

    await expect(service.activate('contract-id', mockAdmin as any)).rejects.toThrow(BadRequestException);

    // Le message d'erreur doit contenir la règle R-05
    try {
      await service.activate('contract-id', mockAdmin as any);
    } catch (e: any) {
      expect(JSON.stringify(e.response)).toContain('R-05');
    }
  });

  it('lève BadRequestException si kycValidated = false', async () => {
    const contract = buildContract({ kycValidated: false });
    mockPrisma.contract.findFirst.mockResolvedValue(contract);
    await expect(service.activate('contract-id', mockAdmin as any)).rejects.toThrow(BadRequestException);
  });

  it('lève BadRequestException si fieldValidated = false', async () => {
    const contract = buildContract({ fieldValidated: false });
    mockPrisma.contract.findFirst.mockResolvedValue(contract);
    await expect(service.activate('contract-id', mockAdmin as any)).rejects.toThrow(BadRequestException);
  });

  it('lève BadRequestException si le chauffeur n\'est pas APPROVED/ACTIVE', async () => {
    const contract = buildContract({
      driver: { id: 'driver-id', status: 'PENDING_KYC', user: {} },
    });
    mockPrisma.contract.findFirst.mockResolvedValue(contract);
    await expect(service.activate('contract-id', mockAdmin as any)).rejects.toThrow(BadRequestException);
  });

  it('lève BadRequestException si le véhicule est IMMOBILIZED', async () => {
    const contract = buildContract({
      vehicle: { id: 'vehicle-id', plateNumber: 'AB-1234', status: VehicleStatus.IMMOBILIZED },
    });
    mockPrisma.contract.findFirst.mockResolvedValue(contract);
    await expect(service.activate('contract-id', mockAdmin as any)).rejects.toThrow(BadRequestException);
  });

  it('lève BadRequestException si le statut du contrat n\'est pas DRAFT/PENDING_APPROVAL', async () => {
    const contract = buildContract({ status: ContractStatus.ACTIVE });
    mockPrisma.contract.findFirst.mockResolvedValue(contract);
    await expect(service.activate('contract-id', mockAdmin as any)).rejects.toThrow(BadRequestException);
  });

  it('retourne NotFoundException si le contrat n\'existe pas', async () => {
    mockPrisma.contract.findFirst.mockResolvedValue(null);
    await expect(service.activate('unknown-id', mockAdmin as any)).rejects.toThrow(NotFoundException);
  });
});
