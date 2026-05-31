import { Module } from '@nestjs/common';
import { incidentsController } from './incidents.controller';
import { incidentsService } from './incidents.service';

@Module({
  controllers: [incidentsController],
  providers: [incidentsService],
  exports: [incidentsService],
})
export class incidentsModule {}
