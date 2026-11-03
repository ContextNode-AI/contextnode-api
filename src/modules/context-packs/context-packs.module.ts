import { Module } from '@nestjs/common';
import { ContextPacksService } from './context-packs.service';
import { ContextPacksController } from './context-packs.controller';

@Module({
  controllers: [ContextPacksController],
  providers: [ContextPacksService],
  exports: [ContextPacksService],
})
export class ContextPacksModule {}

