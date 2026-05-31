import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ScoringService } from './scoring.service';

@ApiTags('scoring')
@ApiBearerAuth('JWT')
@Controller('scoring')
export class ScoringController {
  constructor(private readonly service: ScoringService) {}

  @Get('health')
  health() {
    return { module: 'scoring', status: 'ready', phase: 'Phase 4' };
  }
}
