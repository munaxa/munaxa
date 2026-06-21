/**
 * Munaxa database seed (Phase 2).
 *
 * Seeds the GLOBAL permission catalog (the `Permission` table is not tenant-scoped).
 * Per-tenant system roles and their role→permission mappings are seeded during tenant
 * provisioning (Phase 4), not here.
 *
 * Run: `pnpm --filter @munaxa/api db:seed` (DATABASE_URL must be set).
 */
import { PrismaClient } from '@prisma/client';
import { ALL_PERMISSIONS } from '@munaxa/domain';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  let count = 0;
  // The Permission table is RLS-protected: writes require the platform context
  // (app.is_platform='on'). Run the upserts inside one platform transaction.
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.is_platform', 'on', true)`;
    for (const key of ALL_PERMISSIONS) {
      const category = key.split(':')[0] ?? 'general';
      await tx.permission.upsert({
        where: { key },
        update: { category },
        create: { key, category },
      });
      count += 1;
    }
  });
  // eslint-disable-next-line no-console
  console.log(`✔ Seeded ${count} permissions into the global catalog.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error('Seed failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
