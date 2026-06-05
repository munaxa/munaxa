/* Dev-only demo seed, run against the compiled dist (CommonJS). */
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../dist/app.module');
const { PrismaService } = require('../dist/prisma/prisma.service');
const { PasswordService } = require('../dist/auth/services/password.service');
const { RbacService } = require('../dist/auth/services/rbac.service');
const { withPlatform } = require('../dist/prisma/tenant.helpers');
const { RoleKey } = require('@munaxa/domain');

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  const prisma = app.get(PrismaService);
  const passwords = app.get(PasswordService);
  const rbac = app.get(RbacService);
  const hash = await passwords.hash('Demo1234!');

  await withPlatform(prisma, async (tx) => {
    await tx.tenant.deleteMany({ where: { slug: 'demo' } });
    const tenant = await tx.tenant.create({
      data: { name: 'Green Valley School', slug: 'demo', status: 'ACTIVE' },
    });
    await rbac.provisionTenantRoles(tx, tenant.id);
    const admin = await tx.user.create({
      data: {
        tenantId: tenant.id,
        email: 'admin@demo.example',
        firstNameEn: 'Dana',
        lastNameEn: 'Admin',
        status: 'ACTIVE',
        passwordHash: hash,
        mustChangePassword: false,
      },
    });
    await rbac.assignRole(tx, tenant.id, admin.id, RoleKey.SchoolAdmin);

    const school = await tx.school.create({
      data: { tenantId: tenant.id, nameEn: 'Green Valley', nameAr: 'الوادي الأخضر' },
    });
    const campus = await tx.campus.create({
      data: { tenantId: tenant.id, schoolId: school.id, nameEn: 'Main Campus', nameAr: 'الحرم الرئيسي', isMain: true },
    });
    const grade = await tx.grade.create({
      data: { tenantId: tenant.id, campusId: campus.id, nameEn: 'Grade 1', nameAr: 'الصف الأول', level: 1 },
    });
    const section = await tx.section.create({
      data: { tenantId: tenant.id, gradeId: grade.id, name: 'A' },
    });
    const names = [['Omar', 'عمر'], ['Lina', 'لينا'], ['Sara', 'سارة'], ['Yousef', 'يوسف']];
    for (let i = 0; i < names.length; i += 1) {
      await tx.student.create({
        data: {
          tenantId: tenant.id,
          sectionId: section.id,
          firstNameEn: names[i][0],
          lastNameEn: 'Khalil',
          firstNameAr: names[i][1],
          lastNameAr: 'خليل',
          qrCode: `demo-qr-${i + 1}`,
        },
      });
    }
  });

  console.log('Seeded demo: slug=demo  admin@demo.example / Demo1234!');
  await app.close();
}

main().catch((e) => {
  console.error('SEED FAILED:', e);
  process.exit(1);
});
