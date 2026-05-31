import { Module } from '@nestjs/common';
import { settlementsController } from './settlements.controller';
import { settlementsService } from './settlements.service';

@Module({
  controllers: [settlementsController],
  providers: [settlementsService],
  exports: [settlementsService],
})
export class settlementsModule {}
