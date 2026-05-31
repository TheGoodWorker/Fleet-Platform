import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocumentExpiryService } from './document-expiry.service';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuditModule, NotificationsModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, DocumentExpiryService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
