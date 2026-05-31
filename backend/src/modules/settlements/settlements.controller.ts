import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SettlementsService } from './settlements.service';

@ApiTags('settlements')
@ApiBearerAuth('JWT')
@Controller('settlements')
export class SettlementsController {
  constructor(private readonly service: SettlementsService) {}

  @Get('health')
  health() {
    return { module: 'settlements', status: 'ready', phase: 'Phase 3+' };
  }
}
