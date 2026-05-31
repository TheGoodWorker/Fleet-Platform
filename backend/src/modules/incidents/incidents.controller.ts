import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { incidentsService } from './incidents.service';

@ApiTags('incidents')
@ApiBearerAuth('JWT')
@Controller('incidents')
export class incidentsController {
  constructor(private readonly service: incidentsService) {}

  @Get('health')
  health() {
    return { module: 'incidents', status: 'ready', phase: 'Phase 3+' };
  }
}
