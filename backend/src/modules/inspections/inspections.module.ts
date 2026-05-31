import { Module } from '@nestjs/common';
import { inspectionsController } from './inspections.controller';
import { inspectionsService } from './inspections.service';

@Module({
  controllers: [inspectionsController],
  providers: [inspectionsService],
  exports: [inspectionsService],
})
export class inspectionsModule {}
