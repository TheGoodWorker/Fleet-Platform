import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { accidentsService } from './accidents.service';

@ApiTags('accidents')
@ApiBearerAuth('JWT')
@Controller('accidents')
export class accidentsController {
  constructor(private readonly service: accidentsService) {}

  @Get('health')
  health() {
    return { module: 'accidents', status: 'ready', phase: 'Phase 3+' };
  }
}
