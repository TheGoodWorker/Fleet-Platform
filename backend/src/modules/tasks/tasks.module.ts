import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';

/** H-13 : module Tasks stub — 501 Not Implemented. Service non instancié jusqu'à Phase 3+. */
@Module({
  controllers: [TasksController],
})
export class TasksModule {}
