import { Module } from '@nestjs/common';
import { scoringController } from './scoring.controller';
import { scoringService } from './scoring.service';

@Module({
  controllers: [scoringController],
  providers: [scoringService],
  exports: [scoringService],
})
export class scoringModule {}
