import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { settlementsService } from './settlements.service';

@ApiTags('settlements')
@ApiBearerAuth('JWT')
@Controller('settlements')
export class settlementsController {
  constructor(private readonly service: settlementsService) {}

  @Get('health')
  health() {
    return { module: 'settlements', status: 'ready', phase: 'Phase 3+' };
  }
}
