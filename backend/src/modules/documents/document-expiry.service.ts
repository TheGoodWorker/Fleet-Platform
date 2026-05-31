import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  DocumentStatus, NotificationType, NotificationPriority, UserRole,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EntityTypes } from '../../common/constants/entity-types';

/**
 * Service de surveillance des expirations documentaires.
 *
 * Règles (R-22, R-23) :
 * - Rappels envoyés à 30j, 15j, 7j, 1j — une seule fois chacun
 * - Document expiré critique → notifie l'Admin (priority = HIGH)
 * - `notifyOwner = true` → envoie aussi la notification au propriétaire du véhicule
 * - `expiryNotifiedAt` mis à jour pour éviter les doublons
 */
@Injectable()
export class DocumentExpiryService {
  private readonly logger = new Logger(DocumentExpiryService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  @Cron('0 8 * * *', { name: 'document-expiry-check' })
  async checkDocumentExpiry(): Promise<void> {
    this.logger.log('Vérification expirations documents...');
    const now = new Date();

    // Documents non-archivés et non-permanently-valid
    const documents = await this.prisma.document.findMany({
      where: {
        alwaysValid: false,
        status: { not: DocumentStatus.ARCHIVED },
        validUntil: { not: null },
      },
    });

    let reminderCount = 0;
    let expiryCount = 0;

    for (const doc of documents) {
      if (!doc.validUntil) continue;

      const daysLeft = Math.ceil(
        (doc.validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Mise à jour du statut si nécessaire
      let newStatus: DocumentStatus | null = null;
      if (daysLeft < 0 && doc.status !== DocumentStatus.EXPIRED) {
        newStatus = DocumentStatus.EXPIRED;
        expiryCount++;
      } else if (daysLeft >= 0 && daysLeft <= 30 && doc.status === DocumentStatus.VALID) {
        newStatus = DocumentStatus.EXPIRING_SOON;
      }

      if (newStatus) {
        await this.prisma.document.update({ where: { id: doc.id }, data: { status: newStatus } });
      }

      // Vérifier quels rappels doivent être envoyés
      const reminders: Array<{
        days: number;
        field: 'reminder30SentAt' | 'reminder15SentAt' | 'reminder7SentAt' | 'reminder1SentAt';
        alreadySent: Date | null;
      }> = [
        { days: 30, field: 'reminder30SentAt', alreadySent: doc.reminder30SentAt },
        { days: 15, field: 'reminder15SentAt', alreadySent: doc.reminder15SentAt },
        { days: 7,  field: 'reminder7SentAt',  alreadySent: doc.reminder7SentAt  },
        { days: 1,  field: 'reminder1SentAt',  alreadySent: doc.reminder1SentAt  },
      ];

      for (const r of reminders) {
        if (daysLeft <= r.days && daysLeft >= 0 && !r.alreadySent) {
          await this.sendExpiryReminder(doc, daysLeft, r.days);
          await this.prisma.document.update({
            where: { id: doc.id },
            data: {
              [r.field]: now,
              expiryNotifiedAt: now,
            },
          });
          reminderCount++;
        }
      }

      // Document expiré critique → notifier Admin
      if (daysLeft < 0 && doc.isCritical) {
        await this.sendCriticalExpiryAlert(doc);
        await this.prisma.document.update({
          where: { id: doc.id },
          data: { expiryNotifiedAt: now },
        });
      }
    }

    if (reminderCount > 0 || expiryCount > 0) {
      this.logger.log(
        `Documents : ${expiryCount} expirés, ${reminderCount} rappel(s) envoyé(s)`,
      );
    }
  }

  private async sendExpiryReminder(doc: any, daysLeft: number, threshold: number): Promise<void> {
    // Trouver les managers et super managers responsables de l'entité
    const recipients = await this.getDocumentRecipients(doc);

    const message =
      daysLeft === 0
        ? `Le document "${doc.title ?? doc.type}" pour l'entité ${doc.entityId} expire aujourd'hui.`
        : `Le document "${doc.title ?? doc.type}" pour l'entité ${doc.entityId} expire dans ${daysLeft} jour(s).`;

    for (const userId of recipients.staffIds) {
      this.notificationsService
        .send({
          userId,
          type: NotificationType.DOCUMENT_EXPIRING_SOON,
          title: `Document expirant dans ${daysLeft} jour(s)`,
          message,
          priority: daysLeft <= 7 ? NotificationPriority.HIGH : NotificationPriority.NORMAL,
          entityType: doc.entityType,
          entityId: doc.entityId,
        })
        .catch(() => {});
    }

    // Notifier le propriétaire si configuré (R-22)
    if (doc.notifyOwner && recipients.ownerUserId) {
      this.notificationsService
        .send({
          userId: recipients.ownerUserId,
          type: NotificationType.OWNER_DOCUMENT_EXPIRING_SOON,
          title: `Document véhicule expirant`,
          message,
          priority: NotificationPriority.NORMAL,
          entityType: doc.entityType,
          entityId: doc.entityId,
        })
        .catch(() => {});
    }
  }

  private async sendCriticalExpiryAlert(doc: any): Promise<void> {
    // Trouver l'Admin
    const admins = await this.prisma.user.findMany({
      where: { role: UserRole.ADMIN, status: 'ACTIVE', deletedAt: null },
      select: { id: true },
    });

    for (const admin of admins) {
      this.notificationsService
        .send({
          userId: admin.id,
          type: NotificationType.DOCUMENT_EXPIRED,
          title: 'Document critique expiré',
          message: `[CRITIQUE] Le document "${doc.title ?? doc.type}" (entité ${doc.entityId}) est expiré.`,
          priority: NotificationPriority.HIGH,
          entityType: doc.entityType,
          entityId: doc.entityId,
        })
        .catch(() => {});
    }

    // Notifier le propriétaire si configuré
    const recipients = await this.getDocumentRecipients(doc);
    if (doc.notifyOwner && recipients.ownerUserId) {
      this.notificationsService
        .send({
          userId: recipients.ownerUserId,
          type: NotificationType.OWNER_DOCUMENT_EXPIRED,
          title: 'Document véhicule expiré',
          message: `Un document critique de votre véhicule a expiré.`,
          priority: NotificationPriority.HIGH,
          entityType: doc.entityType,
          entityId: doc.entityId,
        })
        .catch(() => {});
    }
  }

  /**
   * Récupère les IDs des utilisateurs à notifier selon l'entité du document.
   */
  private async getDocumentRecipients(doc: any): Promise<{
    staffIds: string[];
    ownerUserId: string | null;
  }> {
    const staffIds: string[] = [];
    let ownerUserId: string | null = null;

    try {
      if (doc.entityType === 'VEHICLE') {
        const vehicle = await this.prisma.vehicle.findFirst({
          where: { id: doc.entityId },
          select: {
            currentManagerId: true,
            owner: { select: { user: { select: { id: true } } } },
          },
        });
        if (vehicle?.currentManagerId) staffIds.push(vehicle.currentManagerId);
        ownerUserId = vehicle?.owner?.user?.id ?? null;

      } else if (doc.entityType === 'DRIVER') {
        const driver = await this.prisma.driver.findFirst({
          where: { id: doc.entityId },
          select: { userId: true },
        });
        if (driver) staffIds.push(driver.userId);

      } else if (doc.entityType === 'CONTRACT') {
        const contract = await this.prisma.contract.findFirst({
          where: { id: doc.entityId },
          select: { managerId: true },
        });
        if (contract?.managerId) staffIds.push(contract.managerId);
      }

      // Ajouter les Super Managers (toujours alertés)
      const superManagers = await this.prisma.user.findMany({
        where: { role: UserRole.SUPER_MANAGER, status: 'ACTIVE', deletedAt: null },
        select: { id: true },
        take: 5,
      });
      staffIds.push(...superManagers.map((u) => u.id));
    } catch (err) {
      this.logger.error('Erreur récupération destinataires document', err);
    }

    return { staffIds: [...new Set(staffIds)], ownerUserId };
  }
}
