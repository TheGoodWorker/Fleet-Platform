import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { RepossessionsService } from './repossessions.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  RepossessionStatus, VehicleStatus, ContractStatus, UserRole,
} from '@prisma/client';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockActor = { id: 'manager-id', role: UserRole.MANAGER } as any;
const smActor = { id: 'sm-id', role: UserRole.SUPER_MANAGER } as any;
const adminActor = { id: 'admin-id', role: UserRole.ADMIN } as any;

const buildRepossession = (overrides: any = {}) => ({
  id: 'repo-1',
  vehicleId: 'vehicle-id',
  contractId: 'contract-id',
  status: RepossessionStatus.PROPOSED,
  reason: 'Impayés',
  details: null,
  proposedById: 'manager-id',
  proposedAt: new Date(),
  smValidatedById: null,
  smValidatedAt: null,
  adminApprovedById: null,
  adminApprovedAt: null,
  repossessionDate: null,
  notes: null,
  closedAt: null,
  vehicle: { id: 'vehicle-id', plateNumber: 'ABC123', brand: 'Toyota', model: 'Corolla', status: VehicleStatus.ASSIGNED },
  contract: { id: 'contract-id', type: 'RENTAL', status: ContractStatus.ACTIVE, driverId: 'driver-id' },
  ...overrides,
});

const mockPrisma = {
  vehicle: { findFirst: jest.fn() },
  contract: { findFirst: jest.fn(), update: jest.fn() },
  vehicleRepossession: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  vehicleDriverAssignment: { updateMany: jest.fn() },
  user: { findMany: jest.fn().mockResolvedValue([]) },
  vehicle_update: jest.fn(),
  $transaction: jest.fn(),
};

