import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { inspectionsService } from './inspections.service';

@ApiTags('inspections')
@ApiBearerAuth('JWT')
@Controller('inspections')
export class inspectionsController {
  constructor(private readonly service: inspectionsService) {}

  @Get('health')
  health() {
    return { module: 'inspections', status: 'ready', phase: 'Phase 3+' };
  }
}
