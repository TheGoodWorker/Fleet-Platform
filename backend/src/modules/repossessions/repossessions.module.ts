import { Module } from '@nestjs/common';
import { RepossessionsController } from './repossessions.controller';
import { RepossessionsService } from './repossessions.service';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuditModule, NotificationsModule],
  controllers: [RepossessionsController],
  providers: [RepossessionsService],
  exports: [RepossessionsService],
})
export class RepossessionsModule {}
