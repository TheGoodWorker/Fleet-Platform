import { Module } from '@nestjs/common';
import { tasksController } from './tasks.controller';
import { tasksService } from './tasks.service';

@Module({
  controllers: [tasksController],
  providers: [tasksService],
  exports: [tasksService],
})
export class tasksModule {}
