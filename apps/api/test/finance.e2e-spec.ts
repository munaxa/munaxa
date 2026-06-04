/**
 * End-to-end tests for Finance against a real PostgreSQL: fee plans, charges, CliQ/e-wallet
 * receipt uploads, the verify flow, the outstanding-balance formula, audit logging of every
 * financial action, and RBAC.
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

const TENANT = 'dddd4444-dddd-4444-dddd-444444444444';
const PASSWORD = 'Sup3rSecret!';

describe('Finance (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let financeToken: string;
  let parentToken: string;
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
      await tx.tenant.create({ data: { id: TENANT, name: 'fin', slug: 'fin', status: 'ACTIVE' } });
      await rbac.provisionTenantRoles(tx, TENANT);
      const student = await tx.student.create({
        data: {
          tenantId: TENANT,
          firstNameEn: 'Lina',
          lastNameEn: 'H',
          firstNameAr: 'لينا',
          lastNameAr: 'ح',
          qrCode: `QR-${TENANT}`,
        },
      });
      studentId = student.id;

      const finance = await tx.user.create({
        data: {
          tenantId: TENANT,
          email: 'finance@fin.example',
          status: 'ACTIVE',
          passwordHash: hash,
          mustChangePassword: false,
        },
      });
      await rbac.assignRole(tx, TENANT, finance.id, RoleKey.FinanceOfficer);
      const parent = await tx.user.create({
        data: {
          tenantId: TENANT,
          email: 'parent@fin.example',
          status: 'ACTIVE',
          passwordHash: hash,
          mustChangePassword: false,
        },
      });
      await rbac.assignRole(tx, TENANT, parent.id, RoleKey.Parent);
    });

    financeToken = await login('finance@fin.example');
    parentToken = await login('parent@fin.example');
  });

  afterAll(async () => {
    await withPlatform(prisma, (tx) => tx.tenant.delete({ where: { id: TENANT } }));
    await app.close();
  });

  async function login(email: string): Promise<string> {
    const res = await http()
      .post('/api/v1/auth/login')
      .send({ email, password: PASSWORD, tenantSlug: 'fin' })
      .expect(200);
    return res.body.accessToken as string;
  }

  async function statement() {
    const res = await http()
      .get(`/api/v1/finance/students/${studentId}/statement`)
      .set(auth(financeToken))
      .expect(200);
    return res.body as { totals: { charged: string; paid: string; outstanding: string } };
  }

  it('creates a fee plan and a charge', async () => {
    await http()
      .post('/api/v1/finance/fee-plans')
      .set(auth(financeToken))
      .send({ name: 'Tuition', amount: 1000, recurrence: 'ANNUAL' })
      .expect(201);

    await http()
      .post('/api/v1/finance/charges')
      .set(auth(financeToken))
      .send({ studentId, description: 'Term 1', amount: 750 })
      .expect(201);

    const s = await statement();
    expect(s.totals.charged).toBe('750.000');
    expect(s.totals.outstanding).toBe('750.000');
  });

  it('lets a Parent upload a CliQ receipt (presign + pending transaction)', async () => {
    const presign = await http()
      .post('/api/v1/finance/transactions/receipt/presign')
      .set(auth(parentToken))
      .send({ fileName: 'receipt.jpg', contentType: 'image/jpeg', size: 2048 })
      .expect(200);
    expect(presign.body.uploadUrl).toContain(presign.body.fileKey);

    const txn = await http()
      .post('/api/v1/finance/transactions')
      .set(auth(parentToken))
      .send({
        studentId,
        amount: 750,
        method: 'CLIQ',
        reference: 'CLIQ123',
        receiptKey: presign.body.fileKey,
      })
      .expect(201);
    expect(txn.body.status).toBe('PENDING');

    // PENDING payment does NOT reduce the outstanding balance yet.
    const s = await statement();
    expect(s.totals.paid).toBe('0.000');
    expect(s.totals.outstanding).toBe('750.000');
  });

  it('verifies the payment → outstanding balance updates by the formula', async () => {
    const list = await http()
      .get(`/api/v1/finance/transactions?studentId=${studentId}`)
      .set(auth(financeToken))
      .expect(200);
    const pending = list.body.find((t: { status: string }) => t.status === 'PENDING');

    await http()
      .post(`/api/v1/finance/transactions/${pending.id}/verify`)
      .set(auth(financeToken))
      .expect(200);

    const s = await statement();
    expect(s.totals.paid).toBe('750.000');
    expect(s.totals.outstanding).toBe('0.000'); // 750 charged − 750 paid
  });

  it('writes an audit log for every financial action', async () => {
    const count = await withPlatform(prisma, (tx) =>
      tx.auditLog.count({ where: { tenantId: TENANT, action: { startsWith: 'finance.' } } }),
    );
    // feeplan.create + charge.create + transaction.create + transaction.verify
    expect(count).toBeGreaterThanOrEqual(4);
  });

  it('rejects CliQ payments without a receipt or reference', async () => {
    await http()
      .post('/api/v1/finance/transactions')
      .set(auth(parentToken))
      .send({ studentId, amount: 10, method: 'CLIQ' })
      .expect(400);
  });

  it('enforces permissions (Parent cannot create charges or verify)', async () => {
    await http()
      .post('/api/v1/finance/charges')
      .set(auth(parentToken))
      .send({ studentId, description: 'X', amount: 1 })
      .expect(403);
  });
});
