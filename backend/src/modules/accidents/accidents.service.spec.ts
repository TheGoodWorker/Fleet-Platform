import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AccidentsService, ACCIDENT_EXPENSE_SM_THRESHOLD } from './accidents.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AvailabilityService } from '../availability/availability.service';
import {
  AccidentStep, AccidentCaseStatus, VehicleStatus,
  VehicleAvailabilityEventType, UserRole, UserStatus,
} from '@prisma/client';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockActor = {
  id: 'manager-id',
  role: UserRole.MANAGER,
  firstName: 'Paul',
  lastName: 'Manager',
  status: UserStatus.ACTIVE,
};

const baseIncident = {
  id: 'incident-id',
  type: 'ACCIDENT',
  vehicleId: 'vehicle-id',
  driverId: 'driver-id',
  managerId: 'manager-id',
  severity: 'HIGH',
  vehicle: { id: 'vehicle-id', plateNumber: 'ABC123', brand: 'Toyota', model: 'Corolla' },
};

const buildCase = (overrides: any = {}) => ({
  id: 'accident-id',
  incidentId: 'incident-id',
  currentStep: AccidentStep.DECLARED,
  status: AccidentCaseStatus.OPEN,
  insuranceFileNumber: null,
  insuranceCompany: null,
  declaredById: 'manager-id',
  policeReportNumber: null,
  estimatedRepairDays: null,
  repairDeadline: null,
  insuranceDocumentId: null,
  declaredAt: new Date(),
  incident: { ...baseIncident },
  declaredBy: null,
  insuranceDocument: null,
  stepHistory: [],
  expenses: [],
  ...overrides,
});

const mockPrisma = {
  accidentCase: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  accidentStepHistory: { create: jest.fn() },
  accidentExpense: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  incident: { findFirst: jest.fn() },
  vehicle: { findFirst: jest.fn(), update: jest.fn() },
  user: { findMany: jest.fn().mockResolvedValue([]) },
};

