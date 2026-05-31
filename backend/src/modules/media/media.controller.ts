import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { mediaService } from './media.service';

@ApiTags('media')
@ApiBearerAuth('JWT')
@Controller('media')
export class mediaController {
  constructor(private readonly service: mediaService) {}

  @Get('health')
  health() {
    return { module: 'media', status: 'ready', phase: 'Phase 3+' };
  }
}
