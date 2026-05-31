import { Module } from '@nestjs/common';
import { ContraventionsController } from './contraventions.controller';
import { ContraventionsService } from './contraventions.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [ContraventionsController],
  providers: [ContraventionsService],
  exports: [ContraventionsService],
})
export class ContraventionsModule {}
