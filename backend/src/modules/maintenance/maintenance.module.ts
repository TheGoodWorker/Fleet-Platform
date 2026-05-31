import { Module } from '@nestjs/common';
import { maintenanceController } from './maintenance.controller';
import { maintenanceService } from './maintenance.service';

@Module({
  controllers: [maintenanceController],
  providers: [maintenanceService],
  exports: [maintenanceService],
})
export class maintenanceModule {}
