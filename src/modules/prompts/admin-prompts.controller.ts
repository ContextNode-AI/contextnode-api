import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { PromptsService } from './prompts.service';
import { ReviewPromptDto } from './dto/review-prompt.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('admin/prompts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminPromptsController {
  constructor(private readonly promptsService: PromptsService) {}

  @Get('pending-review')
  findPendingReview() {
    return this.promptsService.findPendingReview();
  }

  @Patch(':id/review')
  reviewPrompt(
    @Param('id') id: string,
    @Body() reviewDto: ReviewPromptDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.promptsService.reviewPrompt(id, reviewDto, adminId);
  }

  @Patch(':id/featured')
  toggleFeatured(
    @Param('id') id: string,
    @Body('featured') featured?: boolean,
  ) {
    return this.promptsService.toggleFeatured(id, featured);
  }
}
