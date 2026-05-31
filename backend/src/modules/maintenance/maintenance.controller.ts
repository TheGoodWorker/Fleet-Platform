import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { maintenanceService } from './maintenance.service';

@ApiTags('maintenance')
@ApiBearerAuth('JWT')
@Controller('maintenance')
export class maintenanceController {
  constructor(private readonly service: maintenanceService) {}

  @Get('health')
  health() {
    return { module: 'maintenance', status: 'ready', phase: 'Phase 3+' };
  }
}
