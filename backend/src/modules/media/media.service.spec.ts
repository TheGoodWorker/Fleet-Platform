/**
 * H-10 — MediaService.submitPhotoMission() : vérification ownership des photos
 *
 * Vérifie que :
 * - Un DRIVER ne peut soumettre que ses propres photos
 * - ForbiddenException si une photo appartient à un autre utilisateur
 * - Aucune mise à jour si une photo non autorisée est détectée
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { MediaService } from './media.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PhotoMissionStatus, UserRole, UserStatus } from '@prisma/client';
import { STORAGE_PROVIDER } from './storage/storage.interface';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const DRIVER_USER_ID = 'driver-user-id';
const MISSION_ID = 'mission-id';

const mockActor = {
  id: DRIVER_USER_ID,
  role: UserRole.DRIVER,
  status: UserStatus.ACTIVE,
};

const buildMission = (overrides: any = {}) => ({
  id: MISSION_ID,
  vehicleId: 'vehicle-id',
  driverId: 'driver-id',
  type: 'VEHICLE_CONDITION',
  status: PhotoMissionStatus.PENDING,
  dueDate: new Date(),
  ...overrides,
});

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPrisma = {
  photoMission: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  photo: {
    findFirst: jest.fn(),
    updateMany: jest.fn(),
  },
  mediaAsset: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
};

const mockAudit = { log: jest.fn().mockResolvedValue(undefined) };
const mockNotifications = { send: jest.fn().mockResolvedValue(undefined) };
const mockStorage = {
  upload: jest.fn(),
  getUrl: jest.fn(),
};

// ─── Setup ────────────────────────────────────────────────────────────────────

describe('MediaService — submitPhotoMission() ownership (H-10)', () => {
  let service: MediaService;

  beforeEach(async () => {
    jest.resetAllMocks();
    mockAudit.log.mockResolvedValue(undefined);
    mockNotifications.send.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: STORAGE_PROVIDER, useValue: mockStorage },
      ],
    }).compile();

    service = module.get<MediaService>(MediaService);
  });

  // ─── Cas nominal ────────────────────────────────────────────────────────────

  it('soumet la mission si toutes les photos appartiennent à l\'acteur', async () => {
    mockPrisma.photoMission.findFirst.mockResolvedValue(buildMission());
    // Aucune photo non autorisée trouvée
    mockPrisma.photo.findFirst.mockResolvedValue(null);
    mockPrisma.photo.updateMany.mockResolvedValue({ count: 2 });
    mockPrisma.photoMission.update.mockResolvedValue({
      ...buildMission({ status: PhotoMissionStatus.SUBMITTED }),
      photos: [],
    });

    const result = await service.submitPhotoMission(
      MISSION_ID,
      { photoIds: ['photo-1', 'photo-2'] },
      mockActor as any,
    );

    expect(mockPrisma.photo.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ['photo-1', 'photo-2'] } } }),
    );
    expect(result.status).toBe(PhotoMissionStatus.SUBMITTED);
  });

  // ─── H-10 — Rejet si photo non autorisée ────────────────────────────────────

  it('lève ForbiddenException si une photo appartient à un autre utilisateur (H-10)', async () => {
    mockPrisma.photoMission.findFirst.mockResolvedValue(buildMission());
    // Une photo appartient à un autre user
    mockPrisma.photo.findFirst.mockResolvedValue({ id: 'photo-other-user' });

    await expect(
      service.submitPhotoMission(
        MISSION_ID,
        { photoIds: ['photo-1', 'photo-other-user'] },
        mockActor as any,
      ),
    ).rejects.toThrow(ForbiddenException);

    // Aucune mise à jour ne doit avoir eu lieu
    expect(mockPrisma.photo.updateMany).not.toHaveBeenCalled();
  });

  it('vérifie l\'ownership via mediaAsset.uploadedById sur le bon acteur', async () => {
    mockPrisma.photoMission.findFirst.mockResolvedValue(buildMission());
    mockPrisma.photo.findFirst.mockResolvedValue(null);
    mockPrisma.photo.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.photoMission.update.mockResolvedValue({
      ...buildMission({ status: PhotoMissionStatus.SUBMITTED }),
      photos: [],
    });

    await service.submitPhotoMission(
      MISSION_ID,
      { photoIds: ['photo-1'] },
      mockActor as any,
    );

    // La vérification doit utiliser { not: actor.id } pour trouver les non-autorisées
    expect(mockPrisma.photo.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { in: ['photo-1'] },
          mediaAsset: { uploadedById: { not: DRIVER_USER_ID } },
        }),
      }),
    );
  });

  it('ne lance pas la vérification si photoIds est vide', async () => {
    mockPrisma.photoMission.findFirst.mockResolvedValue(buildMission());
    mockPrisma.photoMission.update.mockResolvedValue({
      ...buildMission({ status: PhotoMissionStatus.SUBMITTED }),
      photos: [],
    });

    await service.submitPhotoMission(
      MISSION_ID,
      { photoIds: [] },
      mockActor as any,
    );

    // Aucune photo à vérifier → pas de photo.findFirst d'ownership
    expect(mockPrisma.photo.findFirst).not.toHaveBeenCalled();
    expect(mockPrisma.photo.updateMany).not.toHaveBeenCalled();
  });

  // ─── Autres guards ──────────────────────────────────────────────────────────

  it('lève NotFoundException si la mission est introuvable', async () => {
    mockPrisma.photoMission.findFirst.mockResolvedValue(null);

    await expect(
      service.submitPhotoMission(MISSION_ID, { photoIds: [] }, mockActor as any),
    ).rejects.toThrow(NotFoundException);
  });

  it('lève BadRequestException si la mission n\'est pas PENDING ou OVERDUE', async () => {
    mockPrisma.photoMission.findFirst.mockResolvedValue(
      buildMission({ status: PhotoMissionStatus.VALIDATED }),
    );

    await expect(
      service.submitPhotoMission(MISSION_ID, { photoIds: [] }, mockActor as any),
    ).rejects.toThrow(BadRequestException);
  });
});
