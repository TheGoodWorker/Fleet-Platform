import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TasksService } from './tasks.service';

@ApiTags('tasks')
@ApiBearerAuth('JWT')
@Controller('tasks')
export class TasksController {
  constructor(private readonly service: TasksService) {}

  @Get('health')
  health() {
    return { module: 'tasks', status: 'ready', phase: 'Phase 3+' };
  }
}
