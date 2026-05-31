import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationType, NotificationPriority, UserRole } from '@prisma/client';

export interface CreateNotificationDto {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  entityType?: string;
  entityId?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  constructor(private prisma: PrismaService) {}

  async send(dto: CreateNotificationDto): Promise<void> {
    try {
      const user = await this.prisma.user.findFirst({ where: { id: dto.userId }, select: { role: true, fcmToken: true } });
      if (!user) return;
      const priority = dto.priority ?? NotificationPriority.NORMAL;
      if (user.role === UserRole.ADMIN && !['HIGH', 'CRITICAL'].includes(priority)) return;
      await this.prisma.notification.create({
        data: { userId: dto.userId, type: dto.type, title: dto.title, message: dto.message, priority, entityType: dto.entityType, entityId: dto.entityId },
      });
      if (user.fcmToken) this.logger.debug('FCM Phase 3: ' + dto.userId);
    } catch (error) {
      this.logger.error('Échec envoi notification', error);
    }
  }

  async findForUser(userId: string, page = 1, limit = 20, unreadOnly = false) {
    const skip = (page - 1) * limit;
    const where: any = { userId };
    if (unreadOnly) where.readAt = null;
    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.notification.count({ where }),
    ]);
    return { data, meta: { page, limit, total } };
  }

  async markAsRead(id: string, userId: string) {
    const notif = await this.prisma.notification.findFirst({ where: { id, userId } });
    if (!notif) throw new NotFoundException('Notification introuvable');
    return this.prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
    return { message: 'Toutes les notifications marquées comme lues' };
  }

  async countUnread(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, readAt: null } });
  }
}
