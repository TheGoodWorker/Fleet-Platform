import { Module } from '@nestjs/common';
import { ImmobilizationsController } from './immobilizations.controller';
import { ImmobilizationsService } from './immobilizations.service';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AvailabilityModule } from '../availability/availability.module';

@Module({
  imports: [AuditModule, NotificationsModule, AvailabilityModule],
  controllers: [ImmobilizationsController],
  providers: [ImmobilizationsService],
  exports: [ImmobilizationsService],
})
export class ImmobilizationsModule {}
