import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { documentsService } from './documents.service';

@ApiTags('documents')
@ApiBearerAuth('JWT')
@Controller('documents')
export class documentsController {
  constructor(private readonly service: documentsService) {}

  @Get('health')
  health() {
    return { module: 'documents', status: 'ready', phase: 'Phase 3+' };
  }
}
