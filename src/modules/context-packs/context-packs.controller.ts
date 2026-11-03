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
import { ContextPacksService } from './context-packs.service';
import { CreateContextPackDto } from './dto/create-context-pack.dto';
import { UpdateContextPackDto } from './dto/update-context-pack.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AssetStatus, Role } from '@prisma/client';

@Controller('context-packs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ContextPacksController {
  constructor(private readonly contextPacksService: ContextPacksService) {}

  @Post()
  @Roles(Role.CREATOR, Role.ADMIN)
  create(
    @Body() createDto: CreateContextPackDto,
    @CurrentUser('id') authorId: string,
  ) {
    return this.contextPacksService.create(createDto, authorId);
  }

  @Public()
  @Get()
  findAll(@Query('status') status?: AssetStatus, @Query('tool') tool?: string) {
    return this.contextPacksService.findAll(status, tool);
  }

  @Public()
  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.contextPacksService.findOneBySlug(slug);
  }

  @Patch(':id')
  @Roles(Role.CREATOR, Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateContextPackDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.contextPacksService.update(id, updateDto, user);
  }

  @Delete(':id')
  @Roles(Role.CREATOR, Role.ADMIN)
  remove(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.contextPacksService.remove(id, user);
  }

  @Public()
  @Post(':id/download')
  incrementDownloads(@Param('id') id: string) {
    return this.contextPacksService.incrementDownloads(id);
  }
}
