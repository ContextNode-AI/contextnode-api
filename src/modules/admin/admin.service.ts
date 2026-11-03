import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { Role, AccountStatus, SubscriptionPlan, AssetStatus, Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getOverview() {
    const [
      totalUsers,
      totalCreators,
      totalAdmins,
      totalPrompts,
      pendingPrompts,
      publishedPrompts,
      recentPending,
      recentUsers,
      viewsAggregate,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: Role.CREATOR } }),
      this.prisma.user.count({ where: { role: Role.ADMIN } }),
      this.prisma.prompt.count(),
      this.prisma.prompt.count({ where: { status: AssetStatus.PENDING_REVIEW } }),
      this.prisma.prompt.count({ where: { status: AssetStatus.PUBLISHED } }),
      this.prisma.prompt.findMany({
        where: { status: AssetStatus.PENDING_REVIEW },
        take: 5,
        orderBy: { updatedAt: 'asc' },
        include: {
          author: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      this.prisma.user.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.prompt.aggregate({
        _sum: { viewsCount: true },
      }),
    ]);

    return {
      metrics: {
        totalUsers,
        totalCreators,
        totalAdmins,
        totalPrompts,
        pendingPrompts,
        publishedPrompts,
        totalViews: viewsAggregate._sum.viewsCount || 0,
      },
      recentPending,
      recentUsers,
    };
  }

  async getUsers(filter?: { role?: Role; status?: AccountStatus; search?: string }) {
    const where: Prisma.UserWhereInput = {};

    if (filter?.role) {
      where.role = filter.role;
    }

    if (filter?.status) {
      where.status = filter.status;
    }

    if (filter?.search) {
      where.OR = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { email: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const users = await this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        plan: true,
        avatar: true,
        bio: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            prompts: true,
            contextPacks: true,
          },
        },
      },
    });

    return users.map((u) => ({
      ...u,
      promptsCount: u._count.prompts,
      contextPacksCount: u._count.contextPacks,
    }));
  }

  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            prompts: true,
            contextPacks: true,
          },
        },
        prompts: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  async updateUserStatus(id: string, status: AccountStatus, currentAdminId: string) {
    if (id === currentAdminId) {
      throw new BadRequestException('You cannot change your own account status.');
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    return this.prisma.user.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    });
  }

  async createStaffUser(dto: CreateStaffDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new ConflictException(`User with email "${dto.email}" already exists`);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const staffUser = await this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email: dto.email.toLowerCase().trim(),
        passwordHash,
        role: dto.role || Role.ADMIN,
        status: AccountStatus.ACTIVE,
        plan: SubscriptionPlan.PAID,
        bio: 'ContextNode Staff / Administrator',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    return staffUser;
  }
}

