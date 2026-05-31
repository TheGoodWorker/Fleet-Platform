/**
 * Tests unitaires — DriversService
 *
 * Couvre les scénarios Gap 5 :
 * - validateKyc : transition PENDING_KYC → PENDING_FIELD_VALIDATION
 * - validateKyc : propagation kycValidated sur les contrats DRAFT
 * - validateField : transition PENDING_FIELD_VALIDATION → APPROVED
 * - validateField : propagation fieldValidated sur les contrats DRAFT
 * - Erreurs de statut incorrect (BadRequestException)
 * - Erreur si chauffeur introuvable (NotFoundException)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DriversService } from './drivers.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ContractStatus, DriverStatus, FieldValidationStatus } from '@prisma/client';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const ACTOR_ID = 'actor-id';
const DRIVER_ID = 'driver-id';
const KYC_ID = 'kyc-id';

const buildDriver = (overrides: any = {}) => ({
  id: DRIVER_ID,
  userId: 'user-id',
  status: DriverStatus.PENDING_KYC,
  kyc: { id: KYC_ID, driverId: DRIVER_ID },
  fieldValidation: null,
  ...overrides,
});

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPrisma = {
  driver: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  driverKYC: {
    update: jest.fn(),
    create: jest.fn(),
  },
  driverFieldValidation: {
    update: jest.fn(),
    create: jest.fn(),
  },
  contract: {
    updateMany: jest.fn(),
  },
  user: {
    update: jest.fn(),
  },
};

const mockAudit = { log: jest.fn().mockResolvedValue(undefined) };

// ─── Setup ────────────────────────────────────────────────────────────────────

describe('DriversService', () => {
  let service: DriversService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DriversService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<DriversService>(DriversService);
    jest.clearAllMocks();
  });

  // ─── validateKyc() ────────────────────────────────────────────────────────

  describe('validateKyc()', () => {
    it('passe driver.status PENDING_KYC → PENDING_FIELD_VALIDATION', async () => {
      mockPrisma.driver.findFirst.mockResolvedValue(buildDriver());
      mockPrisma.driverKYC.update.mockResolvedValue({});
      mockPrisma.driver.update.mockResolvedValue({});
      mockPrisma.contract.updateMany.mockResolvedValue({ count: 1 });

      await service.validateKyc(DRIVER_ID, ACTOR_ID);

      expect(mockPrisma.driver.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: DRIVER_ID },
          data: { status: DriverStatus.PENDING_FIELD_VALIDATION },
        }),
      );
    });

    it('marque tous les champs KYC à true sur DriverKYC existant', async () => {
      mockPrisma.driver.findFirst.mockResolvedValue(buildDriver());
      mockPrisma.driverKYC.update.mockResolvedValue({});
      mockPrisma.driver.update.mockResolvedValue({});
      mockPrisma.contract.updateMany.mockResolvedValue({ count: 0 });

      await service.validateKyc(DRIVER_ID, ACTOR_ID);

      expect(mockPrisma.driverKYC.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { driverId: DRIVER_ID },
          data: expect.objectContaining({
            fullNameVerified: true,
            photoVerified: true,
            idCardVerified: true,
            licenseVerified: true,
            phoneVerified: true,
            validatedById: ACTOR_ID,
          }),
        }),
      );
    });

    it('crée DriverKYC si absent et le marque entièrement validé', async () => {
      mockPrisma.driver.findFirst.mockResolvedValue(buildDriver({ kyc: null }));
      mockPrisma.driverKYC.create.mockResolvedValue({});
      mockPrisma.driver.update.mockResolvedValue({});
      mockPrisma.contract.updateMany.mockResolvedValue({ count: 0 });

      await service.validateKyc(DRIVER_ID, ACTOR_ID);

      expect(mockPrisma.driverKYC.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            driverId: DRIVER_ID,
            fullNameVerified: true,
            licenseVerified: true,
            validatedById: ACTOR_ID,
          }),
        }),
      );
      expect(mockPrisma.driverKYC.update).not.toHaveBeenCalled();
    });

    it('propage kycValidated=true sur tous les contrats DRAFT/PENDING_APPROVAL', async () => {
      mockPrisma.driver.findFirst.mockResolvedValue(buildDriver());
      mockPrisma.driverKYC.update.mockResolvedValue({});
      mockPrisma.driver.update.mockResolvedValue({});
      mockPrisma.contract.updateMany.mockResolvedValue({ count: 2 });

      await service.validateKyc(DRIVER_ID, ACTOR_ID);

      expect(mockPrisma.contract.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            driverId: DRIVER_ID,
            status: { in: [ContractStatus.DRAFT, ContractStatus.PENDING_APPROVAL] },
          },
          data: { kycValidated: true },
        }),
      );
    });

    it('enregistre un audit DRIVER_KYC_VALIDATED', async () => {
      mockPrisma.driver.findFirst.mockResolvedValue(buildDriver());
      mockPrisma.driverKYC.update.mockResolvedValue({});
      mockPrisma.driver.update.mockResolvedValue({});
      mockPrisma.contract.updateMany.mockResolvedValue({ count: 0 });

      await service.validateKyc(DRIVER_ID, ACTOR_ID);

      // Audit est fire-and-forget, on attend la microtask
      await Promise.resolve();

      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'DRIVER_KYC_VALIDATED',
          actorId: ACTOR_ID,
          entityId: DRIVER_ID,
        }),
      );
    });

    it('lève BadRequestException si driver.status n\'est pas PENDING_KYC', async () => {
      mockPrisma.driver.findFirst.mockResolvedValue(
        buildDriver({ status: DriverStatus.PENDING_FIELD_VALIDATION }),
      );

      await expect(service.validateKyc(DRIVER_ID, ACTOR_ID)).rejects.toThrow(BadRequestException);
    });

    it('lève NotFoundException si le chauffeur est introuvable', async () => {
      mockPrisma.driver.findFirst.mockResolvedValue(null);

      await expect(service.validateKyc('unknown-id', ACTOR_ID)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── validateField() ──────────────────────────────────────────────────────

  describe('validateField()', () => {
    const fieldDto = { homeVisitDone: true, managerComment: 'Bon dossier' };

    it('passe driver.status PENDING_FIELD_VALIDATION → APPROVED', async () => {
      mockPrisma.driver.findFirst.mockResolvedValue(
        buildDriver({
          status: DriverStatus.PENDING_FIELD_VALIDATION,
          fieldValidation: null,
        }),
      );
      mockPrisma.driverFieldValidation.create.mockResolvedValue({});
      mockPrisma.driver.update.mockResolvedValue({});
      mockPrisma.contract.updateMany.mockResolvedValue({ count: 1 });

      await service.validateField(DRIVER_ID, ACTOR_ID, fieldDto);

      expect(mockPrisma.driver.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: DRIVER_ID },
          data: { status: DriverStatus.APPROVED },
        }),
      );
    });

    it('crée DriverFieldValidation si absent', async () => {
      mockPrisma.driver.findFirst.mockResolvedValue(
        buildDriver({ status: DriverStatus.PENDING_FIELD_VALIDATION, fieldValidation: null }),
      );
      mockPrisma.driverFieldValidation.create.mockResolvedValue({});
      mockPrisma.driver.update.mockResolvedValue({});
      mockPrisma.contract.updateMany.mockResolvedValue({ count: 0 });

      await service.validateField(DRIVER_ID, ACTOR_ID, fieldDto);

      expect(mockPrisma.driverFieldValidation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            driverId: DRIVER_ID,
            homeVisitDone: true,
            status: FieldValidationStatus.VALIDATED,
            managerId: ACTOR_ID,
          }),
        }),
      );
      expect(mockPrisma.driverFieldValidation.update).not.toHaveBeenCalled();
    });

    it('met à jour DriverFieldValidation existant', async () => {
      const existingFv = { id: 'fv-id', driverId: DRIVER_ID, status: FieldValidationStatus.PENDING };
      mockPrisma.driver.findFirst.mockResolvedValue(
        buildDriver({ status: DriverStatus.PENDING_FIELD_VALIDATION, fieldValidation: existingFv }),
      );
      mockPrisma.driverFieldValidation.update.mockResolvedValue({});
      mockPrisma.driver.update.mockResolvedValue({});
      mockPrisma.contract.updateMany.mockResolvedValue({ count: 0 });

      await service.validateField(DRIVER_ID, ACTOR_ID, fieldDto);

      expect(mockPrisma.driverFieldValidation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { driverId: DRIVER_ID },
          data: expect.objectContaining({
            status: FieldValidationStatus.VALIDATED,
            managerId: ACTOR_ID,
          }),
        }),
      );
      expect(mockPrisma.driverFieldValidation.create).not.toHaveBeenCalled();
    });

    it('propage fieldValidated=true sur tous les contrats DRAFT/PENDING_APPROVAL', async () => {
      mockPrisma.driver.findFirst.mockResolvedValue(
        buildDriver({ status: DriverStatus.PENDING_FIELD_VALIDATION, fieldValidation: null }),
      );
      mockPrisma.driverFieldValidation.create.mockResolvedValue({});
      mockPrisma.driver.update.mockResolvedValue({});
      mockPrisma.contract.updateMany.mockResolvedValue({ count: 1 });

      await service.validateField(DRIVER_ID, ACTOR_ID, fieldDto);

      expect(mockPrisma.contract.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            driverId: DRIVER_ID,
            status: { in: [ContractStatus.DRAFT, ContractStatus.PENDING_APPROVAL] },
          },
          data: { fieldValidated: true },
        }),
      );
    });

    it('enregistre un audit DRIVER_FIELD_VALIDATED', async () => {
      mockPrisma.driver.findFirst.mockResolvedValue(
        buildDriver({ status: DriverStatus.PENDING_FIELD_VALIDATION, fieldValidation: null }),
      );
      mockPrisma.driverFieldValidation.create.mockResolvedValue({});
      mockPrisma.driver.update.mockResolvedValue({});
      mockPrisma.contract.updateMany.mockResolvedValue({ count: 0 });

      await service.validateField(DRIVER_ID, ACTOR_ID, fieldDto);

      await Promise.resolve(); // flush fire-and-forget

      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'DRIVER_FIELD_VALIDATED',
          actorId: ACTOR_ID,
          entityId: DRIVER_ID,
        }),
      );
    });

    it('lève BadRequestException si driver.status n\'est pas PENDING_FIELD_VALIDATION', async () => {
      mockPrisma.driver.findFirst.mockResolvedValue(
        buildDriver({ status: DriverStatus.PENDING_KYC }),
      );

      await expect(service.validateField(DRIVER_ID, ACTOR_ID, fieldDto)).rejects.toThrow(BadRequestException);
    });

    it('lève NotFoundException si le chauffeur est introuvable', async () => {
      mockPrisma.driver.findFirst.mockResolvedValue(null);

      await expect(service.validateField('unknown-id', ACTOR_ID, fieldDto)).rejects.toThrow(NotFoundException);
    });

    it('applique homeVisitDone=true par défaut si non fourni', async () => {
      mockPrisma.driver.findFirst.mockResolvedValue(
        buildDriver({ status: DriverStatus.PENDING_FIELD_VALIDATION, fieldValidation: null }),
      );
      mockPrisma.driverFieldValidation.create.mockResolvedValue({});
      mockPrisma.driver.update.mockResolvedValue({});
      mockPrisma.contract.updateMany.mockResolvedValue({ count: 0 });

      await service.validateField(DRIVER_ID, ACTOR_ID, {}); // dto vide

      expect(mockPrisma.driverFieldValidation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ homeVisitDone: true }),
        }),
      );
    });
  });
});
