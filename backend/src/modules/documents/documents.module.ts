import { Module } from '@nestjs/common';
import { documentsController } from './documents.controller';
import { documentsService } from './documents.service';

@Module({
  controllers: [documentsController],
  providers: [documentsService],
  exports: [documentsService],
})
export class documentsModule {}
