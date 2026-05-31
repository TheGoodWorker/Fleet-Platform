import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { SpecialAbsenceStatus, NotificationType, NotificationPriority } from '@prisma/client';
import { SpecialAbsencesService } from './special-absences.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AvailabilityService } from '../availability/availability.service';

const mockPrisma = {
  driver: { findFirst: jest.fn() },
  contract: { findFirst: jest.fn() },
  user: { findMany: jest.fn() },
  specialAbsence: {
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

describe('SpecialAbsencesService', () => {
  let service: SpecialAbsencesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpecialAbsencesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: AvailabilityService, useValue: mockAvailability },
      ],
    }).compile();
    service = module.get<SpecialAbsencesService>(SpecialAbsencesService);
  });

  // ─── request ────────────────────────────────────────────────────────────────

  describe('request', () => {
    const dto = {
      driverId: 'd-1',
      contractId: 'c-1',
      reason: 'Maladie',
      estimatedDays: 3,
      startDate: '2026-05-10T00:00:00Z',
    } as any;

    it('lève NotFoundException si chauffeur introuvable', async () => {
      mockPrisma.driver.findFirst.mockResolvedValue(null);
      await expect(service.request(dto, mockActor)).rejects.toThrow(NotFoundException);
    });

    it('lève NotFoundException si contrat introuvable', async () => {
      mockPrisma.driver.findFirst.mockResolvedValue({ id: 'd-1', userId: 'u-1' });
      mockPrisma.contract.findFirst.mockResolvedValue(null);
      await expect(service.request(dto, mockActor)).rejects.toThrow(NotFoundException);
    });

    it('crée une absence en statut PENDING et notifie le manager', async () => {
      mockPrisma.driver.findFirst.mockResolvedValue({ id: 'd-1', userId: 'u-1' });
      mockPrisma.contract.findFirst.mockResolvedValue({ id: 'c-1', managerId: 'mgr-1' });
      const created = {
        id: 'abs-1',
        status: SpecialAbsenceStatus.PENDING,
        contract: { managerId: 'mgr-1' },
        driver: { userId: 'u-1' },
      };
      mockPrisma.specialAbsence.create.mockResolvedValue(created);

      const result = await service.request(dto, mockActor);

      expect(mockPrisma.specialAbsence.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: SpecialAbsenceStatus.PENDING,
            driverId: 'd-1',
          }),
        }),
      );
      expect(result).toEqual(created);
    });
  });

  // ─── managerReview ──────────────────────────────────────────────────────────

  describe('managerReview', () => {
    it('lève NotFoundException si absence introuvable', async () => {
      mockPrisma.specialAbsence.findFirst.mockResolvedValue(null);
      await expect(service.managerReview('abs-x', { decision: 'approved' }, mockActor)).rejects.toThrow(NotFoundException);
    });

    it('lève BadRequestException si absence non PENDING', async () => {
      mockPrisma.specialAbsence.findFirst.mockResolvedValue({
        id: 'abs-1',
        status: SpecialAbsenceStatus.APPROVED,
      });
      await expect(service.managerReview('abs-1', { decision: 'approved' }, mockActor)).rejects.toThrow(BadRequestException);
    });

    it('approved → passe à APPROVED et déclenche onApproved (D-15)', async () => {
      const absence = {
        id: 'abs-1',
        status: SpecialAbsenceStatus.PENDING,
        driverId: 'd-1',
        vehicleId: 'v-1',
        contract: { managerId: 'mgr-1' },
        driver: { userId: 'u-1' },
      };
      mockPrisma.specialAbsence.findFirst.mockResolvedValue(absence);
      const updated = { ...absence, status: SpecialAbsenceStatus.APPROVED };
      mockPrisma.specialAbsence.update.mockResolvedValue(updated);

      await service.managerReview('abs-1', { decision: 'approved' }, mockActor);

      expect(mockPrisma.specialAbsence.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: SpecialAbsenceStatus.APPROVED }),
        }),
      );
      // onApproved déclenche AvailabilityService.recordEvent
      expect(mockAvailability.recordEvent).toHaveBeenCalled();
    });

    it('escalate → passe à MANAGER_REVIEWED et notifie les super-managers', async () => {
      const absence = {
        id: 'abs-1',
        status: SpecialAbsenceStatus.PENDING,
        driver: { userId: 'u-1' },
        contract: { managerId: 'mgr-1' },
      };
      mockPrisma.specialAbsence.findFirst.mockResolvedValue(absence);
      const updated = { ...absence, status: SpecialAbsenceStatus.MANAGER_REVIEWED };
      mockPrisma.specialAbsence.update.mockResolvedValue(updated);
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'sm-1' }, { id: 'sm-2' }]);

      await service.managerReview('abs-1', { decision: 'escalate' }, mockActor);

      expect(mockPrisma.specialAbsence.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: SpecialAbsenceStatus.MANAGER_REVIEWED }),
        }),
      );
      // Notifications aux super-managers
      expect(mockNotifications.send).toHaveBeenCalled();
    });
  });

  // ─── smValidate ─────────────────────────────────────────────────────────────

  describe('smValidate', () => {
    it('lève BadRequestException si absence non MANAGER_REVIEWED', async () => {
      mockPrisma.specialAbsence.findFirst.mockResolvedValue({
        id: 'abs-1',
        status: SpecialAbsenceStatus.PENDING,
      });
      await expect(service.smValidate('abs-1', { decision: 'approved' }, mockActor)).rejects.toThrow(BadRequestException);
    });

    it('approved → APPROVED + onApproved', async () => {
      const absence = {
        id: 'abs-1',
        status: SpecialAbsenceStatus.MANAGER_REVIEWED,
        vehicleId: 'v-1',
        driverId: 'd-1',
        driver: { userId: 'u-1' },
        contract: { managerId: 'mgr-1' },
      };
      mockPrisma.specialAbsence.findFirst.mockResolvedValue(absence);
      mockPrisma.specialAbsence.update.mockResolvedValue({ ...absence, status: SpecialAbsenceStatus.APPROVED });

      await service.smValidate('abs-1', { decision: 'approved' }, mockActor);

      expect(mockAvailability.recordEvent).toHaveBeenCalled();
    });

    it('rejected → REJECTED + notifie chauffeur', async () => {
      const absence = {
        id: 'abs-1',
        status: SpecialAbsenceStatus.MANAGER_REVIEWED,
        driver: { userId: 'u-1' },
        contract: {},
      };
      mockPrisma.specialAbsence.findFirst.mockResolvedValue(absence);
      mockPrisma.specialAbsence.update.mockResolvedValue({ ...absence, status: SpecialAbsenceStatus.REJECTED });

      await service.smValidate('abs-1', { decision: 'rejected', rejectionReason: 'Pas justifié' }, mockActor);

      expect(mockPrisma.specialAbsence.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: SpecialAbsenceStatus.REJECTED }),
        }),
      );
    });
  });

  // ─── cancel ──────────────────────────────────────────────────────────────────

  describe('cancel', () => {
    it('lève BadRequestException si absence non annulable (APPROVED)', async () => {
      mockPrisma.specialAbsence.findFirst.mockResolvedValue({
        id: 'abs-1',
        status: SpecialAbsenceStatus.APPROVED,
      });
      await expect(service.cancel('abs-1', mockActor)).rejects.toThrow(BadRequestException);
    });

    it('annule l\'absence PENDING et résout les événements de disponibilité', async () => {
      const absence = {
        id: 'abs-1',
        status: SpecialAbsenceStatus.PENDING,
        driver: { userId: 'u-1' },
      };
      mockPrisma.specialAbsence.findFirst.mockResolvedValue(absence);
      mockPrisma.specialAbsence.update.mockResolvedValue({ ...absence, status: SpecialAbsenceStatus.CANCELLED });

      await service.cancel('abs-1', mockActor);

      expect(mockAvailability.resolveActiveEventsForSource).toHaveBeenCalledWith(
        'SPECIAL_ABSENCE',
        'abs-1',
        mockActor,
      );
    });
  });
});
