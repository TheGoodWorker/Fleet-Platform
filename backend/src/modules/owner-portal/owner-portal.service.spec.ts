import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ContractType, RentalPaymentStatus } from '@prisma/client';
import { OwnerPortalService } from './owner-portal.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';

const mockPrisma = {
  contract: { findFirst: jest.fn() },
  owner: { findFirst: jest.fn() },
  driver: { findFirst: jest.fn() },
  document: { findMany: jest.fn() },
  accidentCase: { findMany: jest.fn() },
  maintenanceRecord: { findMany: jest.fn() },
  notification: { findMany: jest.fn() },
  ownerPortalVisibilitySettings: {
    findFirst: jest.fn(),
    upsert: jest.fn(),
  },
  ownerRentalPayment: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
};

const mockAudit = { log: jest.fn().mockResolvedValue(undefined) };
const mockNotifications = { send: jest.fn().mockResolvedValue(undefined) };
const mockActor = { id: 'actor-1' } as any;

const SIMPLE_RENTAL_CONTRACT = {
  id: 'c-1',
  type: ContractType.SIMPLE_RENTAL,
  status: 'ACTIVE',
  vehicleInvestmentCost: null,
  vehicle: { id: 'v-1', plateNumber: 'ABC-123', brand: 'Toyota', model: 'Camry' },
  driver: { id: 'd-1' },
  owner: { id: 'own-1', userId: 'owner-user-1' },
  ownerPortalSettings: null,
  ownerRentalPayments: [],
};

