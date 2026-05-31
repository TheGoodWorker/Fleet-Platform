import {
  Injectable, Inject, Logger,
  NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { v4 as uuidv4 } from 'uuid';
import { extname } from 'path';
import {
  MediaType, MediaSource, PhotoMissionStatus, NotificationType,
  NotificationPriority, UserRole, User,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { IMediaStorageProvider, STORAGE_PROVIDER } from './storage/storage.interface';
import {
  UploadMediaDto, CreatePhotoDto, CreatePhotoMissionDto,
  SubmitPhotoMissionDto, MediaFiltersDto, PhotoMissionFiltersDto,
} from './dto/media.dto';
import { EntityTypes } from '../../common/constants/entity-types';

const ALLOWED_MIME_TYPES: Record<string, MediaType> = {
  'image/jpeg': MediaType.PHOTO,
  'image/png': MediaType.PHOTO,
  'image/webp': MediaType.PHOTO,
  'video/mp4': MediaType.VIDEO,
  'video/quicktime': MediaType.VIDEO,
  'application/pdf': MediaType.DOCUMENT,
  'audio/mpeg': MediaType.AUDIO,
  'audio/mp4': MediaType.AUDIO,
};

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 Mo

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private notificationsService: NotificationsService,
    @Inject(STORAGE_PROVIDER) private storageProvider: IMediaStorageProvider,
  ) {}

  // ─── Validation anti-fraude ────────────────────────────────────────────────

  /** D-06 : les chauffeurs ne peuvent uploader que via IN_APP_CAMERA. */
  private validateUploadSource(role: UserRole, source: MediaSource): void {
    if (role === UserRole.DRIVER && source !== MediaSource.IN_APP_CAMERA) {
      throw new ForbiddenException(
        "Les chauffeurs doivent utiliser l'appareil photo de l'application.",
      );
    }
  }

  private getEntityFolder(entityType?: string, entityId?: string): string {
    if (!entityType || !entityId) return 'misc';
    const map: Record<string, string> = {
      VEHICLE: `vehicles/${entityId}`,
      DRIVER: `drivers/${entityId}`,
      CONTRACT: `contracts/${entityId}`,
      INCIDENT: `incidents/${entityId}`,
      ACCIDENT_CASE: `accidents/${entityId}`,
      INSPECTION: `inspections/${entityId}`,
      MAINTENANCE: `maintenance/${entityId}`,
      DOCUMENT: `documents/${entityId}`,
    };
    return map[entityType] ?? `misc/${entityType}/${entityId}`;
  }

  // ─── Upload MediaAsset ─────────────────────────────────────────────────────

  async upload(
    file: Express.Multer.File,
    dto: UploadMediaDto,
    actor: User,
  ) {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException(
        `Fichier trop volumineux (max ${MAX_FILE_SIZE_BYTES / 1024 / 1024} Mo).`,
      );
    }

    const detectedType = ALLOWED_MIME_TYPES[file.mimetype];
    if (!detectedType) {
      throw new BadRequestException(`Type MIME non supporté : ${file.mimetype}`);
    }

    this.validateUploadSource(actor.role, dto.source);

    const fileExt = extname(file.originalname).toLowerCase() || '.bin';
    const fileName = `${uuidv4()}${fileExt}`;
    const folder = this.getEntityFolder(dto.entityType, dto.entityId);

    const uploadResult = await this.storageProvider.upload(
      file.buffer,
      fileName,
      file.mimetype,
      folder,
    );

    const asset = await this.prisma.mediaAsset.create({
      data: {
        fileUrl: uploadResult.url,
        fileName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        mediaType: detectedType,
        source: dto.source,
        gpsLat: dto.gpsLat !== undefined ? Number(dto.gpsLat) : null,
        gpsLng: dto.gpsLng !== undefined ? Number(dto.gpsLng) : null,
        takenAt: dto.takenAt ? new Date(dto.takenAt) : null,
        serverTimestamp: new Date(),
        uploadedById: actor.id,
        entityType: dto.entityType ?? null,
        entityId: dto.entityId ?? null,
        metadata: (dto.metadata ?? null) as any,
      },
    });

    this.logger.log(`MediaAsset créé : ${asset.id} (${file.mimetype}, ${file.size} octets)`);
    return asset;
  }

  async getSignedUrl(assetId: string): Promise<{ url: string }> {
    const asset = await this.prisma.mediaAsset.findFirst({ where: { id: assetId } });
    if (!asset) throw new NotFoundException(`MediaAsset ${assetId} introuvable`);

    // Extrait la clé depuis l'URL stockée en base
    const key = asset.fileUrl
      .replace(/^https?:\/\/[^/]+\/uploads\//, '')
      .replace(/^\/uploads\//, '');

    const url = await this.storageProvider.getUrl(key);
    return { url };
  }

  async findAll(filters: MediaFiltersDto, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.entityId) where.entityId = filters.entityId;
    if (filters.mediaType) where.mediaType = filters.mediaType;

    const [data, total] = await Promise.all([
      this.prisma.mediaAsset.findMany({
        where, skip, take: limit,
        orderBy: { serverTimestamp: 'desc' },
      }),
      this.prisma.mediaAsset.count({ where }),
    ]);
    return { data, meta: { page, limit, total } };
  }

  async findById(id: string) {
    const asset = await this.prisma.mediaAsset.findFirst({ where: { id } });
    if (!asset) throw new NotFoundException(`MediaAsset ${id} introuvable`);
    return asset;
  }

  // ─── Photo wrapper ─────────────────────────────────────────────────────────

  async createPhoto(dto: CreatePhotoDto, actor: User) {
    const asset = await this.prisma.mediaAsset.findFirst({
      where: { id: dto.mediaAssetId },
      include: { photo: true },
    });
    if (!asset) throw new NotFoundException('MediaAsset introuvable');
    if (asset.mediaType !== MediaType.PHOTO) {
      throw new BadRequestException("Le MediaAsset référencé n'est pas une photo");
    }
    if (asset.photo) {
      throw new BadRequestException('Ce MediaAsset est déjà lié à une Photo');
    }

    return this.prisma.photo.create({
      data: {
        mediaAssetId: dto.mediaAssetId,
        missionId: dto.missionId ?? null,
        inspectionId: dto.inspectionId ?? null,
        captureContext: dto.captureContext ?? null,
      },
      include: { mediaAsset: true },
    });
  }

  // ─── Photo Mission ─────────────────────────────────────────────────────────

  async createPhotoMission(dto: CreatePhotoMissionDto, actor: User) {
    const [vehicle, driver] = await Promise.all([
      this.prisma.vehicle.findFirst({ where: { id: dto.vehicleId } }),
      this.prisma.driver.findFirst({ where: { id: dto.driverId }, select: { id: true, userId: true } }),
    ]);
    if (!vehicle) throw new NotFoundException('Véhicule introuvable');
    if (!driver) throw new NotFoundException('Chauffeur introuvable');

    const mission = await this.prisma.photoMission.create({
      data: {
        vehicleId: dto.vehicleId,
        driverId: dto.driverId,
        type: dto.type,
        dueDate: new Date(dto.dueDate),
        incidentId: dto.incidentId ?? null,
      },
    });

    this.notificationsService
      .send({
        userId: driver.userId,
        type: NotificationType.PHOTO_MISSION_REQUIRED,
        title: 'Nouvelle mission photo',
        message: `Mission photo ${dto.type} requise avant le ${new Date(dto.dueDate).toLocaleDateString('fr-FR')}.`,
        priority: NotificationPriority.NORMAL,
        entityType: EntityTypes.VEHICLE,
        entityId: dto.vehicleId,
      })
      .catch(() => {});

    return mission;
  }

  async findPhotoMissions(filters: PhotoMissionFiltersDto, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (filters.vehicleId) where.vehicleId = filters.vehicleId;
    if (filters.driverId) where.driverId = filters.driverId;
    if (filters.status) where.status = filters.status;

    const [data, total] = await Promise.all([
      this.prisma.photoMission.findMany({
        where, skip, take: limit,
        include: { photos: { include: { mediaAsset: true } } },
        orderBy: { dueDate: 'asc' },
      }),
      this.prisma.photoMission.count({ where }),
    ]);
    return { data, meta: { page, limit, total } };
  }

  async findPhotoMissionById(id: string) {
    const mission = await this.prisma.photoMission.findFirst({
      where: { id },
      include: { photos: { include: { mediaAsset: true } } },
    });
    if (!mission) throw new NotFoundException(`Mission photo ${id} introuvable`);
    return mission;
  }

  async submitPhotoMission(id: string, dto: SubmitPhotoMissionDto, actor: User) {
    const mission = await this.prisma.photoMission.findFirst({ where: { id } });
    if (!mission) throw new NotFoundException('Mission introuvable');
    if (
      mission.status !== PhotoMissionStatus.PENDING &&
      mission.status !== PhotoMissionStatus.OVERDUE
    ) {
      throw new BadRequestException(`Mission ${mission.status} — impossible à soumettre`);
    }

    await this.prisma.photo.updateMany({
      where: { id: { in: dto.photoIds } },
      data: { missionId: id },
    });

    return this.prisma.photoMission.update({
      where: { id },
      data: { status: PhotoMissionStatus.SUBMITTED, completedAt: new Date() },
      include: { photos: { include: { mediaAsset: true } } },
    });
  }

  async validatePhotoMission(id: string, actor: User) {
    const mission = await this.prisma.photoMission.findFirst({ where: { id } });
    if (!mission) throw new NotFoundException('Mission introuvable');
    if (mission.status !== PhotoMissionStatus.SUBMITTED) {
      throw new BadRequestException('Mission non soumise — validation impossible');
    }

    return this.prisma.photoMission.update({
      where: { id },
      data: { status: PhotoMissionStatus.VALIDATED },
    });
  }

  // ─── Cron : rappels missions photo en retard ───────────────────────────────

  @Cron('0 10 * * *', { name: 'photo-mission-reminders' })
  async sendPhotoMissionReminders(): Promise<void> {
    const now = new Date();
    const overdue = await this.prisma.photoMission.findMany({
      where: { status: PhotoMissionStatus.PENDING, dueDate: { lt: now } },
      include: { driver: { select: { userId: true } } },
    });

    for (const mission of overdue) {
      await this.prisma.photoMission.update({
        where: { id: mission.id },
        data: {
          status: PhotoMissionStatus.OVERDUE,
          reminderCount: { increment: 1 },
          lastReminderAt: now,
        },
      });

      this.notificationsService
        .send({
          userId: mission.driver.userId,
          type: NotificationType.PHOTO_MISSION_OVERDUE,
          title: 'Mission photo en retard',
          message: `Votre mission photo ${mission.type} était due le ${mission.dueDate.toLocaleDateString('fr-FR')}.`,
          priority: NotificationPriority.HIGH,
          entityType: EntityTypes.VEHICLE,
          entityId: mission.vehicleId,
        })
        .catch(() => {});
    }

    if (overdue.length > 0) {
      this.logger.log(`${overdue.length} mission(s) photo marquée(s) OVERDUE`);
    }
  }
}
