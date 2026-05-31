/**
 * H-05 — UsersService : scoping MANAGER
 *
 * Vérifie que :
 * - Un MANAGER ne voit QUE les utilisateurs DRIVER liés à ses contrats
 * - Un SUPER_MANAGER voit tous les utilisateurs sans restriction
 * - Le filtre `role` externe est respecté si fourni
 */

import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { UserRole, UserStatus } from '@prisma/client';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const buildUser = (overrides: any = {}) => ({
  id: 'user-id',
  email: 'test@fleet.com',
  phone: '+22101234567',
  firstName: 'Ali',
  lastName: 'Diallo',
  role: UserRole.DRIVER,
  status: UserStatus.ACTIVE,
  avatarUrl: null,
  lastLoginAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  driver: { id: 'driver-id', status: 'ACTIVE' },
  owner: null,
  ...overrides,
});

const mockManager = {
  id: 'manager-id',
  role: UserRole.MANAGER,
};

const mockSuperManager = {
  id: 'sm-id',
  role: UserRole.SUPER_MANAGER,
};

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPrisma = {
  user: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

const mockConfig = {
  get: jest.fn().mockReturnValue(12),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('UsersService — findAll() scoping (H-05)', () => {
  let service: UsersService;

  beforeEach(async () => {
    jest.resetAllMocks();
    mockPrisma.user.findMany.mockResolvedValue([]);
    mockPrisma.user.count.mockResolvedValue(0);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  // ─── MANAGER scoping ────────────────────────────────────────────────────────

  describe('MANAGER', () => {
    it('filtre role=DRIVER ET ajoute driver.contracts.some(managerId)', async () => {
      await service.findAll({}, 1, 20, mockManager as any);

      const callArgs = mockPrisma.user.findMany.mock.calls[0][0];
      expect(callArgs.where.role).toBe(UserRole.DRIVER);
      // H-05 : présence du filtre de scoping via relation
      expect(callArgs.where.driver).toMatchObject({
        contracts: {
          some: { managerId: 'manager-id' },
        },
      });
    });

    it('retourne la liste (mock vide) sans erreur', async () => {
      const result = await service.findAll({}, 1, 20, mockManager as any);
      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });

    it('respecte le filtre search si fourni', async () => {
      await service.findAll({ search: 'Ali' }, 1, 20, mockManager as any);

      const callArgs = mockPrisma.user.findMany.mock.calls[0][0];
      expect(callArgs.where.OR).toBeDefined();
      expect(callArgs.where.driver).toBeDefined(); // scoping toujours présent
    });
  });

  // ─── SUPER_MANAGER — aucune restriction ─────────────────────────────────────

  describe('SUPER_MANAGER', () => {
    it('N\'ajoute PAS de filtre driver.contracts.some()', async () => {
      await service.findAll({}, 1, 20, mockSuperManager as any);

      const callArgs = mockPrisma.user.findMany.mock.calls[0][0];
      expect(callArgs.where.driver).toBeUndefined();
    });

    it('respecte le filtre role si fourni', async () => {
      await service.findAll({ role: UserRole.DRIVER }, 1, 20, mockSuperManager as any);

      const callArgs = mockPrisma.user.findMany.mock.calls[0][0];
      expect(callArgs.where.role).toBe(UserRole.DRIVER);
    });
  });

  // ─── Pagination ─────────────────────────────────────────────────────────────

  it('retourne la structure meta paginée', async () => {
    mockPrisma.user.findMany.mockResolvedValue([buildUser()]);
    mockPrisma.user.count.mockResolvedValue(1);

    const result = await service.findAll({}, 1, 20, mockSuperManager as any);
    expect(result.meta).toMatchObject({ page: 1, limit: 20, total: 1 });
    expect(result.data).toHaveLength(1);
  });
});
