import { Module } from '@nestjs/common';
import { accidentsController } from './accidents.controller';
import { accidentsService } from './accidents.service';

@Module({
  controllers: [accidentsController],
  providers: [accidentsService],
  exports: [accidentsService],
})
export class accidentsModule {}
