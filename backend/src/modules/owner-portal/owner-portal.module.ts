import { Module } from '@nestjs/common';
import { OwnerPortalController } from './owner-portal.controller';
import { OwnerPortalService } from './owner-portal.service';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuditModule, NotificationsModule],
  controllers: [OwnerPortalController],
  providers: [OwnerPortalService],
  exports: [OwnerPortalService],
})
export class OwnerPortalModule {}
