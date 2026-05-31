import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@Module({
  controllers: [PermissionsController],
  providers: [
    PermissionsService,
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
  exports: [PermissionsService],
})
export class PermissionsModule {}
