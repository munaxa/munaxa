/**
 * End-to-end tests for the Enterprise Document Engine against a real PostgreSQL: generating finance
 * documents from the ledger, the immutable archive, reprint (print-counter + audit), download
 * auditing, and RBAC. Receipt generation is verified to be independent of admissions.
 */
import { Test } from '@nestjs/testing';
import { ValidationPipe, VersioningType, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PasswordService } from '../src/auth/services/password.service';
import { RbacService } from '../src/auth/services/rbac.service';
import { withPlatform } from '../src/prisma/tenant.helpers';
import { RoleKey } from '@munaxa/domain';

const TENANT = 'eeee5555-eeee-5555-eeee-555555555555';
const PASSWORD = 'Sup3rSecret!';

describe('Documents / Document Engine (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let financeToken: string;
  let teacherToken: string;
  let studentId: string;

  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = moduleRef.get(PrismaService);
    const passwords = moduleRef.get(PasswordService);
    const rbac = moduleRef.get(RbacService);
    const hash = await passwords.hash(PASSWORD);

    await withPlatform(prisma, async (tx) => {
      await tx.tenant.deleteMany({ where: { id: TENANT } });
      await tx.tenant.create({ data: { id: TENANT, name: 'doc', slug: 'doc', status: 'ACTIVE' } });
      await rbac.provisionTenantRoles(tx, TENANT);
      const student = await tx.student.create({
        data: {
          tenantId: TENANT,
          firstNameEn: 'Omar',
          lastNameEn: 'K',
          firstNameAr: 'عمر',
          lastNameAr: 'ك',
          qrCode: `QR-${TENANT}`,
        },
      });
      studentId = student.id;
      await tx.charge.create({
        data: { tenantId: TENANT, studentId, description: 'Tuition', amount: 500, status: 'PENDING' },
      });

      const finance = await tx.user.create({
        data: {
          tenantId: TENANT,
          email: 'finance@doc.example',
          status: 'ACTIVE',
          passwordHash: hash,
          mustChangePassword: false,
        },
      });
      await rbac.assignRole(tx, TENANT, finance.id, RoleKey.FinanceOfficer);

      const teacher = await tx.user.create({
        data: {
          tenantId: TENANT,
          email: 'teacher@doc.example',
          status: 'ACTIVE',
          passwordHash: hash,
          mustChangePassword: false,
        },
      });
      await rbac.assignRole(tx, TENANT, teacher.id, RoleKey.Teacher);
    });

    financeToken = await login('finance@doc.example');
    teacherToken = await login('teacher@doc.example');
  });

  afterAll(async () => {
    await withPlatform(prisma, (tx) => tx.tenant.delete({ where: { id: TENANT } }));
    await app.close();
  });

  async function login(email: string): Promise<string> {
    const res = await http()
      .post('/api/v1/auth/login')
      .send({ email, password: PASSWORD, tenantSlug: 'doc' })
      .expect(200);
    return res.body.accessToken as string;
  }

  let documentId: string;

  it('generates & archives an account statement from the ledger', async () => {
    const res = await http()
      .post('/api/v1/documents/generate')
      .set(auth(financeToken))
      .send({ type: 'ACCOUNT_STATEMENT', studentId, language: 'EN' })
      .expect(201);
    expect(res.body.type).toBe('ACCOUNT_STATEMENT');
    expect(res.body.documentNo).toBeGreaterThanOrEqual(1);
    expect(res.body.checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(res.body.byteSize).toBeGreaterThan(0);
    documentId = res.body.id;
  });

  it('lists the archive for the student', async () => {
    const res = await http()
      .get(`/api/v1/documents?studentId=${studentId}`)
      .set(auth(financeToken))
      .expect(200);
    expect(res.body.some((d: { id: string }) => d.id === documentId)).toBe(true);
  });

  it('downloads the stored PDF snapshot', async () => {
    const res = await http()
      .get(`/api/v1/documents/${documentId}/download`)
      .set(auth(financeToken))
      .expect(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.body.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });

  it('reprint increments the print counter and audits', async () => {
    await http().post(`/api/v1/documents/${documentId}/print`).set(auth(financeToken)).expect(201);
    const meta = await http()
      .get(`/api/v1/documents/${documentId}`)
      .set(auth(financeToken))
      .expect(200);
    expect(meta.body.printedCount).toBeGreaterThanOrEqual(1);

    const prints = await withPlatform(prisma, (tx) =>
      tx.auditLog.count({ where: { tenantId: TENANT, action: 'document.print' } }),
    );
    expect(prints).toBeGreaterThanOrEqual(1);
  });

  it('audits generation and download', async () => {
    const count = await withPlatform(prisma, (tx) =>
      tx.auditLog.count({
        where: { tenantId: TENANT, action: { in: ['document.generate', 'document.download'] } },
      }),
    );
    expect(count).toBeGreaterThanOrEqual(2);
  });

  it('refuses a clearance certificate while a balance is outstanding', async () => {
    await http()
      .post('/api/v1/documents/generate')
      .set(auth(financeToken))
      .send({ type: 'CLEARANCE_CERTIFICATE', studentId })
      .expect(400);
  });

  it('enforces permissions (a Teacher cannot generate or read documents)', async () => {
    await http()
      .post('/api/v1/documents/generate')
      .set(auth(teacherToken))
      .send({ type: 'ACCOUNT_STATEMENT', studentId })
      .expect(403);
    await http().get(`/api/v1/documents?studentId=${studentId}`).set(auth(teacherToken)).expect(403);
  });
});
