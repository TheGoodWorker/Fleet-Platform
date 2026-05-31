import { Module } from '@nestjs/common';
import { SpecialAbsencesController } from './special-absences.controller';
import { SpecialAbsencesService } from './special-absences.service';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AvailabilityModule } from '../availability/availability.module';

@Module({
  imports: [AuditModule, NotificationsModule, AvailabilityModule],
  controllers: [SpecialAbsencesController],
  providers: [SpecialAbsencesService],
  exports: [SpecialAbsencesService],
})
export class SpecialAbsencesModule {}