const mockAudit = { log: jest.fn().mockResolvedValue(undefined) };
const mockNotifications = { send: jest.fn().mockResolvedValue(undefined) };

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('RepossessionsService', () => {
  let service: RepossessionsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Implémenter $transaction comme une exécution directe du callback
    mockPrisma.$transaction.mockImplementation((fn: any) =>
      fn({
        vehicleRepossession: { update: jest.fn().mockResolvedValue({}) },
        vehicle: { update: jest.fn().mockResolvedValue({}) },
        contract: { update: jest.fn().mockResolvedValue({}) },
        vehicleDriverAssignment: { updateMany: jest.fn().mockResolvedValue({}) },
      }),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RepossessionsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<RepossessionsService>(RepossessionsService);
  });

  // ── propose — Étape 1 ────────────────────────────────────────────────────────

  describe('propose', () => {
    const proposeDto = {
      vehicleId: 'vehicle-id',
      contractId: 'contract-id',
      reason: 'Impayés depuis 3 mois',
    };

    beforeEach(() => {
      mockPrisma.vehicle.findFirst.mockResolvedValue({
        id: 'vehicle-id', status: VehicleStatus.ASSIGNED, plateNumber: 'ABC123',
        currentManagerId: 'manager-id',
      });
      mockPrisma.vehicleRepossession.findFirst.mockResolvedValue(null); // pas de doublon actif
      mockPrisma.contract.findFirst.mockResolvedValue({ id: 'contract-id' });
      mockPrisma.vehicleRepossession.create.mockResolvedValue(buildRepossession());
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'sm-1' }, { id: 'sm-2' }]);
    });

    it('R-14 : crée une reprise en statut PROPOSED', async () => {
      const result = await service.propose(proposeDto as any, mockActor);
      expect(result.status).toBe(RepossessionStatus.PROPOSED);
      expect(mockPrisma.vehicleRepossession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: RepossessionStatus.PROPOSED }),
        }),
      );
    });

    it('R-14 : notifie les Super Managers', async () => {
      await service.propose(proposeDto as any, mockActor);
      expect(mockNotifications.send).toHaveBeenCalled();
    });

    it('rejette si le véhicule est introuvable', async () => {
      mockPrisma.vehicle.findFirst.mockResolvedValue(null);
      await expect(service.propose(proposeDto as any, mockActor)).rejects.toThrow(NotFoundException);
    });

    it('rejette si le véhicule est déjà REPOSSESSED', async () => {
      mockPrisma.vehicle.findFirst.mockResolvedValue({
        id: 'vehicle-id', status: VehicleStatus.REPOSSESSED,
        currentManagerId: 'manager-id',
      });
      await expect(service.propose(proposeDto as any, mockActor)).rejects.toThrow(BadRequestException);
    });

    it('rejette si une reprise active existe déjà pour ce véhicule', async () => {
      mockPrisma.vehicleRepossession.findFirst.mockResolvedValue(
        buildRepossession({ status: RepossessionStatus.PROPOSED }),
      );
      await expect(service.propose(proposeDto as any, mockActor)).rejects.toThrow(BadRequestException);
    });
  });

  // ── smValidate — Étape 2 ─────────────────────────────────────────────────────

  describe('smValidate', () => {
    beforeEach(() => {
      mockPrisma.vehicleRepossession.findFirst.mockResolvedValue(buildRepossession());
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'admin-1' }]);
    });

    it('R-14 : approved → SM_VALIDATED', async () => {
      mockPrisma.vehicleRepossession.update.mockResolvedValue(
        buildRepossession({ status: RepossessionStatus.SM_VALIDATED }),
      );
      const result = await service.smValidate(
        'repo-1',
        { decision: 'approved' } as any,
        smActor,
      );
      expect(result.status).toBe(RepossessionStatus.SM_VALIDATED);
    });

    it('R-14 : rejected → CONTRACT_CLOSED (terminal)', async () => {
      mockPrisma.vehicleRepossession.update.mockResolvedValue(
        buildRepossession({ status: RepossessionStatus.CONTRACT_CLOSED }),
      );
      const result = await service.smValidate(
        'repo-1',
        { decision: 'rejected' } as any,
        smActor,
      );
      expect(result.status).toBe(RepossessionStatus.CONTRACT_CLOSED);
    });

    it('rejette si la reprise n\'est pas PROPOSED', async () => {
      mockPrisma.vehicleRepossession.findFirst.mockResolvedValue(
        buildRepossession({ status: RepossessionStatus.SM_VALIDATED }),
      );
      await expect(
        service.smValidate('repo-1', { decision: 'approved' } as any, smActor),
      ).rejects.toThrow(BadRequestException);
    });

    it('notifie les Admins lors de l\'approbation SM', async () => {
      mockPrisma.vehicleRepossession.update.mockResolvedValue(
        buildRepossession({ status: RepossessionStatus.SM_VALIDATED }),
      );
      await service.smValidate('repo-1', { decision: 'approved' } as any, smActor);
      expect(mockNotifications.send).toHaveBeenCalled();
    });
  });

  // ── adminApprove — Étape 3 ───────────────────────────────────────────────────

  describe('adminApprove', () => {
    const smValidatedRepo = buildRepossession({ status: RepossessionStatus.SM_VALIDATED });

    beforeEach(() => {
      mockPrisma.vehicleRepossession.findFirst
        .mockResolvedValueOnce(smValidatedRepo) // appel initial
        .mockResolvedValue(buildRepossession({ status: RepossessionStatus.ADMIN_APPROVED })); // findById final
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'sm-1' }]);
    });

    it('R-14 : approved → exécute la transaction (ADMIN_APPROVED, vehicle REPOSSESSED, contract VEHICLE_REPOSSESSED)', async () => {
      const txVehicleUpdate = jest.fn().mockResolvedValue({});
      const txContractUpdate = jest.fn().mockResolvedValue({});
      const txAssignmentUpdate = jest.fn().mockResolvedValue({});
      const txRepoUpdate = jest.fn().mockResolvedValue({});

      mockPrisma.$transaction.mockImplementationOnce((fn: any) =>
        fn({
          vehicleRepossession: { update: txRepoUpdate },
          vehicle: { update: txVehicleUpdate },
          contract: { update: txContractUpdate },
          vehicleDriverAssignment: { updateMany: txAssignmentUpdate },
        }),
      );

      await service.adminApprove('repo-1', { decision: 'approved' } as any, adminActor);

      // Vérification transaction
      expect(txVehicleUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: VehicleStatus.REPOSSESSED }) }),
      );
      expect(txContractUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: ContractStatus.VEHICLE_REPOSSESSED }) }),
      );
    });

    it('R-14 : rejected → CONTRACT_CLOSED (terminal, sans transaction)', async () => {
      mockPrisma.vehicleRepossession.update.mockResolvedValue(
        buildRepossession({ status: RepossessionStatus.CONTRACT_CLOSED }),
      );

      const result = await service.adminApprove(
        'repo-1',
        { decision: 'rejected' } as any,
        adminActor,
      );
      expect(result.status).toBe(RepossessionStatus.CONTRACT_CLOSED);
      // La transaction ne doit pas être appelée
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejette si la reprise n\'est pas SM_VALIDATED', async () => {
      mockPrisma.vehicleRepossession.findFirst.mockReset().mockResolvedValue(
        buildRepossession({ status: RepossessionStatus.PROPOSED }),
      );
      await expect(
        service.adminApprove('repo-1', { decision: 'approved' } as any, adminActor),
      ).rejects.toThrow(BadRequestException);
    });

    it('R-14 : ferme le VehicleDriverAssignment actif lors de l\'approbation', async () => {
      const txAssignmentUpdate = jest.fn().mockResolvedValue({ count: 1 });
      const txVehicleUpdate = jest.fn().mockResolvedValue({});
      const txContractUpdate = jest.fn().mockResolvedValue({});
      const txRepoUpdate = jest.fn().mockResolvedValue({});

      mockPrisma.$transaction.mockImplementationOnce((fn: any) =>
        fn({
          vehicleRepossession: { update: txRepoUpdate },
          vehicle: { update: txVehicleUpdate },
          contract: { update: txContractUpdate },
          vehicleDriverAssignment: { updateMany: txAssignmentUpdate },
        }),
      );

      await service.adminApprove('repo-1', { decision: 'approved' } as any, adminActor);

      expect(txAssignmentUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ contractId: 'contract-id', isActive: true }),
          data: expect.objectContaining({ isActive: false }),
        }),
      );
    });

    it('R-14 : notifie les Super Managers de la finalisation', async () => {
      const txVehicleUpdate = jest.fn().mockResolvedValue({});
      const txContractUpdate = jest.fn().mockResolvedValue({});
      const txAssignmentUpdate = jest.fn().mockResolvedValue({});
      const txRepoUpdate = jest.fn().mockResolvedValue({});

      mockPrisma.$transaction.mockImplementationOnce((fn: any) =>
        fn({
          vehicleRepossession: { update: txRepoUpdate },
          vehicle: { update: txVehicleUpdate },
          contract: { update: txContractUpdate },
          vehicleDriverAssignment: { updateMany: txAssignmentUpdate },
        }),
      );

      await service.adminApprove('repo-1', { decision: 'approved' } as any, adminActor);
      expect(mockNotifications.send).toHaveBeenCalled();
    });
  });
});
