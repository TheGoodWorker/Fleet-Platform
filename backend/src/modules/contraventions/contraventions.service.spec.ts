import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ContraventionsService } from './contraventions.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ChargeType, ChargeStatus, ChargeResponsible, ContraventionSource, UserRole } from '@prisma/client';
import { Decimal } from 'decimal.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockActor = { id: 'manager-id', role: UserRole.MANAGER } as any;

const buildContravention = (overrides: any = {}) => ({
  id: 'contravention-id',
  vehicleId: 'vehicle-id',
  driverId: 'driver-id',
  contractId: 'contract-id',
  amount: new Decimal(25000),
  source: ContraventionSource.MANUAL,
  carculRef: null,
  infraction: 'Excès de vitesse',
  date: new Date('2026-05-01'),
  location: 'Autoroute A1',
  isPaid: false,
  paidAt: null,
  paidAmount: null,
  chargeId: null,
  vehicle: { id: 'vehicle-id', plateNumber: 'ABC123', brand: 'Toyota', model: 'Corolla' },
  driver: { id: 'driver-id', userId: 'user-driver' },
  ...overrides,
});

const mockPrisma = {
  vehicle: { findFirst: jest.fn() },
  driver: { findFirst: jest.fn() },
  contravention: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  charge: { create: jest.fn() },
};

const mockAudit = { log: jest.fn().mockResolvedValue(undefined) };

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ContraventionsService', () => {
  let service: ContraventionsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContraventionsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<ContraventionsService>(ContraventionsService);
  });

  // ── create — D-12 ────────────────────────────────────────────────────────────

  describe('create', () => {
    const createDto = {
      vehicleId: 'vehicle-id',
      driverId: 'driver-id',
      amount: 25000,
      source: ContraventionSource.MANUAL,
      infraction: 'Excès de vitesse',
      date: '2026-05-01',
    };

    beforeEach(() => {
      mockPrisma.vehicle.findFirst.mockResolvedValue({ id: 'vehicle-id', plateNumber: 'ABC123' });
      mockPrisma.driver.findFirst.mockResolvedValue({ id: 'driver-id', userId: 'user-driver' });
      mockPrisma.contravention.create.mockResolvedValue(buildContravention());
    });

    it('D-12 : crée une contravention sans changer la responsabilité (DRIVER implicite)', async () => {
      const result = await service.create(createDto as any, mockActor);
      expect(result).toBeDefined();
      expect(mockPrisma.contravention.create).toHaveBeenCalledTimes(1);
      // D-12 : la création ne prend aucun champ "responsible" — tout est DRIVER par convention
      const callData = mockPrisma.contravention.create.mock.calls[0][0].data;
      expect(callData).not.toHaveProperty('proposedResponsible');
    });

    it('lève NotFoundException si véhicule introuvable', async () => {
      mockPrisma.vehicle.findFirst.mockResolvedValue(null);
      await expect(
        service.create({ ...createDto, vehicleId: 'bad-id' } as any, mockActor),
      ).rejects.toThrow(NotFoundException);
    });

    it('lève NotFoundException si chauffeur introuvable', async () => {
      mockPrisma.driver.findFirst.mockResolvedValue(null);
      await expect(
        service.create({ ...createDto, driverId: 'bad-driver' } as any, mockActor),
      ).rejects.toThrow(NotFoundException);
    });

    it('crée sans chauffeur si driverId non fourni', async () => {
      const dtoSansDriver = { vehicleId: 'vehicle-id', amount: 15000, date: '2026-05-01' };
      mockPrisma.contravention.create.mockResolvedValue(buildContravention({ driverId: null }));

      const result = await service.create(dtoSansDriver as any, mockActor);
      expect(result).toBeDefined();
      // driver.findFirst ne doit pas être appelé si pas de driverId
      expect(mockPrisma.driver.findFirst).not.toHaveBeenCalled();
    });
  });

  // ── markPaid ─────────────────────────────────────────────────────────────────

  describe('markPaid', () => {
    it('marque la contravention comme payée', async () => {
      mockPrisma.contravention.findFirst.mockResolvedValue(buildContravention());
      mockPrisma.contravention.update.mockResolvedValue(buildContravention({ isPaid: true }));

      const result = await service.markPaid('contravention-id', { paidAmount: 25000 } as any, mockActor);
      expect(mockPrisma.contravention.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isPaid: true }),
        }),
      );
    });

    it('rejette si déjà payée', async () => {
      mockPrisma.contravention.findFirst.mockResolvedValue(buildContravention({ isPaid: true }));
      await expect(
        service.markPaid('contravention-id', { paidAmount: 25000 } as any, mockActor),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── convertToCharge — D-12 ───────────────────────────────────────────────────

  describe('convertToCharge', () => {
    it('D-12 : la charge créée a type=FINE et proposedResponsible=DRIVER', async () => {
      mockPrisma.contravention.findFirst.mockResolvedValue(buildContravention());
      const charge = {
        id: 'charge-id',
        type: ChargeType.FINE,
        status: ChargeStatus.PENDING_VALIDATION,
        proposedResponsible: ChargeResponsible.DRIVER,
        amount: new Decimal(25000),
      };
      mockPrisma.charge.create.mockResolvedValue(charge);
      mockPrisma.contravention.update.mockResolvedValue({
        ...buildContravention(), chargeId: 'charge-id',
      });

      const result = await service.convertToCharge('contravention-id', {} as any, mockActor);

      expect(mockPrisma.charge.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: ChargeType.FINE,
            proposedResponsible: ChargeResponsible.DRIVER,
            status: ChargeStatus.PENDING_VALIDATION,
          }),
        }),
      );
      expect(result.type).toBe(ChargeType.FINE);
      expect(result.proposedResponsible).toBe(ChargeResponsible.DRIVER);
    });

    it('D-12 : rejette si contravention déjà convertie en charge', async () => {
      mockPrisma.contravention.findFirst.mockResolvedValue(
        buildContravention({ chargeId: 'existing-charge' }),
      );
      await expect(
        service.convertToCharge('contravention-id', {} as any, mockActor),
      ).rejects.toThrow(BadRequestException);
    });

    it('lève NotFoundException si contravention introuvable', async () => {
      mockPrisma.contravention.findFirst.mockResolvedValue(null);
      await expect(
        service.convertToCharge('bad-id', {} as any, mockActor),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
