import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MaintenanceStatus, MaintenanceType, MileageSource, UserRole, UserStatus } from '@prisma/client';
import { Decimal } from 'decimal.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockActor = {
  id: 'manager-id',
  role: UserRole.MANAGER,
  status: UserStatus.ACTIVE,
};

const buildRecord = (overrides: any = {}) => ({
  id: 'maint-id',
  type: MaintenanceType.OIL_CHANGE,
  status: MaintenanceStatus.SCHEDULED,
  vehicleId: 'vehicle-id',
  mileageAtService: null,
  scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  completedAt: null,
  garage: null,
  cost: null,
  description: null,
  notes: null,
  createdById: 'manager-id',
  vehicle: { id: 'vehicle-id', plateNumber: 'ABC123', brand: 'Toyota', model: 'Corolla', currentMileage: 100000 },
  ...overrides,
});

const buildMileageRecord = (overrides: any = {}) => ({
  id: 'mileage-id',
  vehicleId: 'vehicle-id',
  driverId: 'driver-id',
  mileage: 102000,
  source: MileageSource.DRIVER,
  isValidated: false,
  validatedById: null,
  validatedAt: null,
  recordedAt: new Date(),
  ...overrides,
});

const mockPrisma = {
  maintenanceRecord: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  mileageRecord: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  vehicle: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
};

const mockAudit = { log: jest.fn().mockResolvedValue(undefined) };
const mockNotifications = { send: jest.fn().mockResolvedValue(undefined) };

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('MaintenanceService', () => {
  let service: MaintenanceService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaintenanceService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<MaintenanceService>(MaintenanceService);
  });

  // ── create ──────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('doit créer une maintenance planifiée et notifier le manager du véhicule', async () => {
      const vehicle = {
        id: 'vehicle-id',
        plateNumber: 'ABC123',
        currentManagerId: 'mgr-id',
        currentMileage: 100000,
      };
      const record = buildRecord();

      mockPrisma.vehicle.findFirst.mockResolvedValue(vehicle);
      mockPrisma.maintenanceRecord.create.mockResolvedValue(record);

      const result = await service.create(
        {
          type: MaintenanceType.OIL_CHANGE,
          vehicleId: 'vehicle-id',
          scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
        mockActor as any,
      );

      expect(result.status).toBe(MaintenanceStatus.SCHEDULED);
      expect(mockPrisma.maintenanceRecord.create).toHaveBeenCalledTimes(1);
      expect(mockNotifications.send).toHaveBeenCalledTimes(1);
    });

    it('doit lever NotFoundException si le véhicule est introuvable', async () => {
      mockPrisma.vehicle.findFirst.mockResolvedValue(null);
      await expect(
        service.create({ type: MaintenanceType.REPAIR, vehicleId: 'bad-id' } as any, mockActor as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── complete ─────────────────────────────────────────────────────────────────

  describe('complete', () => {
    it('doit compléter la maintenance et mettre à jour le kilométrage du véhicule', async () => {
      const record = buildRecord({ status: MaintenanceStatus.IN_PROGRESS });
      const completed = buildRecord({
        status: MaintenanceStatus.COMPLETED,
        completedAt: new Date(),
        mileageAtService: 102000,
      });

      mockPrisma.maintenanceRecord.findFirst.mockResolvedValue(record);
      mockPrisma.maintenanceRecord.update.mockResolvedValue(completed);
      mockPrisma.vehicle.findFirst.mockResolvedValue({ currentMileage: 100000 });
      mockPrisma.vehicle.update.mockResolvedValue({});

      await service.complete(
        'maint-id',
        { mileageAtService: 102000, cost: 15000 },
        mockActor as any,
      );

      expect(mockPrisma.maintenanceRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: MaintenanceStatus.COMPLETED }),
        }),
      );
      expect(mockPrisma.vehicle.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { currentMileage: 102000 },
        }),
      );
    });

    it('doit rejeter si la maintenance est déjà complétée', async () => {
      mockPrisma.maintenanceRecord.findFirst.mockResolvedValue(
        buildRecord({ status: MaintenanceStatus.COMPLETED }),
      );
      await expect(
        service.complete('maint-id', {}, mockActor as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── validateMileageRecord ───────────────────────────────────────────────────

  describe('validateMileageRecord', () => {
    it('doit valider un relevé et mettre à jour le kilométrage du véhicule', async () => {
      const record = buildMileageRecord();
      mockPrisma.mileageRecord.findFirst.mockResolvedValue(record);
      mockPrisma.mileageRecord.update.mockResolvedValue({ ...record, isValidated: true });
      mockPrisma.vehicle.findFirst.mockResolvedValue({ currentMileage: 100000 });
      mockPrisma.vehicle.update.mockResolvedValue({});

      await service.validateMileageRecord('mileage-id', mockActor as any);

      expect(mockPrisma.mileageRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isValidated: true }),
        }),
      );
      expect(mockPrisma.vehicle.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { currentMileage: 102000 } }),
      );
    });

    it('doit rejeter si le relevé est déjà validé', async () => {
      const record = buildMileageRecord({ isValidated: true });
      mockPrisma.mileageRecord.findFirst.mockResolvedValue(record);

      await expect(
        service.validateMileageRecord('mileage-id', mockActor as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('ne doit pas régresser le kilométrage du véhicule', async () => {
      const record = buildMileageRecord({ mileage: 99000 }); // inférieur au kilométrage actuel
      mockPrisma.mileageRecord.findFirst.mockResolvedValue(record);
      mockPrisma.mileageRecord.update.mockResolvedValue({ ...record, isValidated: true });
      mockPrisma.vehicle.findFirst.mockResolvedValue({ currentMileage: 100000 });

      await service.validateMileageRecord('mileage-id', mockActor as any);

      // Le véhicule ne doit pas être mis à jour avec un kilométrage inférieur
      expect(mockPrisma.vehicle.update).not.toHaveBeenCalled();
    });
  });

  // ── createMileageRecord — auto-validation ───────────────────────────────────

  describe('createMileageRecord', () => {
    it('doit auto-valider les relevés de source MANAGER', async () => {
      const vehicle = { id: 'vehicle-id', plateNumber: 'ABC123', currentMileage: 100000 };
      const record = buildMileageRecord({ source: MileageSource.MANAGER, mileage: 103000 });

      mockPrisma.vehicle.findFirst.mockResolvedValue(vehicle);
      mockPrisma.mileageRecord.create.mockResolvedValue(record);
      mockPrisma.mileageRecord.update.mockResolvedValue({ ...record, isValidated: true });
      mockPrisma.mileageRecord.findFirst.mockResolvedValue({ ...record, isValidated: true });

      await service.createMileageRecord(
        {
          vehicleId: 'vehicle-id',
          mileage: 103000,
          source: MileageSource.MANAGER,
          recordedAt: new Date().toISOString(),
        },
        mockActor as any,
      );

      expect(mockPrisma.mileageRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isValidated: true }),
        }),
      );
    });

    it('doit rejeter si le kilométrage est inférieur au kilométrage actuel du véhicule', async () => {
      mockPrisma.vehicle.findFirst.mockResolvedValue({ id: 'vehicle-id', currentMileage: 105000 });

      await expect(
        service.createMileageRecord(
          {
            vehicleId: 'vehicle-id',
            mileage: 102000,
            recordedAt: new Date().toISOString(),
          },
          mockActor as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
