import { Module } from '@nestjs/common';
import { PromptsService } from './prompts.service';
import { PromptsController } from './prompts.controller';
import { AdminPromptsController } from './admin-prompts.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PromptsController, AdminPromptsController],
  providers: [PromptsService],
  exports: [PromptsService],
})
export class PromptsModule { }

