import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ImmobilizationStatus, ImmobilizationResponsible } from '@prisma/client';
import { ImmobilizationsService } from './immobilizations.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AvailabilityService } from '../availability/availability.service';

const mockPrisma = {
  vehicle: { findFirst: jest.fn() },
  immobilization: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
};

const mockAudit = { log: jest.fn().mockResolvedValue(undefined) };
const mockNotifications = { send: jest.fn().mockResolvedValue(undefined) };
const mockAvailability = {
  recordEvent: jest.fn().mockResolvedValue({ id: 'ae-1' }),
  resolveActiveEventsForSource: jest.fn().mockResolvedValue(undefined),
};

const mockActor = { id: 'actor-1' } as any;

describe('ImmobilizationsService', () => {
  let service: ImmobilizationsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImmobilizationsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: AvailabilityService, useValue: mockAvailability },
      ],
    }).compile();
    service = module.get<ImmobilizationsService>(ImmobilizationsService);
  });

  // ─── start ──────────────────────────────────────────────────────────────────

  describe('start', () => {
    const dto = {
      vehicleId: 'v-1',
      responsible: ImmobilizationResponsible.FLEET,
      reason: 'Panne moteur',
      startDate: '2026-05-01T00:00:00Z',
    } as any;

    it('lève NotFoundException si véhicule introuvable', async () => {
      mockPrisma.vehicle.findFirst.mockResolvedValue(null);
      await expect(service.start(dto, mockActor)).rejects.toThrow(NotFoundException);
    });

    it('lève BadRequestException si véhicule déjà immobilisé', async () => {
      mockPrisma.vehicle.findFirst.mockResolvedValue({ id: 'v-1' });
      mockPrisma.immobilization.findFirst.mockResolvedValue({
        id: 'immo-existing',
        status: ImmobilizationStatus.ACTIVE,
      });
      await expect(service.start(dto, mockActor)).rejects.toThrow(BadRequestException);
    });

    it('crée une immobilisation et enregistre un événement de disponibilité (D-15)', async () => {
      mockPrisma.vehicle.findFirst.mockResolvedValue({ id: 'v-1', managerId: 'mgr-1' });
      mockPrisma.immobilization.findFirst.mockResolvedValue(null);
      const created = {
        id: 'immo-1',
        vehicleId: 'v-1',
        status: ImmobilizationStatus.ACTIVE,
        vehicle: { id: 'v-1', plateNumber: 'ABC-123' },
      };
      mockPrisma.immobilization.create.mockResolvedValue(created);

      const result = await service.start(dto, mockActor);

      expect(mockPrisma.immobilization.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            vehicleId: 'v-1',
            status: ImmobilizationStatus.ACTIVE,
          }),
        }),
      );
      // D-15 : appel AvailabilityService
      expect(mockAvailability.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({ vehicleId: 'v-1' }),
        mockActor,
      );
      expect(result).toEqual(created);
    });
  });

  // ─── release ─────────────────────────────────────────────────────────────────

  describe('release', () => {
    it('lève NotFoundException si immobilisation introuvable', async () => {
      mockPrisma.immobilization.findFirst.mockResolvedValue(null);
      await expect(service.release('immo-x', {}, mockActor)).rejects.toThrow(NotFoundException);
    });

    it('lève BadRequestException si déjà terminée', async () => {
      mockPrisma.immobilization.findFirst.mockResolvedValue({
        id: 'immo-1',
        status: ImmobilizationStatus.ENDED,
      });
      await expect(service.release('immo-1', {}, mockActor)).rejects.toThrow(BadRequestException);
    });

    it('lève BadRequestException si annulée', async () => {
      mockPrisma.immobilization.findFirst.mockResolvedValue({
        id: 'immo-1',
        status: ImmobilizationStatus.CANCELLED,
      });
      await expect(service.release('immo-1', {}, mockActor)).rejects.toThrow(BadRequestException);
    });

    it('termine l\'immobilisation et résout l\'événement de disponibilité', async () => {
      const immo = {
        id: 'immo-1',
        vehicleId: 'v-1',
        status: ImmobilizationStatus.ACTIVE,
        vehicle: { managerId: 'mgr-1' },
      };
      mockPrisma.immobilization.findFirst.mockResolvedValue(immo);
      const updated = { ...immo, status: ImmobilizationStatus.ENDED };
      mockPrisma.immobilization.update.mockResolvedValue(updated);

      const result = await service.release('immo-1', {}, mockActor);

      expect(mockPrisma.immobilization.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: ImmobilizationStatus.ENDED }),
        }),
      );
      expect(mockAvailability.resolveActiveEventsForSource).toHaveBeenCalledWith(
        'IMMOBILIZATION',
        'immo-1',
        mockActor,
      );
      expect(result).toEqual(updated);
    });
  });
});