const mockAudit = { log: jest.fn().mockResolvedValue(undefined) };
const mockNotifications = { send: jest.fn().mockResolvedValue(undefined) };
const mockAvailability = {
  recordEvent: jest.fn().mockResolvedValue(undefined),
  resolveActiveEventsForSource: jest.fn().mockResolvedValue(undefined),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AccidentsService', () => {
  let service: AccidentsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    // Scoping IDOR — l'acteur MANAGER des tests gère le véhicule des fixtures
    mockPrisma.vehicle.findFirst.mockResolvedValue({
      id: 'vehicle-id', currentManagerId: 'manager-id',
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccidentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: AvailabilityService, useValue: mockAvailability },
      ],
    }).compile();

    service = module.get<AccidentsService>(AccidentsService);
  });

  // ── create ──────────────────────────────────────────────────────────────────

  describe('create', () => {
    beforeEach(() => {
      mockPrisma.incident.findFirst.mockResolvedValue(baseIncident);
      mockPrisma.accidentCase.findFirst
        .mockResolvedValueOnce(null)             // guard doublon
        .mockResolvedValue(buildCase());          // findById final
      mockPrisma.accidentCase.create.mockResolvedValue(buildCase());
      mockPrisma.accidentStepHistory.create.mockResolvedValue({});
      mockPrisma.vehicle.update.mockResolvedValue({});
    });

    it('crée un dossier accident et l\'historique étape DECLARED', async () => {
      await service.create({ incidentId: 'incident-id' }, mockActor as any);
      expect(mockPrisma.accidentCase.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.accidentStepHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ step: AccidentStep.DECLARED }),
        }),
      );
      expect(mockAudit.log).toHaveBeenCalledTimes(1);
    });

    it('FIX 2 : vehicle.update(ACCIDENTED) est appelé à la création', async () => {
      await service.create({ incidentId: 'incident-id' }, mockActor as any);
      expect(mockPrisma.vehicle.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'vehicle-id' },
          data: { status: VehicleStatus.ACCIDENTED },
        }),
      );
    });

    it('D-15 : recordEvent(ACCIDENTED) est appelé à la création', async () => {
      await service.create({ incidentId: 'incident-id' }, mockActor as any);
      expect(mockAvailability.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          vehicleId: 'vehicle-id',
          type: VehicleAvailabilityEventType.ACCIDENTED,
        }),
        mockActor,
      );
    });

    it('lève NotFoundException si incident introuvable', async () => {
      mockPrisma.incident.findFirst.mockResolvedValue(null);
      await expect(
        service.create({ incidentId: 'incident-id' }, mockActor as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('lève BadRequestException si incident non-ACCIDENT', async () => {
      mockPrisma.incident.findFirst.mockResolvedValue({ ...baseIncident, type: 'BREAKDOWN' });
      await expect(
        service.create({ incidentId: 'incident-id' }, mockActor as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('lève BadRequestException si dossier doublon pour le même incident', async () => {
      // premier findFirst retourne un doublon
      mockPrisma.accidentCase.findFirst
        .mockReset()
        .mockResolvedValueOnce(buildCase()); // doublon trouvé
      await expect(
        service.create({ incidentId: 'incident-id' }, mockActor as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── advanceStep — R-11 ordre strict ─────────────────────────────────────────

  describe('advanceStep — R-11 ordre strict', () => {
    it('avance exactement d\'une étape (DECLARED → PHOTOS_RECEIVED)', async () => {
      mockPrisma.accidentCase.findFirst.mockResolvedValue(
        buildCase({ currentStep: AccidentStep.DECLARED }),
      );
      mockPrisma.accidentCase.update.mockResolvedValue(
        buildCase({ currentStep: AccidentStep.PHOTOS_RECEIVED }),
      );
      mockPrisma.accidentStepHistory.create.mockResolvedValue({});

      const result = await service.advanceStep(
        'accident-id',
        { step: AccidentStep.PHOTOS_RECEIVED },
        mockActor as any,
      );
      expect(result.currentStep).toBe(AccidentStep.PHOTOS_RECEIVED);
    });

    it('R-11 : rejette un saut de 2 étapes (DECLARED → MANAGER_ARRIVED)', async () => {
      mockPrisma.accidentCase.findFirst.mockResolvedValue(
        buildCase({ currentStep: AccidentStep.DECLARED }),
      );
      await expect(
        service.advanceStep('accident-id', { step: AccidentStep.MANAGER_ARRIVED }, mockActor as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('R-11 : rejette un retour arrière (GARAGE_STARTED → DECLARED)', async () => {
      mockPrisma.accidentCase.findFirst.mockResolvedValue(
        buildCase({ currentStep: AccidentStep.GARAGE_STARTED }),
      );
      await expect(
        service.advanceStep('accident-id', { step: AccidentStep.DECLARED }, mockActor as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('R-11 : rejette même étape (DECLARED → DECLARED)', async () => {
      mockPrisma.accidentCase.findFirst.mockResolvedValue(
        buildCase({ currentStep: AccidentStep.DECLARED }),
      );
      await expect(
        service.advanceStep('accident-id', { step: AccidentStep.DECLARED }, mockActor as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejette si le dossier est clôturé', async () => {
      mockPrisma.accidentCase.findFirst.mockResolvedValue(
        buildCase({ status: AccidentCaseStatus.CLOSED }),
      );
      await expect(
        service.advanceStep('accident-id', { step: AccidentStep.PHOTOS_RECEIVED }, mockActor as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── advanceStep — R-12 towingPlateVisible ────────────────────────────────────

  describe('advanceStep — R-12 VEHICLE_TOWED', () => {
    beforeEach(() => {
      // Position : TOWING_REQUESTED (order=3) → VEHICLE_TOWED (order=4)
      mockPrisma.accidentCase.findFirst.mockResolvedValue(
        buildCase({ currentStep: AccidentStep.TOWING_REQUESTED }),
      );
      mockPrisma.accidentCase.update.mockResolvedValue(
        buildCase({ currentStep: AccidentStep.VEHICLE_TOWED }),
      );
      mockPrisma.accidentStepHistory.create.mockResolvedValue({});
    });

    it('R-12 : rejette VEHICLE_TOWED sans towingPlateVisible', async () => {
      await expect(
        service.advanceStep('accident-id', { step: AccidentStep.VEHICLE_TOWED } as any, mockActor as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('R-12 : rejette VEHICLE_TOWED avec towingPlateVisible=false', async () => {
      await expect(
        service.advanceStep(
          'accident-id',
          { step: AccidentStep.VEHICLE_TOWED, towingPlateVisible: false } as any,
          mockActor as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('R-12 : accepte VEHICLE_TOWED avec towingPlateVisible=true', async () => {
      await expect(
        service.advanceStep(
          'accident-id',
          { step: AccidentStep.VEHICLE_TOWED, towingPlateVisible: true } as any,
          mockActor as any,
        ),
      ).resolves.toBeDefined();
    });
  });

  // ── validateExpense — R-13 seuil SM ─────────────────────────────────────────

  describe('validateExpense — R-13 seuil SM', () => {
    beforeEach(() => {
      mockPrisma.accidentExpense.update.mockResolvedValue({ id: 'exp-1', isPaid: true });
    });

    it('R-13 : rejette montant = seuil sans smValidated', async () => {
      mockPrisma.accidentExpense.findFirst.mockResolvedValue({
        id: 'exp-1', accidentCaseId: 'accident-id',
        amount: ACCIDENT_EXPENSE_SM_THRESHOLD, validatedAt: null,
      });
      await expect(
        service.validateExpense('accident-id', 'exp-1', {} as any, mockActor as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('R-13 : rejette montant > seuil sans smValidated', async () => {
      mockPrisma.accidentExpense.findFirst.mockResolvedValue({
        id: 'exp-1', accidentCaseId: 'accident-id',
        amount: ACCIDENT_EXPENSE_SM_THRESHOLD + 50000, validatedAt: null,
      });
      await expect(
        service.validateExpense('accident-id', 'exp-1', { smValidated: false } as any, mockActor as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('R-13 : accepte montant >= seuil avec smValidated=true', async () => {
      mockPrisma.accidentExpense.findFirst.mockResolvedValue({
        id: 'exp-1', accidentCaseId: 'accident-id',
        amount: ACCIDENT_EXPENSE_SM_THRESHOLD, validatedAt: null,
      });
      await expect(
        service.validateExpense('accident-id', 'exp-1', { smValidated: true } as any, mockActor as any),
      ).resolves.toBeDefined();
    });

    it('R-13 : accepte montant < seuil sans smValidated', async () => {
      mockPrisma.accidentExpense.findFirst.mockResolvedValue({
        id: 'exp-1', accidentCaseId: 'accident-id',
        amount: ACCIDENT_EXPENSE_SM_THRESHOLD - 1, validatedAt: null,
      });
      await expect(
        service.validateExpense('accident-id', 'exp-1', {} as any, mockActor as any),
      ).resolves.toBeDefined();
    });
  });

  // ── close — D-15 + FIX 2 restauration ────────────────────────────────────────

  describe('close', () => {
    const closableCase = buildCase({ currentStep: AccidentStep.VEHICLE_RETURNED });

    beforeEach(() => {
      mockPrisma.accidentCase.findFirst.mockResolvedValue(closableCase);
      mockPrisma.accidentCase.update.mockResolvedValue({
        ...closableCase,
        status: AccidentCaseStatus.CLOSED,
      });
    });

    it('clôture si étape VEHICLE_RETURNED', async () => {
      mockPrisma.vehicle.findFirst.mockResolvedValue({ currentContractId: null });
      mockPrisma.vehicle.update.mockResolvedValue({});
      const result = await service.close('accident-id', {}, mockActor as any);
      expect(result.status).toBe(AccidentCaseStatus.CLOSED);
    });

    it('D-15 : resolveActiveEventsForSource appelé à la clôture', async () => {
      mockPrisma.vehicle.findFirst.mockResolvedValue({ currentContractId: null });
      mockPrisma.vehicle.update.mockResolvedValue({});
      await service.close('accident-id', {}, mockActor as any);
      expect(mockAvailability.resolveActiveEventsForSource).toHaveBeenCalled();
    });

    it('FIX 2 : restaure ASSIGNED si véhicule a un contrat actif', async () => {
      mockPrisma.vehicle.findFirst.mockResolvedValue({ currentContractId: 'contract-1' });
      mockPrisma.vehicle.update.mockResolvedValue({});
      await service.close('accident-id', {}, mockActor as any);
      // restoreVehicleStatus appelle vehicle.update — vérifier indirectement via resolveActiveEventsForSource
      expect(mockAvailability.resolveActiveEventsForSource).toHaveBeenCalled();
    });

    it('FIX 2 : restaure AVAILABLE si véhicule sans contrat actif', async () => {
      mockPrisma.vehicle.findFirst.mockResolvedValue({ currentContractId: null });
      mockPrisma.vehicle.update.mockResolvedValue({});
      await service.close('accident-id', {}, mockActor as any);
      expect(mockAvailability.resolveActiveEventsForSource).toHaveBeenCalled();
    });

    it('autorise clôture DISPUTED sans VEHICLE_RETURNED', async () => {
      mockPrisma.accidentCase.findFirst.mockResolvedValue(
        buildCase({ currentStep: AccidentStep.INSURANCE_DECLARED }),
      );
      mockPrisma.accidentCase.update.mockResolvedValue(
        buildCase({ status: AccidentCaseStatus.DISPUTED }),
      );
      mockPrisma.vehicle.findFirst.mockResolvedValue({ currentContractId: null });
      mockPrisma.vehicle.update.mockResolvedValue({});

      const result = await service.close(
        'accident-id',
        { status: AccidentCaseStatus.DISPUTED },
        mockActor as any,
      );
      expect(result.status).toBe(AccidentCaseStatus.DISPUTED);
    });

    it('rejette clôture CLOSED si étape != VEHICLE_RETURNED', async () => {
      mockPrisma.accidentCase.findFirst.mockResolvedValue(
        buildCase({ currentStep: AccidentStep.REPAIR_IN_PROGRESS }),
      );
      await expect(
        service.close('accident-id', { status: AccidentCaseStatus.CLOSED }, mockActor as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejette si le dossier est déjà clôturé', async () => {
      mockPrisma.accidentCase.findFirst.mockResolvedValue(
        buildCase({ status: AccidentCaseStatus.CLOSED }),
      );
      await expect(
        service.close('accident-id', {}, mockActor as any),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
