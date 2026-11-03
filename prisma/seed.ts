import { PrismaClient, Role, AccountStatus, SubscriptionPlan, AssetStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting ContextNode database seeding in common-postgres...');

  // 1. Seed SuperAdmin
  const adminEmail = '427rohitkumar@gmail.com';
  let admin = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!admin) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('427rohit@', salt);

    admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        name: 'Rohit Kumar',
        role: Role.ADMIN,
        status: AccountStatus.ACTIVE,
        plan: SubscriptionPlan.PAID,
        bio: 'ContextNode Platform Owner & Super Administrator',
      },
    });
    console.log(`✓ Created SuperAdmin: ${adminEmail}`);
  } else {
    console.log(`ℹ SuperAdmin already exists: ${adminEmail}`);
  }

  // 2. Seed Creator
  const creatorEmail = 'creator@contextnode.ai';
  let creator = await prisma.user.findUnique({ where: { email: creatorEmail } });

  if (!creator) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('CreatorPass2026!', salt);

    creator = await prisma.user.create({
      data: {
        email: creatorEmail,
        passwordHash,
        name: 'Vercel Wizard',
        role: Role.CREATOR,
        status: AccountStatus.ACTIVE,
        plan: SubscriptionPlan.PAID,
        bio: 'Next.js & React 19 Core Engineering Specialist',
      },
    });
    console.log(`✓ Created Creator: ${creatorEmail}`);
  }

  // 3. Seed Sample Context Pack (Next.js 15 App Router & React 19)
  const packSlug = 'nextjs-15-app-router';
  const existingPack = await prisma.contextPack.findUnique({ where: { slug: packSlug } });

  if (!existingPack) {
    await prisma.contextPack.create({
      data: {
        slug: packSlug,
        title: 'Next.js 15 App Router & React 19 Core Pack',
        shortDescription: 'Full routing, Server Actions, suspense hydration, and core APIs references optimized for AI agent context windows.',
        fullDescription: 'Production-grade Context Pack containing rules, schema patterns, and blueprints for building with Next.js 15 and React 19.',
        packVersion: 'v1.0.0',
        schemaUri: 'contextnode.pack://v1.0/nextjs-15-app-router',
        targetPersona: 'autonomous-agent',
        systemPrompt: 'You are an elite Next.js 15 fullstack engineer specializing in Server Actions, React 19 Server Components, and Partial Prerendering.',
        goldenRules: '1. Always use Server Actions for mutations.\n2. Keep client components at the leaves of the render tree.\n3. Validate all inputs with Zod.',
        negativeConstraints: '1. Never mix server-only secrets into client bundles.\n2. Do not use legacy Pages Router patterns.',
        supportedTools: ['cursor', 'windsurf', 'claude-code', 'copilot'],
        status: AssetStatus.PUBLISHED,
        downloadsCount: 1240,
        rating: 4.9,
        authorId: creator.id,
        validationGates: {
          create: [
            { gate: 'Next.js 15 build validation check', enabled: true },
            { gate: 'ESLint Flat Config pass', enabled: true },
            { gate: 'TypeScript strict mode compilation', enabled: true },
          ],
        },
        files: {
          create: [
            {
              path: 'next.config.ts',
              description: 'Next.js 15 configuration with Partial Prerendering',
              fileType: 'typescript',
              content: `import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    ppr: true,
    dynamicIO: true,
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;`,
            },
            {
              path: 'app/layout.tsx',
              description: 'Root layout with Inter font and metadata',
              fileType: 'tsx',
              content: `import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ContextNode client application",
  description: "Built on Next.js 15 App Router",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}`,
            },
          ],
        },
      },
    });
    console.log(`✓ Seeded Context Pack: ${packSlug}`);
  }

  console.log('✨ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

