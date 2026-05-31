import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole, UserStatus } from '@prisma/client';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const mockUser = {
  id: 'user-uuid-1',
  email: 'admin@fleet.local',
  phone: null,
  firstName: 'Admin',
  lastName: 'Fleet',
  role: UserRole.ADMIN,
  status: UserStatus.ACTIVE,
  passwordHash: '',
  avatarUrl: null,
  lastLoginAt: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPrisma = {
  user: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  revokedToken: {
    findFirst: jest.fn(),
    upsert: jest.fn().mockResolvedValue({}),
    deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
  },
};

const mockJwt = {
  sign: jest.fn().mockReturnValue('signed-token'),
  verify: jest.fn(),
};

const mockConfig = {
  get: jest.fn().mockImplementation((key: string) => {
    const map: Record<string, string> = {
      'jwt.accessSecret': 'access-secret',
      'jwt.refreshSecret': 'refresh-secret',
      'jwt.accessExpiresIn': '1d',
      'jwt.refreshExpiresIn': '7d',
    };
    return map[key];
  }),
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  // ─── login ─────────────────────────────────────────────────────────────────

  describe('login()', () => {
    it('retourne des tokens quand les identifiants sont valides (email)', async () => {
      const hash = await bcrypt.hash('secret', 1);
      mockPrisma.user.findFirst.mockResolvedValue({ ...mockUser, passwordHash: hash });
      mockPrisma.user.update.mockResolvedValue(mockUser);

      const result = await service.login({ email: 'admin@fleet.local', password: 'secret' });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe('admin@fleet.local');
    });

    it('retourne des tokens quand les identifiants sont valides (téléphone)', async () => {
      const hash = await bcrypt.hash('secret', 1);
      mockPrisma.user.findFirst.mockResolvedValue({ ...mockUser, email: null, phone: '+2250700000001', passwordHash: hash });
      mockPrisma.user.update.mockResolvedValue(mockUser);

      const result = await service.login({ phone: '+2250700000001', password: 'secret' });

      expect(result).toHaveProperty('accessToken');
    });

    it('lève BadRequestException si email ET phone manquants', async () => {
      await expect(service.login({ password: 'secret' } as any)).rejects.toThrow(BadRequestException);
    });

    it('lève UnauthorizedException si utilisateur introuvable', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(service.login({ email: 'x@x.com', password: 'secret' })).rejects.toThrow(UnauthorizedException);
    });

    it('lève UnauthorizedException si mot de passe incorrect', async () => {
      const hash = await bcrypt.hash('correct', 1);
      mockPrisma.user.findFirst.mockResolvedValue({ ...mockUser, passwordHash: hash });

      await expect(service.login({ email: 'admin@fleet.local', password: 'wrong' })).rejects.toThrow(UnauthorizedException);
    });

    it('lève UnauthorizedException si compte SUSPENDED', async () => {
      const hash = await bcrypt.hash('secret', 1);
      mockPrisma.user.findFirst.mockResolvedValue({
        ...mockUser,
        passwordHash: hash,
        status: UserStatus.SUSPENDED,
      });

      await expect(service.login({ email: 'admin@fleet.local', password: 'secret' })).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── refresh ───────────────────────────────────────────────────────────────

  describe('refresh()', () => {
    it('retourne de nouveaux tokens avec un refresh token valide', async () => {
      mockJwt.verify.mockReturnValue({ sub: mockUser.id, role: mockUser.role, type: 'refresh', jti: 'jti-abc' });
      mockPrisma.revokedToken.findFirst.mockResolvedValue(null); // non révoqué
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);

      const result = await service.refresh({ refreshToken: 'valid-refresh' });

      expect(result).toHaveProperty('accessToken');
    });

    it('lève UnauthorizedException si le token est de type "access"', async () => {
      mockJwt.verify.mockReturnValue({ sub: mockUser.id, type: 'access' });

      await expect(service.refresh({ refreshToken: 'access-token' })).rejects.toThrow(UnauthorizedException);
    });

    it('lève UnauthorizedException si le token JWT est invalide', async () => {
      mockJwt.verify.mockImplementation(() => { throw new Error('invalid'); });

      await expect(service.refresh({ refreshToken: 'bad-token' })).rejects.toThrow(UnauthorizedException);
    });

    it('lève UnauthorizedException si l\'utilisateur est SUSPENDED', async () => {
      mockJwt.verify.mockReturnValue({ sub: mockUser.id, role: mockUser.role, type: 'refresh', jti: 'jti-abc' });
      mockPrisma.revokedToken.findFirst.mockResolvedValue(null);
      mockPrisma.user.findFirst.mockResolvedValue({ ...mockUser, status: UserStatus.SUSPENDED });

      await expect(service.refresh({ refreshToken: 'valid-refresh' })).rejects.toThrow(UnauthorizedException);
    });

    it('lève UnauthorizedException si l\'utilisateur n\'existe plus', async () => {
      mockJwt.verify.mockReturnValue({ sub: mockUser.id, role: mockUser.role, type: 'refresh', jti: 'jti-abc' });
      mockPrisma.revokedToken.findFirst.mockResolvedValue(null);
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(service.refresh({ refreshToken: 'valid-refresh' })).rejects.toThrow(UnauthorizedException);
    });

    // ── H-01 — Révocation ──────────────────────────────────────────────────

    it('H-01: lève UnauthorizedException si le jti est révoqué', async () => {
      mockJwt.verify.mockReturnValue({ sub: mockUser.id, role: mockUser.role, type: 'refresh', jti: 'jti-revoked' });
      mockPrisma.revokedToken.findFirst.mockResolvedValue({ id: 'rev-1', jti: 'jti-revoked' });

      await expect(service.refresh({ refreshToken: 'revoked-token' })).rejects.toThrow(UnauthorizedException);
      expect(mockPrisma.user.findFirst).not.toHaveBeenCalled();
    });
  });

  // ─── logout ────────────────────────────────────────────────────────────────

  describe('logout() — H-01', () => {
    it('révoque le jti et retourne un message de succès', async () => {
      const jti = 'jti-logout-test';
      mockJwt.verify.mockReturnValue({
        sub: mockUser.id, role: mockUser.role, type: 'refresh',
        jti, exp: Math.floor(Date.now() / 1000) + 604800,
      });
      mockPrisma.revokedToken.upsert.mockResolvedValue({});

      const result = await service.logout({ refreshToken: 'valid-refresh' }, mockUser.id);

      expect(result).toEqual({ message: 'Déconnexion effectuée' });
      expect(mockPrisma.revokedToken.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { jti }, create: expect.objectContaining({ jti, userId: mockUser.id }) }),
      );
    });

    it('retourne succès si le refresh token est expiré ou invalide (pas d\'erreur)', async () => {
      mockJwt.verify.mockImplementation(() => { throw new Error('expired'); });

      const result = await service.logout({ refreshToken: 'expired-token' }, mockUser.id);

      expect(result).toEqual({ message: 'Déconnexion effectuée' });
      expect(mockPrisma.revokedToken.upsert).not.toHaveBeenCalled();
    });

    it('retourne succès sans upsert si le token appartient à un autre utilisateur', async () => {
      mockJwt.verify.mockReturnValue({
        sub: 'other-user-id', role: mockUser.role, type: 'refresh',
        jti: 'jti-other', exp: Math.floor(Date.now() / 1000) + 3600,
      });

      const result = await service.logout({ refreshToken: 'other-token' }, mockUser.id);

      expect(result).toEqual({ message: 'Déconnexion effectuée' });
      expect(mockPrisma.revokedToken.upsert).not.toHaveBeenCalled();
    });
  });
});
