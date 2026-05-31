import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const PERMISSION_ID = 'perm-uuid-1';
const USER_ID = 'user-uuid-1';
const PERM_CODE = 'can_create_vehicle';

const mockPermission = { id: PERMISSION_ID, code: PERM_CODE, name: 'Créer véhicule', module: 'VEHICLE', isActive: true };

const mockPrisma = {
  user: { findFirst: jest.fn() },
  permission: { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn(), create: jest.fn() },
  rolePermission: { findUnique: jest.fn(), findMany: jest.fn(), upsert: jest.fn() },
  userPermissionOverride: { findUnique: jest.fn(), findMany: jest.fn(), upsert: jest.fn(), delete: jest.fn() },
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PermissionsService', () => {
  let service: PermissionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PermissionsService>(PermissionsService);
    jest.clearAllMocks();
  });

  // ─── checkPermission ───────────────────────────────────────────────────────

  describe('checkPermission()', () => {
    beforeEach(() => {
      mockPrisma.user.findFirst.mockResolvedValue({ role: UserRole.MANAGER });
      mockPrisma.permission.findUnique.mockResolvedValue(mockPermission);
    });

    it('retourne false si l\'utilisateur n\'existe pas', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      const result = await service.checkPermission(USER_ID, PERM_CODE);
      expect(result).toBe(false);
    });

    it('retourne false si le code de permission est inconnu', async () => {
      mockPrisma.permission.findUnique.mockResolvedValue(null);
      const result = await service.checkPermission(USER_ID, 'unknown_code');
      expect(result).toBe(false);
    });

    it('retourne true si un override actif isGranted=true existe', async () => {
      mockPrisma.userPermissionOverride.findUnique.mockResolvedValue({
        isGranted: true,
        expiresAt: null,
      });
      const result = await service.checkPermission(USER_ID, PERM_CODE);
      expect(result).toBe(true);
    });

    it('retourne false si un override actif isGranted=false existe (révocation)', async () => {
      mockPrisma.userPermissionOverride.findUnique.mockResolvedValue({
        isGranted: false,
        expiresAt: null,
      });
      const result = await service.checkPermission(USER_ID, PERM_CODE);
      expect(result).toBe(false);
    });

    it('ignore un override expiré et tombe sur le RolePermission', async () => {
      const pastDate = new Date(Date.now() - 1000);
      mockPrisma.userPermissionOverride.findUnique.mockResolvedValue({
        isGranted: true,
        expiresAt: pastDate,
      });
      mockPrisma.rolePermission.findUnique.mockResolvedValue({ isGranted: false });

      const result = await service.checkPermission(USER_ID, PERM_CODE);

      // Override expiré → fallback rôle → false
      expect(result).toBe(false);
    });

    it('retourne la valeur du RolePermission quand aucun override n\'existe', async () => {
      mockPrisma.userPermissionOverride.findUnique.mockResolvedValue(null);
      mockPrisma.rolePermission.findUnique.mockResolvedValue({ isGranted: true });

      const result = await service.checkPermission(USER_ID, PERM_CODE);
      expect(result).toBe(true);
    });

    it('retourne false si ni override ni RolePermission n\'existent', async () => {
      mockPrisma.userPermissionOverride.findUnique.mockResolvedValue(null);
      mockPrisma.rolePermission.findUnique.mockResolvedValue(null);

      const result = await service.checkPermission(USER_ID, PERM_CODE);
      expect(result).toBe(false);
    });

    it('un override non expiré prend priorité sur le RolePermission', async () => {
      const futureDate = new Date(Date.now() + 86400_000);
      mockPrisma.userPermissionOverride.findUnique.mockResolvedValue({
        isGranted: true,
        expiresAt: futureDate,
      });
      mockPrisma.rolePermission.findUnique.mockResolvedValue({ isGranted: false });

      const result = await service.checkPermission(USER_ID, PERM_CODE);
      expect(result).toBe(true);
    });
  });

  // ─── create ────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('crée une nouvelle permission', async () => {
      mockPrisma.permission.findUnique.mockResolvedValue(null);
      mockPrisma.permission.create.mockResolvedValue(mockPermission);

      const result = await service.create({
        code: PERM_CODE,
        name: 'Créer véhicule',
        module: 'VEHICLE' as any,
      });

      expect(result).toEqual(mockPermission);
      expect(mockPrisma.permission.create).toHaveBeenCalledTimes(1);
    });

    it('lève ConflictException si le code existe déjà', async () => {
      mockPrisma.permission.findUnique.mockResolvedValue(mockPermission);

      await expect(service.create({
        code: PERM_CODE,
        name: 'Doublon',
        module: 'VEHICLE' as any,
      })).rejects.toThrow(ConflictException);
    });
  });

  // ─── grantToUser ──────────────────────────────────────────────────────────

  describe('grantToUser()', () => {
    it('lève NotFoundException si le code de permission est inconnu', async () => {
      mockPrisma.permission.findUnique.mockResolvedValue(null);

      await expect(
        service.grantToUser('actor-id', USER_ID, {
          permissionCode: 'unknown',
          isGranted: true,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('crée ou met à jour un override', async () => {
      mockPrisma.permission.findUnique.mockResolvedValue(mockPermission);
      mockPrisma.userPermissionOverride.upsert.mockResolvedValue({
        isGranted: true,
        permission: mockPermission,
      });

      const result = await service.grantToUser('actor-id', USER_ID, {
        permissionCode: PERM_CODE,
        isGranted: true,
        reason: 'test',
      });

      expect(result.isGranted).toBe(true);
      expect(mockPrisma.userPermissionOverride.upsert).toHaveBeenCalledTimes(1);
    });
  });
});
