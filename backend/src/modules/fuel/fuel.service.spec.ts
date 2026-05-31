import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { FuelLevel, FuelTransactionType } from '@prisma/client';
import { FuelService } from './fuel.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';

const mockPrisma = {
  vehicle: { findFirst: jest.fn() },
  contract: { findFirst: jest.fn() },
  fuelTransaction: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  charge: { create: jest.fn() },
};

const mockAudit = { log: jest.fn().mockResolvedValue(undefined) };
const mockNotifications = { send: jest.fn().mockResolvedValue(undefined) };
const mockActor = { id: 'actor-1' } as any;

describe('FuelService', () => {
  let service: FuelService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FuelService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();
    service = module.get<FuelService>(FuelService);
  });

  // ─── record — R-08 ──────────────────────────────────────────────────────────

  describe('record', () => {
    it('lève NotFoundException si véhicule introuvable', async () => {
      mockPrisma.vehicle.findFirst.mockResolvedValue(null);
      await expect(
        service.record(
          { vehicleId: 'v-x', type: FuelTransactionType.REFILL, fuelLevel: FuelLevel.HALF, recordedAt: '2026-05-01T00:00:00Z' } as any,
          mockActor,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('R-08 : lève BadRequestException si INITIAL_FULL_TANK avec fuelLevel != FULL', async () => {
      mockPrisma.vehicle.findFirst.mockResolvedValue({ id: 'v-1' });
      await expect(
        service.record(
          {
            vehicleId: 'v-1',
            type: FuelTransactionType.INITIAL_FULL_TANK,
            fuelLevel: FuelLevel.HALF,
            recordedAt: '2026-05-01T00:00:00Z',
          } as any,
          mockActor,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('R-08 : accepte INITIAL_FULL_TANK avec fuelLevel = FULL', async () => {
      mockPrisma.vehicle.findFirst.mockResolvedValue({ id: 'v-1' });
      const tx = {
        id: 'tx-1',
        vehicleId: 'v-1',
        type: FuelTransactionType.INITIAL_FULL_TANK,
        fuelLevel: FuelLevel.FULL,
      };
      mockPrisma.fuelTransaction.create.mockResolvedValue(tx);

      const result = await service.record(
        {
          vehicleId: 'v-1',
          type: FuelTransactionType.INITIAL_FULL_TANK,
          fuelLevel: FuelLevel.FULL,
          recordedAt: '2026-05-01T00:00:00Z',
        } as any,
        mockActor,
      );

      expect(result).toEqual(tx);
      expect(mockAudit.log).toHaveBeenCalled();
    });

    it('R-09 : RETURN_CHECK niveau < FULL avec flag → crée charge automatique', async () => {
      mockPrisma.vehicle.findFirst.mockResolvedValue({ id: 'v-1' });
      const tx = {
        id: 'tx-1',
        vehicleId: 'v-1',
        type: FuelTransactionType.RETURN_CHECK,
        fuelLevel: FuelLevel.QUARTER,
        contractId: 'c-1',
        driverId: 'd-1',
      };
      mockPrisma.fuelTransaction.create.mockResolvedValue(tx);
      mockPrisma.contract.findFirst.mockResolvedValue({
        id: 'c-1',
        dailyAmount: 300,
      });
      mockPrisma.charge.create.mockResolvedValue({ id: 'charge-1' });
      mockPrisma.fuelTransaction.update.mockResolvedValue({});

      await service.record(
        {
          vehicleId: 'v-1',
          contractId: 'c-1',
          type: FuelTransactionType.RETURN_CHECK,
          fuelLevel: FuelLevel.QUARTER,
          autoCreateDiscrepancyCharge: true,
          recordedAt: '2026-05-01T00:00:00Z',
        } as any,
        mockActor,
      );

      // Charge doit être créée après la transaction
      await new Promise((r) => setImmediate(r));
      expect(mockPrisma.charge.create).toHaveBeenCalled();
    });

    it('R-09 : RETURN_CHECK sans flag → pas de charge auto', async () => {
      mockPrisma.vehicle.findFirst.mockResolvedValue({ id: 'v-1' });
      const tx = {
        id: 'tx-1',
        vehicleId: 'v-1',
        type: FuelTransactionType.RETURN_CHECK,
        fuelLevel: FuelLevel.QUARTER,
        contractId: 'c-1',
      };
      mockPrisma.fuelTransaction.create.mockResolvedValue(tx);

      await service.record(
        {
          vehicleId: 'v-1',
          type: FuelTransactionType.RETURN_CHECK,
          fuelLevel: FuelLevel.QUARTER,
          autoCreateDiscrepancyCharge: false,
          recordedAt: '2026-05-01T00:00:00Z',
        } as any,
        mockActor,
      );

      await new Promise((r) => setImmediate(r));
      expect(mockPrisma.charge.create).not.toHaveBeenCalled();
    });
  });

  // ─── validate ───────────────────────────────────────────────────────────────

  describe('validate', () => {
    it('lève NotFoundException si transaction introuvable', async () => {
      mockPrisma.fuelTransaction.findFirst.mockResolvedValue(null);
      await expect(service.validate('tx-x', {}, mockActor)).rejects.toThrow(NotFoundException);
    });

    it('lève BadRequestException si déjà validée', async () => {
      mockPrisma.fuelTransaction.findFirst.mockResolvedValue({
        id: 'tx-1',
        validatedAt: new Date(),
      });
      await expect(service.validate('tx-1', {}, mockActor)).rejects.toThrow(BadRequestException);
    });

    it('valide la transaction avec correction de niveau possible', async () => {
      const tx = { id: 'tx-1', validatedAt: null, fuelLevel: FuelLevel.HALF, notes: null, type: FuelTransactionType.REFILL };
      mockPrisma.fuelTransaction.findFirst.mockResolvedValue(tx);
      const updated = { ...tx, validatedAt: new Date(), fuelLevel: FuelLevel.THREE_QUARTERS };
      mockPrisma.fuelTransaction.update.mockResolvedValue(updated);

      const result = await service.validate(
        'tx-1',
        { correctedFuelLevel: FuelLevel.THREE_QUARTERS },
        mockActor,
      );

      expect(mockPrisma.fuelTransaction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            validatedById: mockActor.id,
            fuelLevel: FuelLevel.THREE_QUARTERS,
          }),
        }),
      );
      expect(result).toEqual(updated);
    });
  });

  // ─── getVehicleFuelHistory ───────────────────────────────────────────────────

  describe('getVehicleFuelHistory', () => {
    it('calcule le delta carburant entre remise et retour', async () => {
      const transactions = [
        { type: FuelTransactionType.RETURN_CHECK, fuelLevel: FuelLevel.HALF },       // 2
        { type: FuelTransactionType.INITIAL_FULL_TANK, fuelLevel: FuelLevel.FULL },   // 4
      ];
      mockPrisma.fuelTransaction.findMany.mockResolvedValue(transactions);

      const result = await service.getVehicleFuelHistory('v-1');

      expect(result.summary.lastHandoverLevel).toBe(FuelLevel.FULL);
      expect(result.summary.lastReturnLevel).toBe(FuelLevel.HALF);
      expect(result.summary.delta).toBe(-2); // HALF(2) - FULL(4)
      expect(result.summary.hasDiscrepancy).toBe(true);
    });

    it('delta null si aucun INITIAL_FULL_TANK ou RETURN_CHECK', async () => {
      mockPrisma.fuelTransaction.findMany.mockResolvedValue([
        { type: FuelTransactionType.REFILL, fuelLevel: FuelLevel.FULL },
      ]);

      const result = await service.getVehicleFuelHistory('v-1');

      expect(result.summary.delta).toBeNull();
      expect(result.summary.hasDiscrepancy).toBe(false);
    });

    it('hasDiscrepancy false si retour FULL', async () => {
      const transactions = [
        { type: FuelTransactionType.RETURN_CHECK, fuelLevel: FuelLevel.FULL },
        { type: FuelTransactionType.INITIAL_FULL_TANK, fuelLevel: FuelLevel.FULL },
      ];
      mockPrisma.fuelTransaction.findMany.mockResolvedValue(transactions);

      const result = await service.getVehicleFuelHistory('v-1');

      expect(result.summary.delta).toBe(0);
      expect(result.summary.hasDiscrepancy).toBe(false);
    });
  });
});
