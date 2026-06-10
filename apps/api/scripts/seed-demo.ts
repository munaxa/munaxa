/**
 * Local demo seed — creates a ready-to-use school you can log into.
 *
 * Plain PrismaClient + bcryptjs (no Nest DI — tsx doesn't emit the decorator metadata Nest needs),
 * mirroring prisma/seed.ts. Replicates the RBAC role provisioning from the domain permission map.
 * Idempotent; local development only.
 *
 *   pnpm --filter @munaxa/api db:seed       # global permission catalog (run FIRST)
 *   pnpm --filter @munaxa/api db:seed:demo  # this — demo tenant + admin login + a student
 *
 * Prints the login credentials at the end.
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { SCHOOL_ROLES, permissionsForRole } from '@munaxa/domain';

const TENANT_ID = 'ac276a70-7af3-4147-aa68-6b126e8f3a92';
const SLUG = 'demo';
const ADMIN_EMAIL = 'admin@demo.example';
const ADMIN_PASSWORD = 'ChangeMe123!';

const prisma = new PrismaClient();

/** Run fn with the platform RLS context set, so cross-tenant writes pass row-level security. */
function platform<T>(fn: (tx: PrismaClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.is_platform', 'on', true)`;
    return fn(tx as unknown as PrismaClient);
  });
}

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  await platform(async (tx) => {
    await tx.tenant.upsert({
      where: { id: TENANT_ID },
      create: { id: TENANT_ID, name: 'Green Valley School', slug: SLUG, status: 'ACTIVE' },
      update: { status: 'ACTIVE' },
    });

    // Provision the school system roles + their permission mappings (mirrors RbacService).
    for (const key of SCHOOL_ROLES) {
      const role =
        (await tx.role.findFirst({ where: { tenantId: TENANT_ID, key: key } })) ??
        (await tx.role.create({
          data: { tenantId: TENANT_ID, key: key, scope: 'SCHOOL', isSystem: true },
        }));
      const permissionKeys = permissionsForRole(key);
      const permissions = await tx.permission.findMany({
        where: { key: { in: permissionKeys } },
        select: { id: true },
      });
      for (const permission of permissions) {
        await tx.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
          update: {},
          create: { roleId: role.id, permissionId: permission.id },
        });
      }
    }

    const admin = await tx.user.upsert({
      where: { tenantId_email: { tenantId: TENANT_ID, email: ADMIN_EMAIL } },
      create: {
        tenantId: TENANT_ID,
        email: ADMIN_EMAIL,
        status: 'ACTIVE',
        passwordHash,
        mustChangePassword: false,
        firstNameEn: 'School',
        lastNameEn: 'Admin',
      },
      update: { passwordHash, status: 'ACTIVE', mustChangePassword: false },
    });
    const adminRole = await tx.role.findFirstOrThrow({
      where: { tenantId: TENANT_ID, key: 'SchoolAdmin' },
    });
    await tx.userRole.upsert({
      where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
      update: {},
      create: { tenantId: TENANT_ID, userId: admin.id, roleId: adminRole.id },
    });

    // A sample student so the Finance/People screens have something to show.
    await tx.student.upsert({
      where: { tenantId_nationalId: { tenantId: TENANT_ID, nationalId: '9901012345' } },
      create: {
        tenantId: TENANT_ID,
        firstNameEn: 'Omar',
        lastNameEn: 'Haddad',
        firstNameAr: 'عمر',
        lastNameAr: 'الحداد',
        fatherNameEn: 'Khalid',
        nationalId: '9901012345',
        qrCode: `QR-${TENANT_ID}-omar`,
      },
      update: {},
    });
  });
  console.log(
    `\n✔ Demo ready.\n  Portal:   http://localhost:3000\n  Tenant:   ${SLUG}\n  Email:    ${ADMIN_EMAIL}\n  Password: ${ADMIN_PASSWORD}\n`,
  );
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('Demo seed failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
