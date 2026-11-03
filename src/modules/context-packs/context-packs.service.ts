import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateContextPackDto } from './dto/create-context-pack.dto';
import { UpdateContextPackDto } from './dto/update-context-pack.dto';
import { AssetStatus, Role, Prisma } from '@prisma/client';

@Injectable()
export class ContextPacksService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateContextPackDto, authorId: string) {
    const existing = await this.prisma.contextPack.findUnique({
      where: { slug: createDto.slug.toLowerCase().trim() },
    });

    if (existing) {
      throw new ConflictException(
        `Context Pack with slug "${createDto.slug}" already exists`,
      );
    }

    const { validationGates, files, ...packData } = createDto;

    return this.prisma.contextPack.create({
      data: {
        ...packData,
        slug: packData.slug.toLowerCase().trim(),
        authorId,
        validationGates: validationGates?.length
          ? {
              create: validationGates.map((g) => ({
                gate: g.gate,
                enabled: g.enabled ?? true,
              })),
            }
          : undefined,
        files: files?.length
          ? {
              create: files.map((f) => ({
                path: f.path,
                description: f.description,
                fileType: f.fileType || 'markdown',
                content: f.content,
              })),
            }
          : undefined,
      },
      include: {
        validationGates: true,
        files: true,
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

  async findAll(status?: AssetStatus, tool?: string) {
    const where: Prisma.ContextPackWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (tool) {
      where.supportedTools = {
        has: tool,
      };
    }

    return this.prisma.contextPack.findMany({
      where,
      include: {
        validationGates: true,
        files: {
          select: {
            id: true,
            path: true,
            description: true,
            fileType: true,
          },
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
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneBySlug(slug: string) {
    const pack = await this.prisma.contextPack.findUnique({
      where: { slug: slug.toLowerCase().trim() },
      include: {
        validationGates: true,
        files: true,
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

    if (!pack) {
      throw new NotFoundException(`Context Pack "${slug}" not found`);
    }

    return pack;
  }

  async findOneById(id: string) {
    const pack = await this.prisma.contextPack.findUnique({
      where: { id },
      include: {
        validationGates: true,
        files: true,
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

    if (!pack) {
      throw new NotFoundException(`Context Pack with ID "${id}" not found`);
    }

    return pack;
  }

  async update(
    id: string,
    updateDto: UpdateContextPackDto,
    currentUser: { id: string; role: Role },
  ) {
    const existing = await this.findOneById(id);

    if (
      currentUser.role !== Role.ADMIN &&
      existing.authorId !== currentUser.id
    ) {
      throw new ForbiddenException(
        'You do not have permission to edit this Context Pack',
      );
    }

    const { validationGates, files, ...packData } = updateDto;

    return this.prisma.$transaction(async (tx) => {
      if (validationGates) {
        await tx.validationGate.deleteMany({ where: { contextPackId: id } });
        await tx.validationGate.createMany({
          data: validationGates.map((g) => ({
            contextPackId: id,
            gate: g.gate,
            enabled: g.enabled ?? true,
          })),
        });
      }

      if (files) {
        await tx.packFile.deleteMany({ where: { contextPackId: id } });
        await tx.packFile.createMany({
          data: files.map((f) => ({
            contextPackId: id,
            path: f.path,
            description: f.description,
            fileType: f.fileType || 'markdown',
            content: f.content,
          })),
        });
      }

      return tx.contextPack.update({
        where: { id },
        data: packData,
        include: {
          validationGates: true,
          files: true,
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
    });
  }

  async remove(id: string, currentUser: { id: string; role: Role }) {
    const existing = await this.findOneById(id);

    if (
      currentUser.role !== Role.ADMIN &&
      existing.authorId !== currentUser.id
    ) {
      throw new ForbiddenException(
        'You do not have permission to delete this Context Pack',
      );
    }

    return this.prisma.contextPack.delete({
      where: { id },
    });
  }

  async incrementDownloads(id: string) {
    return this.prisma.contextPack.update({
      where: { id },
      data: {
        downloadsCount: {
          increment: 1,
        },
      },
    });
  }
}
