import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AccidentsService } from './accidents.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AccidentStep, AccidentCaseStatus, UserRole, UserStatus } from '@prisma/client';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockActor = {
  id: 'manager-id',
  role: UserRole.MANAGER,
  firstName: 'Paul',
  lastName: 'Manager',
  status: UserStatus.ACTIVE,
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
  incident: {
    id: 'incident-id',
    type: 'ACCIDENT',
    vehicleId: 'vehicle-id',
    managerId: 'manager-id',
    severity: 'HIGH',
    vehicle: { id: 'vehicle-id', plateNumber: 'ABC123', brand: 'Toyota', model: 'Corolla' },
  },
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
};

const mockAudit = { log: jest.fn().mockResolvedValue(undefined) };
const mockNotifications = { send: jest.fn().mockResolvedValue(undefined) };

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AccidentsService', () => {
  let service: AccidentsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccidentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<AccidentsService>(AccidentsService);
  });

  // ── create ──────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('doit créer un dossier accident et l\'historique étape DECLARED', async () => {
      const incident = { id: 'incident-id', type: 'ACCIDENT', vehicleId: 'v-id', managerId: 'mgr-id' };
      const created = buildCase();

      mockPrisma.incident.findFirst.mockResolvedValue(incident);
      mockPrisma.accidentCase.findFirst.mockResolvedValueOnce(null); // pas de doublon
      mockPrisma.accidentCase.create.mockResolvedValue(created);
      mockPrisma.accidentStepHistory.create.mockResolvedValue({});
      mockPrisma.accidentCase.findFirst.mockResolvedValue(created);

      const result = await service.create(
        { incidentId: 'incident-id' },
        mockActor as any,
      );

      expect(mockPrisma.accidentCase.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.accidentStepHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ step: AccidentStep.DECLARED }),
        }),
      );
      expect(mockAudit.log).toHaveBeenCalledTimes(1);
    });

    it('doit rejeter si l\'incident n\'est pas de type ACCIDENT', async () => {
      mockPrisma.incident.findFirst.mockResolvedValue({
        id: 'incident-id',
        type: 'BREAKDOWN',
        vehicleId: 'v-id',
        managerId: null,
      });

      await expect(
        service.create({ incidentId: 'incident-id' }, mockActor as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('doit rejeter si un dossier accident existe déjà pour cet incident', async () => {
      const incident = { id: 'incident-id', type: 'ACCIDENT', vehicleId: 'v-id', managerId: null };
      const existing = buildCase();

      mockPrisma.incident.findFirst.mockResolvedValue(incident);
      mockPrisma.accidentCase.findFirst.mockResolvedValueOnce(existing);

      await expect(
        service.create({ incidentId: 'incident-id' }, mockActor as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── advanceStep ─────────────────────────────────────────────────────────────

  describe('advanceStep', () => {
    it('doit avancer l\'étape à PHOTOS_RECEIVED depuis DECLARED', async () => {
      const accidentCase = buildCase({ currentStep: AccidentStep.DECLARED });
      const updated = buildCase({ currentStep: AccidentStep.PHOTOS_RECEIVED });

      mockPrisma.accidentCase.findFirst.mockResolvedValue(accidentCase);
      mockPrisma.accidentCase.update.mockResolvedValue(updated);
      mockPrisma.accidentStepHistory.create.mockResolvedValue({});

      const result = await service.advanceStep(
        'accident-id',
        { step: AccidentStep.PHOTOS_RECEIVED },
        mockActor as any,
      );

      expect(result.currentStep).toBe(AccidentStep.PHOTOS_RECEIVED);
      expect(mockPrisma.accidentStepHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ step: AccidentStep.PHOTOS_RECEIVED }),
        }),
      );
    });

    it('doit rejeter si l\'étape cible est inférieure ou égale à l\'étape courante', async () => {
      const accidentCase = buildCase({ currentStep: AccidentStep.GARAGE_STARTED });
      mockPrisma.accidentCase.findFirst.mockResolvedValue(accidentCase);

      await expect(
        service.advanceStep(
          'accident-id',
          { step: AccidentStep.DECLARED }, // retour en arrière
          mockActor as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('doit rejeter si le dossier est déjà clôturé', async () => {
      const accidentCase = buildCase({ status: AccidentCaseStatus.CLOSED });
      mockPrisma.accidentCase.findFirst.mockResolvedValue(accidentCase);

      await expect(
        service.advanceStep(
          'accident-id',
          { step: AccidentStep.PHOTOS_RECEIVED },
          mockActor as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── close ────────────────────────────────────────────────────────────────────

  describe('close', () => {
    it('doit clôturer le dossier si à l\'étape VEHICLE_RETURNED', async () => {
      const accidentCase = buildCase({ currentStep: AccidentStep.VEHICLE_RETURNED });
      const closed = buildCase({ status: AccidentCaseStatus.CLOSED, currentStep: AccidentStep.VEHICLE_RETURNED });

      mockPrisma.accidentCase.findFirst.mockResolvedValue(accidentCase);
      mockPrisma.accidentCase.update.mockResolvedValue(closed);

      const result = await service.close('accident-id', {}, mockActor as any);
      expect(result.status).toBe(AccidentCaseStatus.CLOSED);
    });

    it('doit autoriser la clôture DISPUTED sans étape VEHICLE_RETURNED', async () => {
      const accidentCase = buildCase({ currentStep: AccidentStep.INSURANCE_DECLARED });
      const disputed = buildCase({ status: AccidentCaseStatus.DISPUTED });

      mockPrisma.accidentCase.findFirst.mockResolvedValue(accidentCase);
      mockPrisma.accidentCase.update.mockResolvedValue(disputed);

      const result = await service.close(
        'accident-id',
        { status: AccidentCaseStatus.DISPUTED },
        mockActor as any,
      );

      expect(result.status).toBe(AccidentCaseStatus.DISPUTED);
    });

    it('doit rejeter la clôture CLOSED si l\'étape n\'est pas VEHICLE_RETURNED', async () => {
      const accidentCase = buildCase({ currentStep: AccidentStep.REPAIR_IN_PROGRESS });
      mockPrisma.accidentCase.findFirst.mockResolvedValue(accidentCase);

      await expect(
        service.close('accident-id', { status: AccidentCaseStatus.CLOSED }, mockActor as any),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
