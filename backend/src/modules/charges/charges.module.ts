import { Module } from '@nestjs/common';
import { ChargesController } from './charges.controller';
import { ChargesService } from './charges.service';
import { DailyEntriesModule } from '../daily-entries/daily-entries.module';
import { LedgerModule } from '../ledger/ledger.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [DailyEntriesModule, LedgerModule, AuditModule, NotificationsModule],
  controllers: [ChargesController],
  providers: [ChargesService],
  exports: [ChargesService],
})
export class ChargesModule {}
