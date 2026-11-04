import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient, Role, AccountStatus, SubscriptionPlan } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    let dbUrl = process.env.DATABASE_URL || '';
    if (dbUrl && !dbUrl.includes('schema=')) {
      dbUrl += (dbUrl.includes('?') ? '&' : '?') + 'schema=contextnode';
    }
    super({
      datasources: dbUrl ? { db: { url: dbUrl } } : undefined,
    });
  }

  async onModuleInit() {
    await this.$connect();
    await this.seedSuperAdmin();
  }

  private async seedSuperAdmin() {
    const adminEmail = '427rohitkumar@gmail.com';
    try {
      const existing = await this.user.findUnique({
        where: { email: adminEmail },
      });

      if (!existing) {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash('427rohit@', salt);
        await this.user.create({
          data: {
            email: adminEmail,
            name: 'Rohit Kumar (SuperAdmin)',
            passwordHash,
            role: Role.ADMIN,
            status: AccountStatus.ACTIVE,
            plan: SubscriptionPlan.PAID,
            bio: 'Platform Owner & Super Administrator',
          },
        });
        console.log(`[Seed] SuperAdmin auto-seeded in database: ${adminEmail}`);
      }
    } catch (err) {
      console.error('[Seed] Error checking/seeding SuperAdmin:', err);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
