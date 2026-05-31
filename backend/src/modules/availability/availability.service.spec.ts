import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { VehicleAvailabilityEventType } from '@prisma/client';
import { AvailabilityService } from './availability.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

const mockPrisma = {
  vehicleAvailabilityEvent: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
};

const mockAudit = { log: jest.fn().mockResolvedValue(undefined) };

const mockActor = { id: 'actor-1' } as any;

describe('AvailabilityService', () => {
  let service: AvailabilityService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvailabilityService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();
    service = module.get<AvailabilityService>(AvailabilityService);
  });

  // ─── recordEvent ────────────────────────────────────────────────────────────

  describe('recordEvent', () => {
    it('crée un événement de disponibilité et fire audit', async () => {
      const dto = {
        vehicleId: 'v-1',
        type: VehicleAvailabilityEventType.IMMOBILIZED,
        startDate: '2026-05-01T00:00:00Z',
      } as any;
      const created = { id: 'ae-1', vehicleId: 'v-1', type: VehicleAvailabilityEventType.IMMOBILIZED };
      mockPrisma.vehicleAvailabilityEvent.create.mockResolvedValue(created);

      const result = await service.recordEvent(dto, mockActor);

      expect(mockPrisma.vehicleAvailabilityEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            vehicleId: 'v-1',
            type: VehicleAvailabilityEventType.IMMOBILIZED,
          }),
        }),
      );
      expect(result).toEqual(created);
      expect(mockAudit.log).toHaveBeenCalled();
    });
  });

  // ─── resolveEvent ────────────────────────────────────────────────────────────

  describe('resolveEvent', () => {
    it('lève NotFoundException si l\'événement n\'existe pas', async () => {
      mockPrisma.vehicleAvailabilityEvent.findFirst.mockResolvedValue(null);
      await expect(service.resolveEvent('ae-x', {}, mockActor)).rejects.toThrow(NotFoundException);
    });

    it('lève BadRequestException si déjà résolu', async () => {
      mockPrisma.vehicleAvailabilityEvent.findFirst.mockResolvedValue({
        id: 'ae-1',
        resolvedAt: new Date(),
      });
      await expect(service.resolveEvent('ae-1', {}, mockActor)).rejects.toThrow(BadRequestException);
    });

    it('résout l\'événement et fire audit', async () => {
      const event = { id: 'ae-1', resolvedAt: null };
      mockPrisma.vehicleAvailabilityEvent.findFirst.mockResolvedValue(event);
      const updated = { ...event, resolvedAt: new Date() };
      mockPrisma.vehicleAvailabilityEvent.update.mockResolvedValue(updated);

      const result = await service.resolveEvent('ae-1', { notes: 'ok' }, mockActor);

      expect(mockPrisma.vehicleAvailabilityEvent.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ae-1' },
          data: expect.objectContaining({ resolvedById: mockActor.id }),
        }),
      );
      expect(result).toEqual(updated);
      expect(mockAudit.log).toHaveBeenCalled();
    });
  });

  // ─── resolveActiveEventsForSource ────────────────────────────────────────────

  describe('resolveActiveEventsForSource', () => {
    it('résout tous les événements ouverts pour la source donnée', async () => {
      const open = [
        { id: 'ae-1', resolvedAt: null },
        { id: 'ae-2', resolvedAt: null },
      ];
      mockPrisma.vehicleAvailabilityEvent.findMany.mockResolvedValue(open);
      mockPrisma.vehicleAvailabilityEvent.update.mockResolvedValue({});

      await service.resolveActiveEventsForSource('IMMOBILIZATION', 'immo-1', mockActor);

      expect(mockPrisma.vehicleAvailabilityEvent.update).toHaveBeenCalledTimes(2);
    });

    it('ne fait rien si aucun événement ouvert', async () => {
      mockPrisma.vehicleAvailabilityEvent.findMany.mockResolvedValue([]);
      await service.resolveActiveEventsForSource('IMMOBILIZATION', 'immo-1', mockActor);
      expect(mockPrisma.vehicleAvailabilityEvent.update).not.toHaveBeenCalled();
    });
  });

  // ─── findActiveForVehicle ──────────────────────────────────────────────────

  describe('findActiveForVehicle', () => {
    it('retourne null si aucun événement actif', async () => {
      mockPrisma.vehicleAvailabilityEvent.findFirst.mockResolvedValue(null);
      const result = await service.findActiveForVehicle('v-1');
      expect(result).toBeNull();
    });

    it('retourne l\'événement actif', async () => {
      const event = { id: 'ae-1', vehicleId: 'v-1', resolvedAt: null };
      mockPrisma.vehicleAvailabilityEvent.findFirst.mockResolvedValue(event);
      const result = await service.findActiveForVehicle('v-1');
      expect(result).toEqual(event);
    });
  });
});
