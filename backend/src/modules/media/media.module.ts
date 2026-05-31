import { Module } from '@nestjs/common';
import { mediaController } from './media.controller';
import { mediaService } from './media.service';

@Module({
  controllers: [mediaController],
  providers: [mediaService],
  exports: [mediaService],
})
export class mediaModule {}
