import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateImagePromptDto } from './dto/create-image-prompt.dto';
import { UpdateImagePromptDto } from './dto/update-image-prompt.dto';
import { ReviewPromptDto, ReviewAction } from './dto/review-prompt.dto';
import { QueryPromptsDto } from './dto/query-prompts.dto';
import {
  AssetStatus,
  PromptFamily,
  PromptType,
  Prisma,
  Role,
} from '@prisma/client';

@Injectable()
export class PromptsService {
  constructor(private prisma: PrismaService) { }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private async ensureUniqueSlug(baseSlug: string): Promise<string> {
    let slug = baseSlug;
    let counter = 1;
    while (true) {
      const existing = await this.prisma.prompt.findUnique({
        where: { slug },
      });
      if (!existing) {
        return slug;
      }
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  async createImagePrompt(createDto: CreateImagePromptDto, authorId: string) {
    const rawSlug = createDto.slug?.trim() || this.generateSlug(createDto.title);
    const slug = await this.ensureUniqueSlug(rawSlug);

    const { variations, status, ...restData } = createDto;

    // Creators can start as DRAFT or submit directly as PENDING_REVIEW
    const initialStatus =
      status === AssetStatus.PENDING_REVIEW
        ? AssetStatus.PENDING_REVIEW
        : AssetStatus.DRAFT;

    return this.prisma.prompt.create({
      data: {
        ...restData,
        slug,
        promptFamily: PromptFamily.CREATIVE,
        promptType: PromptType.IMAGE,
        status: initialStatus,
        authorId,
        tags: restData.tags || [],
        variations: variations?.length
          ? {
            create: variations.map((v, index) => ({
              title: v.title,
              description: v.description,
              prompt: v.prompt,
              previewImageUrl: v.previewImageUrl,
              orderIndex: v.orderIndex ?? index,
            })),
          }
          : undefined,
      },
      include: {
        variations: {
          orderBy: { orderIndex: 'asc' },
        },
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });
  }

  async findAllPublic(query: QueryPromptsDto) {
    const where: Prisma.PromptWhereInput = {
      status: AssetStatus.PUBLISHED,
      promptFamily: query.family || PromptFamily.CREATIVE,
      promptType: query.type || PromptType.IMAGE,
    };

    if (query.category) {
      where.category = {
        equals: query.category,
        mode: 'insensitive',
      };
    }

    if (query.tool) {
      where.aiTool = {
        equals: query.tool,
        mode: 'insensitive',
      };
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { shortDescription: { contains: query.search, mode: 'insensitive' } },
        { prompt: { contains: query.search, mode: 'insensitive' } },
        { tags: { has: query.search.toLowerCase().trim() } },
      ];
    }

    return this.prisma.prompt.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        variations: {
          orderBy: { orderIndex: 'asc' },
        },
      },
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOneBySlug(slug: string, userId?: string) {
    const prompt = await this.prisma.prompt.findUnique({
      where: { slug },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        variations: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!prompt) {
      throw new NotFoundException(`Prompt with slug "${slug}" not found`);
    }

    // If prompt is not published, only the author or an admin can view it
    if (prompt.status !== AssetStatus.PUBLISHED) {
      if (!userId) {
        throw new NotFoundException(`Prompt with slug "${slug}" not found`);
      }
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user || (user.id !== prompt.authorId && user.role !== Role.ADMIN)) {
        throw new NotFoundException(`Prompt with slug "${slug}" not found`);
      }
    }

    // Increment views count asynchronously
    await this.prisma.prompt.update({
      where: { id: prompt.id },
      data: { viewsCount: { increment: 1 } },
    });

    return prompt;
  }

  async findMyPrompts(authorId: string, type?: PromptType) {
    const where: Prisma.PromptWhereInput = {
      authorId,
    };

    if (type) {
      where.promptType = type;
    }

    return this.prisma.prompt.findMany({
      where,
      include: {
        variations: {
          orderBy: { orderIndex: 'asc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findMyPromptById(id: string, authorId: string) {
    const prompt = await this.prisma.prompt.findUnique({
      where: { id },
      include: {
        variations: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!prompt) {
      throw new NotFoundException(`Prompt with ID "${id}" not found`);
    }

    if (prompt.authorId !== authorId) {
      throw new ForbiddenException(`You are not authorized to view this prompt`);
    }

    return prompt;
  }

  async updateMyPrompt(
    id: string,
    updateDto: UpdateImagePromptDto,
    user: { id: string; role: Role },
  ) {
    const prompt = await this.prisma.prompt.findUnique({
      where: { id },
      include: { variations: true },
    });

    if (!prompt) {
      throw new NotFoundException(`Prompt with ID "${id}" not found`);
    }

    const isAdmin = user.role === Role.ADMIN;
    if (prompt.authorId !== user.id && !isAdmin) {
      throw new ForbiddenException(
        `You are not authorized to modify this prompt`,
      );
    }

    // Creators cannot edit while in PENDING_REVIEW unless admin
    if (prompt.status === AssetStatus.PENDING_REVIEW && !isAdmin) {
      throw new BadRequestException(
        'Asset is currently pending admin review. You cannot edit it until review is complete.',
      );
    }

    const { variations, ...restData } = updateDto;

    // Handle slug uniqueness if slug changed
    let slug = prompt.slug;
    if (updateDto.slug && updateDto.slug !== prompt.slug) {
      slug = await this.ensureUniqueSlug(updateDto.slug);
    }

    return this.prisma.$transaction(async (tx) => {
      if (variations !== undefined) {
        // Replace existing variations
        await tx.promptVariation.deleteMany({
          where: { promptId: id },
        });

        if (variations.length > 0) {
          await tx.promptVariation.createMany({
            data: variations.map((v, index) => ({
              promptId: id,
              title: v.title,
              description: v.description,
              prompt: v.prompt,
              previewImageUrl: v.previewImageUrl,
              orderIndex: v.orderIndex ?? index,
            })),
          });
        }
      }

      return tx.prompt.update({
        where: { id },
        data: {
          ...restData,
          slug,
        },
        include: {
          variations: {
            orderBy: { orderIndex: 'asc' },
          },
        },
      });
    });
  }

  async submitForReview(id: string, authorId: string) {
    const prompt = await this.prisma.prompt.findUnique({
      where: { id },
    });

    if (!prompt) {
      throw new NotFoundException(`Prompt with ID "${id}" not found`);
    }

    if (prompt.authorId !== authorId) {
      throw new ForbiddenException(
        `You are not authorized to submit this prompt`,
      );
    }

    if (prompt.status === AssetStatus.PENDING_REVIEW) {
      throw new BadRequestException('Prompt is already submitted for review');
    }

    if (prompt.status === AssetStatus.PUBLISHED) {
      throw new BadRequestException('Prompt is already published');
    }

    // Validate completeness
    if (!prompt.title || !prompt.shortDescription || !prompt.prompt) {
      throw new BadRequestException(
        'Prompt must have a title, short description, and main prompt text to submit for review',
      );
    }

    return this.prisma.prompt.update({
      where: { id },
      data: {
        status: AssetStatus.PENDING_REVIEW,
        adminFeedback: null,
      },
    });
  }

  async deleteMyPrompt(
    id: string,
    user: { id: string; role: Role },
  ) {
    const prompt = await this.prisma.prompt.findUnique({
      where: { id },
    });

    if (!prompt) {
      throw new NotFoundException(`Prompt with ID "${id}" not found`);
    }

    const isAdmin = user.role === Role.ADMIN;
    if (prompt.authorId !== user.id && !isAdmin) {
      throw new ForbiddenException(
        `You are not authorized to delete this prompt`,
      );
    }

    await this.prisma.prompt.delete({
      where: { id },
    });

    return { success: true, message: 'Prompt deleted successfully' };
  }

  // Admin Operations
  async findPendingReview() {
    return this.prisma.prompt.findMany({
      where: {
        status: AssetStatus.PENDING_REVIEW,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        variations: {
          orderBy: { orderIndex: 'asc' },
        },
      },
      orderBy: { updatedAt: 'asc' },
    });
  }

  async reviewPrompt(
    id: string,
    reviewDto: ReviewPromptDto,
    adminId: string,
  ) {
    const prompt = await this.prisma.prompt.findUnique({
      where: { id },
    });

    if (!prompt) {
      throw new NotFoundException(`Prompt with ID "${id}" not found`);
    }

    if (reviewDto.action === ReviewAction.APPROVE) {
      return this.prisma.prompt.update({
        where: { id },
        data: {
          status: AssetStatus.PUBLISHED,
          reviewedById: adminId,
          reviewedAt: new Date(),
          adminFeedback: reviewDto.feedback || null,
        },
      });
    } else {
      return this.prisma.prompt.update({
        where: { id },
        data: {
          status: AssetStatus.REJECTED,
          reviewedById: adminId,
          reviewedAt: new Date(),
          adminFeedback:
            reviewDto.feedback || 'Changes requested by ContextNode admin team',
        },
      });
    }
  }

  async toggleFeatured(id: string, featured?: boolean) {
    const prompt = await this.prisma.prompt.findUnique({
      where: { id },
    });

    if (!prompt) {
      throw new NotFoundException(`Prompt with ID "${id}" not found`);
    }

    const nextFeatured =
      featured !== undefined ? featured : !prompt.featured;

    return this.prisma.prompt.update({
      where: { id },
      data: { featured: nextFeatured },
    });
  }
}