describe('OwnerPortalService', () => {
  let service: OwnerPortalService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OwnerPortalService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();
    service = module.get<OwnerPortalService>(OwnerPortalService);
  });

  // ─── upsertVisibilitySettings — D-16 ─────────────────────────────────────────

  describe('upsertVisibilitySettings — D-16', () => {
    it('lève BadRequestException si SIMPLE_RENTAL tente d\'activer showDailyEntries', async () => {
      mockPrisma.contract.findFirst.mockResolvedValue({
        id: 'c-1',
        type: ContractType.SIMPLE_RENTAL,
      });
      await expect(
        service.upsertVisibilitySettings(
          'c-1',
          { showDailyEntries: true } as any,
          mockActor,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('lève BadRequestException si SIMPLE_RENTAL tente d\'activer showDriverPayments', async () => {
      mockPrisma.contract.findFirst.mockResolvedValue({
        id: 'c-1',
        type: ContractType.SIMPLE_RENTAL,
      });
      await expect(
        service.upsertVisibilitySettings(
          'c-1',
          { showDriverPayments: true } as any,
          mockActor,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('accepte les paramètres non financiers pour SIMPLE_RENTAL', async () => {
      mockPrisma.contract.findFirst.mockResolvedValue({
        id: 'c-1',
        type: ContractType.SIMPLE_RENTAL,
      });
      const settings = { contractId: 'c-1', showVehicleDetails: true };
      mockPrisma.ownerPortalVisibilitySettings.upsert.mockResolvedValue(settings);

      const result = await service.upsertVisibilitySettings(
        'c-1',
        { showVehicleDetails: true } as any,
        mockActor,
      );

      expect(result).toEqual(settings);
      expect(mockAudit.log).toHaveBeenCalled();
    });

    it('accepte showDailyEntries=true pour un contrat non SIMPLE_RENTAL', async () => {
      mockPrisma.contract.findFirst.mockResolvedValue({
        id: 'c-2',
        type: ContractType.PARTNER_FLEET,
      });
      const settings = { contractId: 'c-2', showDailyEntries: true };
      mockPrisma.ownerPortalVisibilitySettings.upsert.mockResolvedValue(settings);

      const result = await service.upsertVisibilitySettings(
        'c-2',
        { showDailyEntries: true } as any,
        mockActor,
      );

      expect(result).toEqual(settings);
    });
  });

  // ─── getDashboard — visibilité ────────────────────────────────────────────────

  describe('getDashboard', () => {
    it('lève NotFoundException si contrat introuvable', async () => {
      mockPrisma.contract.findFirst.mockResolvedValue(null);
      await expect(service.getDashboard('c-x', 'user-x')).rejects.toThrow(NotFoundException);
    });

    it('lève ForbiddenException si userId ne correspond pas au propriétaire', async () => {
      mockPrisma.contract.findFirst.mockResolvedValue({
        ...SIMPLE_RENTAL_CONTRACT,
        owner: { id: 'own-1', userId: 'another-user' },
      });
      await expect(service.getDashboard('c-1', 'owner-user-1')).rejects.toThrow(ForbiddenException);
    });

    it('retourne null pour vehicleDetails si showVehicleDetails=false', async () => {
      mockPrisma.contract.findFirst.mockResolvedValue({
        ...SIMPLE_RENTAL_CONTRACT,
        ownerPortalSettings: { showVehicleDetails: false, showDriverName: false },
      });

      const result = await service.getDashboard('c-1', 'owner-user-1');
      expect(result.vehicleDetails).toBeNull();
    });

    it('expose vehicleDetails si showVehicleDetails=true', async () => {
      mockPrisma.contract.findFirst.mockResolvedValue({
        ...SIMPLE_RENTAL_CONTRACT,
        ownerPortalSettings: {
          showVehicleDetails: true,
          showDriverName: false,
          showDocuments: false,
          showAccidents: false,
          showMaintenance: false,
          showNotifications: false,
          showRoi: false,
        },
      });

      const result = await service.getDashboard('c-1', 'owner-user-1');
      expect(result.vehicleDetails).toEqual({
        id: 'v-1',
        plateNumber: 'ABC-123',
        brand: 'Toyota',
        model: 'Camry',
      });
    });

    it('calcule le ROI (Arbitrage I) quand showRoi=true et investmentCost disponible', async () => {
      const payments = [
        { status: RentalPaymentStatus.PAID, expectedAmount: '5000', actualAmount: '5000', periodYear: 2026, periodMonth: 1 },
        { status: RentalPaymentStatus.PAID, expectedAmount: '5000', actualAmount: '5000', periodYear: 2026, periodMonth: 2 },
      ];
      mockPrisma.contract.findFirst.mockResolvedValue({
        ...SIMPLE_RENTAL_CONTRACT,
        vehicleInvestmentCost: '50000',
        ownerPortalSettings: {
          showVehicleDetails: false,
          showDriverName: false,
          showDocuments: false,
          showAccidents: false,
          showMaintenance: false,
          showNotifications: false,
          showRoi: true,
        },
        ownerRentalPayments: payments,
      });

      const result = await service.getDashboard('c-1', 'owner-user-1');

      expect(result.roi).not.toBeNull();
      expect(result.roi!.investmentCost).toBe(50000);
      expect(result.roi!.cumulativePaid).toBe(10000);
      // ROI = (10000 - 50000) / 50000 * 100 = -80%
      expect(result.roi!.roiPercent).toBeCloseTo(-80);
    });

    it('retourne rentalPayments null si contrat non SIMPLE_RENTAL', async () => {
      mockPrisma.contract.findFirst.mockResolvedValue({
        ...SIMPLE_RENTAL_CONTRACT,
        type: ContractType.PARTNER_FLEET,
        ownerPortalSettings: null,
      });

      const result = await service.getDashboard('c-1', 'owner-user-1');
      expect(result.rentalPayments).toBeNull();
    });
  });

  // ─── recordRentalPayment ──────────────────────────────────────────────────────

  describe('recordRentalPayment', () => {
    const dto = {
      contractId: 'c-1',
      ownerId: 'own-1',
      expectedAmount: 5000,
      periodMonth: 5,
      periodYear: 2026,
    } as any;

    it('lève BadRequestException si contrat non SIMPLE_RENTAL', async () => {
      mockPrisma.contract.findFirst.mockResolvedValue({
        id: 'c-1',
        type: ContractType.PARTNER_FLEET,
      });
      await expect(service.recordRentalPayment(dto, mockActor)).rejects.toThrow(BadRequestException);
    });

    it('lève BadRequestException si versement déjà existant pour la période', async () => {
      mockPrisma.contract.findFirst.mockResolvedValue({ id: 'c-1', type: ContractType.SIMPLE_RENTAL });
      mockPrisma.owner.findFirst.mockResolvedValue({ id: 'own-1', userId: 'u-own-1' });
      mockPrisma.ownerRentalPayment.findFirst.mockResolvedValue({ id: 'pay-existing' });

      await expect(service.recordRentalPayment(dto, mockActor)).rejects.toThrow(BadRequestException);
    });

    it('crée le versement avec statut PAID si actualAmount >= expectedAmount', async () => {
      mockPrisma.contract.findFirst.mockResolvedValue({ id: 'c-1', type: ContractType.SIMPLE_RENTAL });
      mockPrisma.owner.findFirst.mockResolvedValue({ id: 'own-1', userId: 'u-own-1' });
      mockPrisma.ownerRentalPayment.findFirst.mockResolvedValue(null);
      const payment = {
        id: 'pay-1',
        status: RentalPaymentStatus.PAID,
        expectedAmount: 5000,
        actualAmount: 5000,
      };
      mockPrisma.ownerRentalPayment.create.mockResolvedValue(payment);

      const result = await service.recordRentalPayment(
        { ...dto, actualAmount: 5000 },
        mockActor,
      );

      expect(mockPrisma.ownerRentalPayment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: RentalPaymentStatus.PAID }),
        }),
      );
      expect(result).toEqual(payment);
    });

    it('crée le versement avec statut PENDING si actualAmount < expectedAmount', async () => {
      mockPrisma.contract.findFirst.mockResolvedValue({ id: 'c-1', type: ContractType.SIMPLE_RENTAL });
      mockPrisma.owner.findFirst.mockResolvedValue({ id: 'own-1', userId: null });
      mockPrisma.ownerRentalPayment.findFirst.mockResolvedValue(null);
      mockPrisma.ownerRentalPayment.create.mockResolvedValue({
        id: 'pay-2',
        status: RentalPaymentStatus.PENDING,
      });

      await service.recordRentalPayment({ ...dto, actualAmount: 2000 }, mockActor);

      expect(mockPrisma.ownerRentalPayment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: RentalPaymentStatus.PENDING }),
        }),
      );
    });
  });

  // ─── getFinancialSummary ─────────────────────────────────────────────────────

  describe('getFinancialSummary', () => {
    it('lève NotFoundException si contrat non SIMPLE_RENTAL', async () => {
      mockPrisma.contract.findFirst.mockResolvedValue(null);
      await expect(service.getFinancialSummary('c-1', 2026, 5)).rejects.toThrow(NotFoundException);
    });

    it('retourne balance correcte avec plusieurs versements', async () => {
      mockPrisma.contract.findFirst.mockResolvedValue({ id: 'c-1', type: ContractType.SIMPLE_RENTAL });
      mockPrisma.ownerRentalPayment.findFirst.mockResolvedValue(null);
      mockPrisma.ownerRentalPayment.findMany.mockResolvedValue([
        { status: RentalPaymentStatus.PAID, expectedAmount: '5000', actualAmount: '5000' },
        { status: RentalPaymentStatus.PENDING, expectedAmount: '5000', actualAmount: null },
        { status: RentalPaymentStatus.PAID, expectedAmount: '5000', actualAmount: '4500' },
      ]);

      const result = await service.getFinancialSummary('c-1', 2026, 5);

      expect(result.balance.totalExpected).toBe(15000);
      expect(result.balance.totalPaid).toBe(9500);  // 5000 + 4500
      expect(result.balance.totalRemaining).toBe(5500);
    });
  });
});
