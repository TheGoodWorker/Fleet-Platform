import { Test, TestingModule } from '@nestjs/testing';
import { DocumentExpiryService } from './document-expiry.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { DocumentStatus, NotificationType, UserRole } from '@prisma/client';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const buildDoc = (overrides: any = {}) => ({
  id: 'doc-id',
  title: 'Carte grise',
  type: 'REGISTRATION_CARD',
  entityType: 'VEHICLE',
  entityId: 'vehicle-id',
  status: DocumentStatus.VALID,
  alwaysValid: false,
  isCritical: false,
  notifyOwner: false,
  validUntil: null,
  reminder30SentAt: null,
  reminder15SentAt: null,
  reminder7SentAt: null,
  reminder1SentAt: null,
  expiryNotifiedAt: null,
  ...overrides,
});

const mockPrisma = {
  document: {
    findMany: jest.fn(),
    update: jest.fn(),
  },
  user: {
    findMany: jest.fn(),
  },
  vehicle: {
    findFirst: jest.fn(),
  },
  driver: {
    findFirst: jest.fn(),
  },
  contract: {
    findFirst: jest.fn(),
  },
};

const mockNotifications = {
  send: jest.fn().mockResolvedValue(undefined),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('DocumentExpiryService', () => {
  let service: DocumentExpiryService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentExpiryService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<DocumentExpiryService>(DocumentExpiryService);
  });

  describe('checkDocumentExpiry', () => {
    it('doit passer un document à EXPIRED quand daysLeft < 0', async () => {
      const yesterday = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // -2 jours
      const doc = buildDoc({
        status: DocumentStatus.VALID,
        validUntil: yesterday,
      });

      mockPrisma.document.findMany.mockResolvedValue([doc]);
      mockPrisma.document.update.mockResolvedValue({ ...doc, status: DocumentStatus.EXPIRED });
      mockPrisma.vehicle.findFirst.mockResolvedValue({
        currentManagerId: 'manager-id',
        owner: null,
      });
      mockPrisma.user.findMany.mockResolvedValue([]);

      await service.checkDocumentExpiry();

      expect(mockPrisma.document.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'doc-id' },
          data: { status: DocumentStatus.EXPIRED },
        }),
      );
    });

    it('doit passer un document à EXPIRING_SOON quand daysLeft entre 0 et 30', async () => {
      const inTwentyDays = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000);
      const doc = buildDoc({
        status: DocumentStatus.VALID,
        validUntil: inTwentyDays,
      });

      mockPrisma.document.findMany.mockResolvedValue([doc]);
      mockPrisma.document.update.mockResolvedValue({ ...doc, status: DocumentStatus.EXPIRING_SOON });
      mockPrisma.vehicle.findFirst.mockResolvedValue({ currentManagerId: null, owner: null });
      mockPrisma.user.findMany.mockResolvedValue([]);

      await service.checkDocumentExpiry();

      expect(mockPrisma.document.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: DocumentStatus.EXPIRING_SOON },
        }),
      );
    });

    it('ne doit pas envoyer un rappel à 30 jours si reminder30SentAt est déjà défini', async () => {
      const inTwentyDays = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000);
      const doc = buildDoc({
        status: DocumentStatus.EXPIRING_SOON,
        validUntil: inTwentyDays,
        reminder30SentAt: new Date(), // déjà envoyé
      });

      mockPrisma.document.findMany.mockResolvedValue([doc]);
      mockPrisma.document.update.mockResolvedValue(doc);
      mockPrisma.vehicle.findFirst.mockResolvedValue({ currentManagerId: 'mgr-id', owner: null });
      mockPrisma.user.findMany.mockResolvedValue([]);

      await service.checkDocumentExpiry();

      // Le rappel à 30j ne doit pas être renvoyé
      expect(mockNotifications.send).not.toHaveBeenCalled();
    });

    it('doit notifier les admins pour un document critique expiré', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const doc = buildDoc({
        status: DocumentStatus.VALID,
        validUntil: yesterday,
        isCritical: true,
      });

      const admin = { id: 'admin-id' };
      mockPrisma.document.findMany.mockResolvedValue([doc]);
      mockPrisma.document.update.mockResolvedValue({ ...doc, status: DocumentStatus.EXPIRED });
      mockPrisma.user.findMany
        .mockResolvedValueOnce([admin]) // appel ADMIN findMany
        .mockResolvedValueOnce([]);     // super managers
      mockPrisma.vehicle.findFirst.mockResolvedValue({ currentManagerId: null, owner: null });

      await service.checkDocumentExpiry();

      expect(mockNotifications.send).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin-id',
          type: NotificationType.DOCUMENT_EXPIRED,
          priority: 'HIGH',
        }),
      );
    });

    it('doit notifier le propriétaire si notifyOwner=true et doc expirant', async () => {
      const inFiveDays = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
      const doc = buildDoc({
        status: DocumentStatus.EXPIRING_SOON,
        validUntil: inFiveDays,
        notifyOwner: true,
      });

      mockPrisma.document.findMany.mockResolvedValue([doc]);
      mockPrisma.document.update.mockResolvedValue(doc);
      mockPrisma.vehicle.findFirst.mockResolvedValue({
        currentManagerId: 'mgr-id',
        owner: { user: { id: 'owner-user-id' } },
      });
      mockPrisma.user.findMany.mockResolvedValue([]);

      await service.checkDocumentExpiry();

      expect(mockNotifications.send).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'owner-user-id',
          type: NotificationType.OWNER_DOCUMENT_EXPIRING_SOON,
        }),
      );
    });

    it('ne doit rien faire si aucun document n\'est en approche d\'expiration', async () => {
      mockPrisma.document.findMany.mockResolvedValue([]);
      await service.checkDocumentExpiry();
      expect(mockPrisma.document.update).not.toHaveBeenCalled();
      expect(mockNotifications.send).not.toHaveBeenCalled();
    });

    // ─── FIX 5 : document critique expiré — dédup expiryNotifiedAt ────────────

    it('FIX 5 : n\'envoie PAS l\'alerte critique si expiryNotifiedAt déjà défini', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const doc = buildDoc({
        status: DocumentStatus.EXPIRED,
        validUntil: yesterday,
        isCritical: true,
        expiryNotifiedAt: new Date(), // déjà notifié
      });

      mockPrisma.document.findMany.mockResolvedValue([doc]);
      mockPrisma.document.update.mockResolvedValue(doc);
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'admin-id' }]);
      mockPrisma.vehicle.findFirst.mockResolvedValue({ currentManagerId: null, owner: null });

      await service.checkDocumentExpiry();

      // L'alerte critique ne doit PAS être envoyée
      const criticalCalls = (mockNotifications.send as jest.Mock).mock.calls.filter(
        (call: any[]) => call[0]?.type === NotificationType.DOCUMENT_EXPIRED,
      );
      expect(criticalCalls).toHaveLength(0);
    });

    it('FIX 5 : envoie l\'alerte critique si expiryNotifiedAt est null (première fois)', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const doc = buildDoc({
        status: DocumentStatus.VALID,
        validUntil: yesterday,
        isCritical: true,
        expiryNotifiedAt: null, // pas encore notifié
      });

      const admin = { id: 'admin-id' };
      mockPrisma.document.findMany.mockResolvedValue([doc]);
      mockPrisma.document.update.mockResolvedValue({ ...doc, status: DocumentStatus.EXPIRED });
      mockPrisma.user.findMany
        .mockResolvedValueOnce([admin])  // admins
        .mockResolvedValueOnce([]);      // super managers
      mockPrisma.vehicle.findFirst.mockResolvedValue({ currentManagerId: null, owner: null });

      await service.checkDocumentExpiry();

      expect(mockNotifications.send).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin-id',
          type: NotificationType.DOCUMENT_EXPIRED,
        }),
      );
    });

    it('FIX 5 : document.update appelé avec expiryNotifiedAt lors de la première alerte critique', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const doc = buildDoc({
        status: DocumentStatus.VALID,
        validUntil: yesterday,
        isCritical: true,
        expiryNotifiedAt: null,
      });

      mockPrisma.document.findMany.mockResolvedValue([doc]);
      mockPrisma.document.update.mockResolvedValue({ ...doc, status: DocumentStatus.EXPIRED });
      mockPrisma.user.findMany
        .mockResolvedValueOnce([{ id: 'admin-id' }])
        .mockResolvedValueOnce([]);
      mockPrisma.vehicle.findFirst.mockResolvedValue({ currentManagerId: null, owner: null });

      await service.checkDocumentExpiry();

      // document.update doit être appelé avec expiryNotifiedAt (pour ne plus renvoyer)
      const updateCalls = (mockPrisma.document.update as jest.Mock).mock.calls;
      const expiryUpdateCall = updateCalls.find(
        (call: any[]) => call[0]?.data?.expiryNotifiedAt !== undefined,
      );
      expect(expiryUpdateCall).toBeDefined();
    });
  });
});
