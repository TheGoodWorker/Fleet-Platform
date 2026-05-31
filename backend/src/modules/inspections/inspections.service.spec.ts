import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InspectionsService } from './inspections.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  InspectionStatus, InspectionType, FuelLevel, UserRole, UserStatus,
} from '@prisma/client';
import { Decimal } from 'decimal.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockActor = {
  id: 'manager-id',
  role: UserRole.MANAGER,
  firstName: 'Paul',
  lastName: 'Manager',
  status: UserStatus.ACTIVE,
};

const buildInspection = (overrides: any = {}) => ({
  id: 'insp-id',
  type: InspectionType.VEHICLE_DELIVERY,
  status: InspectionStatus.PENDING_DRIVER,
  vehicleId: 'vehicle-id',
  contractId: 'contract-id',
  driverId: 'driver-id',
  managerId: 'manager-id',
  fuelLevelIn: FuelLevel.FULL,
  fuelLevelOut: null,
  mileageIn: 100000,
  mileageOut: null,
  linkedHandoverInspectionId: null,
  returnComparisonNotes: null,
  driverSignedAt: null,
  managerSignedAt: null,
  vehicle: { id: 'vehicle-id', plateNumber: 'ABC123', brand: 'Toyota', model: 'Corolla' },
  contract: { id: 'contract-id', type: 'VTC_WEEKLY', dailyAmount: new Decimal(25000) },
  items: [],
  photos: [],
  fuelTransactions: [],
  linkedHandoverInspection: null,
  ...overrides,
});

const mockPrisma = {
  inspection: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  inspectionItem: {
    createMany: jest.fn(),
    create: jest.fn(),
  },
  vehicle: { findFirst: jest.fn() },
  contract: { findFirst: jest.fn() },
  charge: { create: jest.fn() },
};

