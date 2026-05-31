import { Module } from '@nestjs/common';
import { SettlementsController } from './settlements.controller';

/** H-13 : module Settlements stub — 501 Not Implemented. Service non instancié jusqu'à Phase 3+. */
@Module({
  controllers: [SettlementsController],
})
export class SettlementsModule {}
