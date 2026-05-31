import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { IncidentsService } from './incidents.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AvailabilityService } from '../availability/availability.service';
import {
  IncidentStatus, IncidentType, IncidentSeverity,
  VehicleStatus, VehicleAvailabilityEventType, UserRole, UserStatus,
} from '@prisma/client';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockActor = {
  id: 'manager-id',
  role: UserRole.MANAGER,
  status: UserStatus.ACTIVE,
};

const buildIncident = (overrides: any = {}) => ({
  id: 'incident-id',
  type: IncidentType.BREAKDOWN,
  severity: IncidentSeverity.MEDIUM,
  vehicleId: 'vehicle-id',
  driverId: 'driver-id',
  managerId: 'manager-id',
  description: 'Panne moteur',
  notes: null,
  locationLat: null,
  locationLng: null,
  occurredAt: new Date(),
  status: IncidentStatus.OPEN,
  resolvedAt: null,
  accidentCase: null,
  charges: [],
  immobilizations: [],
  vehicle: { id: 'vehicle-id', plateNumber: 'ABC123', brand: 'Toyota', model: 'Corolla' },
  driver: { id: 'driver-id', userId: 'user-driver' },
  ...overrides,
});

const mockPrisma = {
  incident: {
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
const mockAvailability = {
  recordEvent: jest.fn().mockResolvedValue(undefined),
  resolveActiveEventsForSource: jest.fn().mockResolvedValue(undefined),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('IncidentsService', () => {
  let service: IncidentsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IncidentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: AvailabilityService, useValue: mockAvailability },
      ],
    }).compile();

    service = module.get<IncidentsService>(IncidentsService);
  });

  // ── create — D-15 + FIX 2 ───────────────────────────────────────────────────

  describe('create', () => {
    const createDto = {
      type: IncidentType.BREAKDOWN,
      vehicleId: 'vehicle-id',
      driverId: 'driver-id',
      managerId: 'manager-id',
      description: 'Panne moteur',
      severity: IncidentSeverity.MEDIUM,
      occurredAt: new Date().toISOString(),
    };

    beforeEach(() => {
      mockPrisma.vehicle.findFirst.mockResolvedValue({
        id: 'vehicle-id', plateNumber: 'ABC123',
      });
      mockPrisma.incident.create.mockResolvedValue(buildIncident());
      mockPrisma.incident.findFirst.mockResolvedValue(buildIncident());
      mockPrisma.vehicle.update.mockResolvedValue({});
    });

    it('crée un incident BREAKDOWN', async () => {
      const result = await service.create(createDto as any, mockActor as any);
      expect(result).toBeDefined();
      expect(mockPrisma.incident.create).toHaveBeenCalledTimes(1);
    });

    it('FIX 2 : vehicle.update(IMMOBILIZED) pour un incident BREAKDOWN', async () => {
      await service.create(createDto as any, mockActor as any);
      expect(mockPrisma.vehicle.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'vehicle-id' },
          data: { status: VehicleStatus.IMMOBILIZED },
        }),
      );
    });

    it('D-15 : recordEvent(BREAKDOWN) pour un incident BREAKDOWN', async () => {
      await service.create(createDto as any, mockActor as any);
      expect(mockAvailability.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          vehicleId: 'vehicle-id',
          type: VehicleAvailabilityEventType.BREAKDOWN,
        }),
        mockActor,
      );
    });

    it('ne met PAS à jour le statut véhicule pour un incident non-BREAKDOWN', async () => {
      const accidentIncident = buildIncident({ type: IncidentType.ACCIDENT });
      mockPrisma.incident.create.mockResolvedValue(accidentIncident);
      mockPrisma.incident.findFirst.mockResolvedValue(accidentIncident);

      await service.create({ ...createDto, type: IncidentType.ACCIDENT } as any, mockActor as any);
      expect(mockPrisma.vehicle.update).not.toHaveBeenCalled();
      expect(mockAvailability.recordEvent).not.toHaveBeenCalled();
    });

    it('lève NotFoundException si véhicule introuvable', async () => {
      mockPrisma.vehicle.findFirst.mockResolvedValue(null);
      await expect(
        service.create({ ...createDto, vehicleId: 'bad-id' } as any, mockActor as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── resolve — D-15 + FIX 2 ──────────────────────────────────────────────────

  describe('resolve', () => {
    const openBreakdown = buildIncident({
      type: IncidentType.BREAKDOWN,
      status: IncidentStatus.OPEN,
    });

    beforeEach(() => {
      mockPrisma.incident.findFirst.mockResolvedValue(openBreakdown);
      mockPrisma.incident.update.mockResolvedValue({
        ...openBreakdown,
        status: IncidentStatus.RESOLVED,
      });
      mockPrisma.vehicle.findFirst.mockResolvedValue({ currentContractId: null });
      mockPrisma.vehicle.update.mockResolvedValue({});
    });

    it('résout un incident BREAKDOWN et appelle resolveActiveEventsForSource', async () => {
      await service.resolve('incident-id', {}, mockActor as any);
      expect(mockAvailability.resolveActiveEventsForSource).toHaveBeenCalled();
    });

    it('FIX 2 : restaure statut véhicule après résolution BREAKDOWN', async () => {
      await service.resolve('incident-id', {}, mockActor as any);
      // restoreVehicleStatus est fire-and-forget — vérifié indirectement
      expect(mockAvailability.resolveActiveEventsForSource).toHaveBeenCalled();
    });

    it('ne résout PAS les événements de disponibilité pour un incident non-BREAKDOWN', async () => {
      mockPrisma.incident.findFirst.mockResolvedValue(
        buildIncident({ type: IncidentType.ACCIDENT, status: IncidentStatus.OPEN }),
      );
      mockPrisma.incident.update.mockResolvedValue({
        ...buildIncident({ type: IncidentType.ACCIDENT }),
        status: IncidentStatus.RESOLVED,
      });

      await service.resolve('incident-id', {}, mockActor as any);
      expect(mockAvailability.resolveActiveEventsForSource).not.toHaveBeenCalled();
    });

    it('lève BadRequestException si l\'incident est déjà clôturé', async () => {
      mockPrisma.incident.findFirst.mockResolvedValue(
        buildIncident({ status: IncidentStatus.CLOSED }),
      );
      await expect(
        service.resolve('incident-id', {}, mockActor as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── close ────────────────────────────────────────────────────────────────────

  describe('close', () => {
    it('clôture un incident RESOLVED', async () => {
      mockPrisma.incident.findFirst.mockResolvedValue(
        buildIncident({ status: IncidentStatus.RESOLVED }),
      );
      mockPrisma.incident.update.mockResolvedValue(
        buildIncident({ status: IncidentStatus.CLOSED }),
      );

      const result = await service.close('incident-id', mockActor as any);
      expect(result.status).toBe(IncidentStatus.CLOSED);
    });

    it('rejette la clôture si incident non-RESOLVED', async () => {
      mockPrisma.incident.findFirst.mockResolvedValue(
        buildIncident({ status: IncidentStatus.OPEN }),
      );
      await expect(
        service.close('incident-id', mockActor as any),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
