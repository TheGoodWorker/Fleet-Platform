/**
 * H-15 — NotificationsService
 *
 * Vérifie que :
 * - findForUser() utilise readAt (pas isRead) pour le filtre unreadOnly
 * - markAsRead() met à jour readAt avec une date (pas isRead = boolean)
 * - markAllAsRead() filtre sur readAt: null et set readAt: new Date()
 * - countUnread() filtre sur readAt: null
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationType, NotificationPriority } from '@prisma/client';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const USER_ID = 'user-uuid';
const NOTIF_ID = 'notif-uuid';

const buildNotif = (overrides: any = {}) => ({
  id: NOTIF_ID,
  userId: USER_ID,
  type: NotificationType.PAYMENT_RECEIVED,
  title: 'Test',
  message: 'Test message',
  priority: NotificationPriority.NORMAL,
  readAt: null,
  createdAt: new Date(),
  ...overrides,
});

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPrisma = {
  user: {
    findFirst: jest.fn(),
  },
  notification: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
  },
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('NotificationsService — H-15 (readAt)', () => {
  let service: NotificationsService;

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  // ─── findForUser ────────────────────────────────────────────────────────────

  describe('findForUser()', () => {
    it('utilise readAt:null comme filtre quand unreadOnly=true (pas isRead)', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);

      await service.findForUser(USER_ID, 1, 20, true);

      const callArgs = mockPrisma.notification.findMany.mock.calls[0][0];
      // H-15 : doit utiliser readAt: null, pas isRead: false
      expect(callArgs.where).toMatchObject({ userId: USER_ID, readAt: null });
      expect(callArgs.where.isRead).toBeUndefined();
    });

    it('ne filtre pas sur readAt quand unreadOnly=false', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([buildNotif()]);
      mockPrisma.notification.count.mockResolvedValue(1);

      await service.findForUser(USER_ID, 1, 20, false);

      const callArgs = mockPrisma.notification.findMany.mock.calls[0][0];
      expect(callArgs.where.readAt).toBeUndefined();
    });

    it('retourne la structure paginée', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([buildNotif()]);
      mockPrisma.notification.count.mockResolvedValue(1);

      const result = await service.findForUser(USER_ID, 1, 20, false);
      expect(result.meta).toMatchObject({ page: 1, limit: 20, total: 1 });
      expect(result.data).toHaveLength(1);
    });
  });

  // ─── markAsRead ─────────────────────────────────────────────────────────────

  describe('markAsRead()', () => {
    it('met à jour readAt avec une Date (pas isRead: true)', async () => {
      mockPrisma.notification.findFirst.mockResolvedValue(buildNotif());
      mockPrisma.notification.update.mockResolvedValue(buildNotif({ readAt: new Date() }));

      await service.markAsRead(NOTIF_ID, USER_ID);

      const callArgs = mockPrisma.notification.update.mock.calls[0][0];
      // H-15 : data doit contenir readAt (Date), pas isRead (boolean)
      expect(callArgs.data.readAt).toBeInstanceOf(Date);
      expect(callArgs.data.isRead).toBeUndefined();
    });

    it('lève NotFoundException si la notification n\'existe pas', async () => {
      mockPrisma.notification.findFirst.mockResolvedValue(null);

      await expect(service.markAsRead('bad-id', USER_ID)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── markAllAsRead ──────────────────────────────────────────────────────────

  describe('markAllAsRead()', () => {
    it('filtre sur readAt:null et set readAt:new Date()', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 3 });

      await service.markAllAsRead(USER_ID);

      const callArgs = mockPrisma.notification.updateMany.mock.calls[0][0];
      expect(callArgs.where).toMatchObject({ userId: USER_ID, readAt: null });
      expect(callArgs.data.readAt).toBeInstanceOf(Date);
      expect(callArgs.data.isRead).toBeUndefined();
    });
  });

  // ─── countUnread ────────────────────────────────────────────────────────────

  describe('countUnread()', () => {
    it('utilise readAt:null pour compter les non lues', async () => {
      mockPrisma.notification.count.mockResolvedValue(5);

      const count = await service.countUnread(USER_ID);

      expect(count).toBe(5);
      const callArgs = mockPrisma.notification.count.mock.calls[0][0];
      expect(callArgs.where).toMatchObject({ userId: USER_ID, readAt: null });
    });
  });
});
