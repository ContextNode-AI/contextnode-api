import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PromptsService } from './prompts.service';
import { CreateImagePromptDto } from './dto/create-image-prompt.dto';
import { UpdateImagePromptDto } from './dto/update-image-prompt.dto';
import { QueryPromptsDto } from './dto/query-prompts.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role, PromptType } from '@prisma/client';

@Controller('prompts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PromptsController {
  constructor(private readonly promptsService: PromptsService) {}

  @Post('creative/image')
  @Roles(Role.CREATOR, Role.ADMIN)
  createImagePrompt(
    @Body() createDto: CreateImagePromptDto,
    @CurrentUser('id') authorId: string,
  ) {
    return this.promptsService.createImagePrompt(createDto, authorId);
  }

  @Get('creative/image/my')
  @Roles(Role.CREATOR, Role.ADMIN)
  findMyPrompts(@CurrentUser('id') authorId: string) {
    return this.promptsService.findMyPrompts(authorId, PromptType.IMAGE);
  }

  @Get('creative/image/my/:id')
  @Roles(Role.CREATOR, Role.ADMIN)
  findMyPromptById(
    @Param('id') id: string,
    @CurrentUser('id') authorId: string,
  ) {
    return this.promptsService.findMyPromptById(id, authorId);
  }

  @Patch('creative/image/:id')
  @Roles(Role.CREATOR, Role.ADMIN)
  updateMyPrompt(
    @Param('id') id: string,
    @Body() updateDto: UpdateImagePromptDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.promptsService.updateMyPrompt(id, updateDto, user);
  }

  @Post('creative/image/:id/submit-review')
  @Roles(Role.CREATOR, Role.ADMIN)
  submitForReview(
    @Param('id') id: string,
    @CurrentUser('id') authorId: string,
  ) {
    return this.promptsService.submitForReview(id, authorId);
  }

  @Delete('creative/image/:id')
  @Roles(Role.CREATOR, Role.ADMIN)
  deleteMyPrompt(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.promptsService.deleteMyPrompt(id, user);
  }

  @Public()
  @Get('creative/image')
  findAllPublic(@Query() query: QueryPromptsDto) {
    return this.promptsService.findAllPublic(query);
  }

  @Public()
  @Get('creative/image/:slug')
  findOneBySlug(
    @Param('slug') slug: string,
    @CurrentUser('id') userId?: string,
  ) {
    return this.promptsService.findOneBySlug(slug, userId);
  }
}
