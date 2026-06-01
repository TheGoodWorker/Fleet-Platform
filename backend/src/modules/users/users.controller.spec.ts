/**
 * G-01 — UsersController : ForbiddenException sur changePassword
 *
 * Vérifie que :
 * - Un utilisateur qui change le mot de passe d'un autre (sans être ADMIN)
 *   reçoit HTTP 403 ForbiddenException (pas HTTP 500 Error)
 * - Un utilisateur peut changer son propre mot de passe
 * - Un ADMIN peut changer le mot de passe de n'importe qui
 */

import { ForbiddenException } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UserRole } from '@prisma/client';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const buildUser = (overrides: any = {}) => ({
  id: 'user-abc',
  role: UserRole.DRIVER,
  ...overrides,
});

const mockDto = { currentPassword: 'old', newPassword: 'new123!' };

const mockService = {
  changePassword: jest.fn().mockResolvedValue({ message: 'ok' }),
} as any;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('UsersController — G-01 (changePassword ForbiddenException)', () => {
  let controller: UsersController;

  beforeEach(() => {
    jest.resetAllMocks();
    controller = new UsersController(mockService);
  });

  it('lève ForbiddenException (pas Error) quand user modifie le mdp d\'un autre sans être ADMIN', () => {
    const currentUser = buildUser({ id: 'user-abc', role: UserRole.DRIVER });

    expect(() =>
      controller.changePassword('other-user-id', mockDto as any, currentUser as any),
    ).toThrow(ForbiddenException);
  });

  it('ne lève pas d\'exception quand l\'utilisateur change son propre mot de passe', () => {
    const currentUser = buildUser({ id: 'user-abc', role: UserRole.DRIVER });
    mockService.changePassword.mockResolvedValue({ message: 'ok' });

    expect(() =>
      controller.changePassword('user-abc', mockDto as any, currentUser as any),
    ).not.toThrow();
  });

  it('ne lève pas d\'exception quand un ADMIN change le mot de passe d\'un autre user', () => {
    const adminUser = buildUser({ id: 'admin-id', role: UserRole.ADMIN });
    mockService.changePassword.mockResolvedValue({ message: 'ok' });

    expect(() =>
      controller.changePassword('any-user-id', mockDto as any, adminUser as any),
    ).not.toThrow();
  });

  it('ForbiddenException produit HTTP 403, pas HTTP 500', () => {
    const currentUser = buildUser({ id: 'user-abc', role: UserRole.MANAGER });

    try {
      controller.changePassword('other-user-id', mockDto as any, currentUser as any);
      fail('Devait lever une exception');
    } catch (err) {
      expect(err).toBeInstanceOf(ForbiddenException);
      // ForbiddenException.getStatus() === 403
      expect((err as ForbiddenException).getStatus()).toBe(403);
    }
  });
});
