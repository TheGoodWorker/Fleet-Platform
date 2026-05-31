import { Module } from '@nestjs/common';
import { FuelController } from './fuel.controller';
import { FuelService } from './fuel.service';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuditModule, NotificationsModule],
  controllers: [FuelController],
  providers: [FuelService],
  exports: [FuelService],
})
export class FuelModule {}