const mockAudit = { log: jest.fn().mockResolvedValue(undefined) };
const mockNotifications = { send: jest.fn().mockResolvedValue(undefined) };

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('InspectionsService', () => {
  let service: InspectionsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InspectionsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<InspectionsService>(InspectionsService);
  });

  // ── create ──────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('doit créer une inspection et lancer l\'audit', async () => {
      const dto = {
        type: InspectionType.VEHICLE_DELIVERY,
        vehicleId: 'vehicle-id',
        contractId: 'contract-id',
        driverId: 'driver-id',
        managerId: 'manager-id',
        fuelLevelIn: FuelLevel.FULL,
        mileageIn: 100000,
      };
      const created = buildInspection();

      mockPrisma.vehicle.findFirst.mockResolvedValue({ id: 'vehicle-id', plateNumber: 'ABC123' });
      mockPrisma.inspection.create.mockResolvedValue(created);
      mockPrisma.inspection.findFirst.mockResolvedValue(created);

      const result = await service.create(dto as any, mockActor as any);

      expect(mockPrisma.inspection.create).toHaveBeenCalledTimes(1);
      expect(mockAudit.log).toHaveBeenCalledTimes(1);
      expect(result.id).toBe('insp-id');
    });

    it('doit lever NotFoundException si le véhicule n\'existe pas', async () => {
      mockPrisma.vehicle.findFirst.mockResolvedValue(null);
      await expect(
        service.create(
          { type: InspectionType.VEHICLE_DELIVERY, vehicleId: 'bad-id' } as any,
          mockActor as any,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── driverSign ──────────────────────────────────────────────────────────────

  describe('driverSign', () => {
    it('doit signer si le statut est PENDING_DRIVER', async () => {
      const insp = buildInspection({ status: InspectionStatus.PENDING_DRIVER });
      const signed = buildInspection({ status: InspectionStatus.DRIVER_SIGNED, driverSignedAt: new Date() });

      mockPrisma.inspection.findFirst.mockResolvedValue(insp);
      mockPrisma.inspection.update.mockResolvedValue(signed);

      const result = await service.driverSign('insp-id', {}, mockActor as any);
      expect(result.status).toBe(InspectionStatus.DRIVER_SIGNED);
    });

    it('doit rejeter si le statut n\'est pas PENDING_DRIVER', async () => {
      const insp = buildInspection({ status: InspectionStatus.COMPLETED });
      mockPrisma.inspection.findFirst.mockResolvedValue(insp);

      await expect(service.driverSign('insp-id', {}, mockActor as any))
        .rejects.toThrow(BadRequestException);
    });
  });

  // ── managerSign — R-09 ──────────────────────────────────────────────────────

  describe('managerSign / R-09', () => {
    it('doit compléter l\'inspection et NE PAS créer de charge si carburant FULL', async () => {
      const insp = buildInspection({
        type: InspectionType.VEHICLE_RETURN,
        status: InspectionStatus.DRIVER_SIGNED,
        fuelLevelOut: FuelLevel.FULL,
      });
      const completed = buildInspection({
        status: InspectionStatus.COMPLETED,
        fuelLevelOut: FuelLevel.FULL,
      });

      mockPrisma.inspection.findFirst.mockResolvedValue(insp);
      mockPrisma.inspection.update.mockResolvedValue(completed);

      await service.managerSign('insp-id', { fuelLevelOut: FuelLevel.FULL }, mockActor as any);

      expect(mockPrisma.charge.create).not.toHaveBeenCalled();
    });

    it('doit créer une charge automatique R-09 si carburant < FULL au retour', async () => {
      const insp = buildInspection({
        type: InspectionType.VEHICLE_RETURN,
        status: InspectionStatus.DRIVER_SIGNED,
      });
      const completed = buildInspection({
        status: InspectionStatus.COMPLETED,
        type: InspectionType.VEHICLE_RETURN,
        fuelLevelOut: FuelLevel.HALF,
        contractId: 'contract-id',
        driverId: 'driver-id',
      });

      mockPrisma.inspection.findFirst.mockResolvedValue(insp);
      mockPrisma.inspection.update.mockResolvedValue(completed);
      mockPrisma.contract.findFirst.mockResolvedValue({
        id: 'contract-id',
        dailyAmount: new Decimal(25000),
      });
      mockPrisma.charge.create.mockResolvedValue({ id: 'charge-id' });

      await service.managerSign('insp-id', { fuelLevelOut: FuelLevel.HALF }, mockActor as any);

      // Attendre le fire-and-forget
      await new Promise((r) => setTimeout(r, 50));

      expect(mockPrisma.charge.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.charge.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            vehicleId: 'vehicle-id',
            contractId: 'contract-id',
            status: 'PENDING_VALIDATION',
          }),
        }),
      );
    });
  });

  // ── generateComparison ──────────────────────────────────────────────────────

  describe('generateComparison', () => {
    it('doit calculer le delta carburant et les items dégradés', async () => {
      const handover = buildInspection({
        id: 'handover-id',
        type: InspectionType.VEHICLE_DELIVERY,
        fuelLevelIn: FuelLevel.FULL,
        mileageIn: 100000,
        items: [
          { itemKey: 'exterior', label: 'Extérieur', status: 'OK' },
          { itemKey: 'windows', label: 'Vitres', status: 'OK' },
        ],
      });

      const returnInsp = buildInspection({
        id: 'return-id',
        type: InspectionType.VEHICLE_RETURN,
        status: InspectionStatus.COMPLETED,
        fuelLevelOut: FuelLevel.HALF,
        mileageOut: 102500,
        linkedHandoverInspection: {
          ...handover,
          items: handover.items,
        },
        items: [
          { itemKey: 'exterior', label: 'Extérieur', status: 'DAMAGED', comment: 'Rayure capot' },
          { itemKey: 'windows', label: 'Vitres', status: 'OK' },
        ],
      });

      mockPrisma.inspection.findFirst.mockResolvedValue(returnInsp);

      const result = await service.generateComparison('return-id');

      expect(result.fuel.discrepancy).toBe(true);
      expect(result.fuel.delta).toBe(-2); // HALF(2) - FULL(4) = -2
      expect(result.mileage.delta).toBe(2500);
      expect(result.items.damaged).toHaveLength(1);
      expect(result.items.damaged[0].itemKey).toBe('exterior');
      expect(result.summary.hasIssues).toBe(true);
    });

    it('doit lever BadRequestException si l\'inspection n\'est pas liée à une remise', async () => {
      const insp = buildInspection({ linkedHandoverInspection: null });
      mockPrisma.inspection.findFirst.mockResolvedValue(insp);

      await expect(service.generateComparison('insp-id')).rejects.toThrow(BadRequestException);
    });
  });
});
