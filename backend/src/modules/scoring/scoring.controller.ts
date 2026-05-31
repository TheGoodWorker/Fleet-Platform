import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { scoringService } from './scoring.service';

@ApiTags('scoring')
@ApiBearerAuth('JWT')
@Controller('scoring')
export class scoringController {
  constructor(private readonly service: scoringService) {}

  @Get('health')
  health() {
    return { module: 'scoring', status: 'ready', phase: 'Phase 3+' };
  }
}
