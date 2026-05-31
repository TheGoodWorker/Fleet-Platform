import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { tasksService } from './tasks.service';

@ApiTags('tasks')
@ApiBearerAuth('JWT')
@Controller('tasks')
export class tasksController {
  constructor(private readonly service: tasksService) {}

  @Get('health')
  health() {
    return { module: 'tasks', status: 'ready', phase: 'Phase 3+' };
  }
}
