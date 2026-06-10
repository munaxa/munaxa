/**
 * End-to-end tests for the student billing ledger (Phase 17): structured deductions
 * (scholarship/discount/credit memo), payment→charge allocation with status recompute,
 * refunds of available credit, the credit-balance math, and the over-allocation /
 * over-refund guards. Runs against a real PostgreSQL.
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

const TENANT = 'b111c0de-3333-4333-8333-333333333333';
const PASSWORD = 'Sup3rSecret!';

describe('Student billing ledger (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let financeToken: string;
  let teacherToken: string; // finance:read only — for RBAC
  let s1: string; // discounts + refunds flow
  let s2: string; // allocation mechanics

  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
  const http = () => request(app.getHttpServer());
  const L = '/api/v1/finance/ledger';

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
      await tx.tenant.create({ data: { id: TENANT, name: 'led', slug: 'led', status: 'ACTIVE' } });
      await rbac.provisionTenantRoles(tx, TENANT);
      const mkStudent = async (qr: string) => {
        const st = await tx.student.create({
          data: {
            tenantId: TENANT,
            firstNameEn: 'S',
            lastNameEn: qr,
            firstNameAr: 'ط',
            lastNameAr: 'ب',
            qrCode: qr,
          },
        });
        return st.id;
      };
      s1 = await mkStudent(`QR-${TENANT}-1`);
      s2 = await mkStudent(`QR-${TENANT}-2`);
      const mkUser = async (email: string, role: RoleKey) => {
        const u = await tx.user.create({
          data: {
            tenantId: TENANT,
            email,
            status: 'ACTIVE',
            passwordHash: hash,
            mustChangePassword: false,
          },
        });
        await rbac.assignRole(tx, TENANT, u.id, role);
      };
      await mkUser('finance@led.example', RoleKey.FinanceOfficer);
      await mkUser('teacher@led.example', RoleKey.Teacher);
    });

    financeToken = await login('finance@led.example');
    teacherToken = await login('teacher@led.example');
  });

  afterAll(async () => {
    await withPlatform(prisma, (tx) => tx.tenant.delete({ where: { id: TENANT } }));
    await app.close();
  });

  async function login(email: string): Promise<string> {
    const res = await http()
      .post('/api/v1/auth/login')
      .send({ email, password: PASSWORD, tenantSlug: 'led' })
      .expect(200);
    return res.body.accessToken as string;
  }

  // -- helpers ----------------------------------------------------------------

  async function charge(studentId: string, amount: number, description = 'Fee'): Promise<string> {
    const res = await http()
      .post('/api/v1/finance/charges')
      .set(auth(financeToken))
      .send({ studentId, description, amount })
      .expect(201);
    return res.body.id as string;
  }

  async function payAndVerify(
    studentId: string,
    amount: number,
    chargeId?: string,
  ): Promise<string> {
    const created = await http()
      .post('/api/v1/finance/transactions')
      .set(auth(financeToken))
      .send({ studentId, amount, method: 'CASH', ...(chargeId ? { chargeId } : {}) })
      .expect(201);
    await http()
      .post(`/api/v1/finance/transactions/${created.body.id}/verify`)
      .set(auth(financeToken))
      .expect(200);
    return created.body.id as string;
  }

  async function statement(studentId: string) {
    const res = await http()
      .get(`/api/v1/finance/students/${studentId}/statement`)
      .set(auth(financeToken))
      .expect(200);
    return res.body as {
      totals: {
        charged: string;
        paid: string;
        outstanding: string;
        discounts: string;
        credits: string;
        refunded: string;
        creditBalance: string;
      };
      chargeBalances: Array<{
        charge: { id: string; status: string };
        net: string;
        allocated: string;
        balance: string;
      }>;
    };
  }

  // -- Student 1: deductions + refunds ----------------------------------------

  let c1: string;

  it('auto-allocates a charge-targeted payment and marks the charge PARTIAL', async () => {
    c1 = await charge(s1, 1000, 'Tuition');
    await payAndVerify(s1, 400, c1);
    const s = await statement(s1);
    expect(s.totals.paid).toBe('400.000');
    expect(s.totals.outstanding).toBe('600.000');
    const cb = s.chargeBalances.find((b) => b.charge.id === c1)!;
    expect(cb.charge.status).toBe('PARTIAL');
    expect(cb.allocated).toBe('400.000');
    expect(cb.balance).toBe('600.000');
  });

  it('applies a 25% scholarship that reduces the net and the outstanding', async () => {
    await http()
      .post(`${L}/adjustments`)
      .set(auth(financeToken))
      .send({ studentId: s1, chargeId: c1, type: 'SCHOLARSHIP', percent: 25, reason: 'Merit 25%' })
      .expect(201);
    const s = await statement(s1);
    expect(s.totals.discounts).toBe('250.000'); // 25% of 1000
    expect(s.totals.outstanding).toBe('350.000'); // (1000 − 250) − 400
    const cb = s.chargeBalances.find((b) => b.charge.id === c1)!;
    expect(cb.net).toBe('750.000');
    expect(cb.balance).toBe('350.000');
    expect(cb.charge.status).toBe('PARTIAL');
  });

  it('rejects a deduction larger than the remaining net', async () => {
    await http()
      .post(`${L}/adjustments`)
      .set(auth(financeToken))
      .send({ studentId: s1, chargeId: c1, type: 'DISCOUNT', amount: 800, reason: 'too big' })
      .expect(400);
  });

  it('settles the remainder → charge PAID, outstanding 0', async () => {
    await payAndVerify(s1, 350, c1);
    const s = await statement(s1);
    expect(s.totals.outstanding).toBe('0.000');
    expect(s.chargeBalances.find((b) => b.charge.id === c1)!.charge.status).toBe('PAID');
  });

  it('an overpayment becomes refundable credit', async () => {
    await payAndVerify(s1, 100); // unallocated → credit
    const s = await statement(s1);
    expect(s.totals.creditBalance).toBe('100.000');
    expect(s.totals.outstanding).toBe('0.000');
  });

  it('refunds available credit (request → verify) and zeroes the credit', async () => {
    const r = await http()
      .post(`${L}/refunds`)
      .set(auth(financeToken))
      .send({ studentId: s1, amount: 100, method: 'CASH', reason: 'Overpayment returned' })
      .expect(201);
    expect(r.body.status).toBe('PENDING');
    await http().post(`${L}/refunds/${r.body.id}/verify`).set(auth(financeToken)).expect(201);
    const s = await statement(s1);
    expect(s.totals.refunded).toBe('100.000');
    expect(s.totals.creditBalance).toBe('0.000');
  });

  it('rejects a refund that exceeds available credit', async () => {
    await http()
      .post(`${L}/refunds`)
      .set(auth(financeToken))
      .send({ studentId: s1, amount: 50, method: 'CASH', reason: 'no credit left' })
      .expect(400);
  });

  it('an account-level credit memo raises the credit balance', async () => {
    await http()
      .post(`${L}/adjustments`)
      .set(auth(financeToken))
      .send({ studentId: s1, type: 'CREDIT_MEMO', amount: 50, reason: 'Goodwill credit' })
      .expect(201);
    const s = await statement(s1);
    expect(s.totals.credits).toBe('50.000');
    expect(s.totals.creditBalance).toBe('50.000');
  });

  it('reversing the scholarship restores the net (traceable)', async () => {
    const adjs = await http()
      .get(`/api/v1/finance/students/${s1}/statement`)
      .set(auth(financeToken))
      .expect(200);
    const scholarship = (
      adjs.body.adjustments as Array<{ id: string; type: string; status: string }>
    ).find((a) => a.type === 'SCHOLARSHIP')!;
    await http()
      .post(`${L}/adjustments/${scholarship.id}/reverse`)
      .set(auth(financeToken))
      .expect(201);
    const s = await statement(s1);
    expect(s.totals.discounts).toBe('0.000');
    // Charge net back to 1000, paid 750 → now PARTIAL again with 250 outstanding.
    const cb = s.chargeBalances.find((b) => b.charge.id === c1)!;
    expect(cb.net).toBe('1000.000');
    expect(cb.balance).toBe('250.000');
    expect(cb.charge.status).toBe('PARTIAL');
  });

  // -- Student 2: allocation mechanics ----------------------------------------

  it('manually allocates an unallocated (credit) payment to a charge → PAID', async () => {
    const c = await charge(s2, 500, 'Books');
    const txnId = await payAndVerify(s2, 600); // no chargeId → all credit
    let s = await statement(s2);
    expect(s.totals.creditBalance).toBe('100.000'); // 600 − 500 net

    await http()
      .post(`${L}/allocate`)
      .set(auth(financeToken))
      .send({ transactionId: txnId, allocations: [{ chargeId: c, amount: 500 }] })
      .expect(201);
    s = await statement(s2);
    const cb = s.chargeBalances.find((b) => b.charge.id === c)!;
    expect(cb.charge.status).toBe('PAID');
    expect(cb.balance).toBe('0.000');
    expect(s.totals.outstanding).toBe('0.000');

    // Over-allocate the same charge (balance 0) is rejected.
    await http()
      .post(`${L}/allocate`)
      .set(auth(financeToken))
      .send({ transactionId: txnId, allocations: [{ chargeId: c, amount: 50 }] })
      .expect(400);

    // Allocating beyond the unallocated remainder (only 100 left) is rejected.
    const c2 = await charge(s2, 500, 'Trip');
    await http()
      .post(`${L}/allocate`)
      .set(auth(financeToken))
      .send({ transactionId: txnId, allocations: [{ chargeId: c2, amount: 200 }] })
      .expect(400);
  });

  // -- RBAC -------------------------------------------------------------------

  it('blocks ledger writes for a finance:read-only role', async () => {
    await http()
      .post(`${L}/adjustments`)
      .set(auth(teacherToken))
      .send({ studentId: s1, chargeId: c1, type: 'DISCOUNT', amount: 10, reason: 'x' })
      .expect(403);
    await http()
      .post(`${L}/refunds`)
      .set(auth(teacherToken))
      .send({ studentId: s1, amount: 1, method: 'CASH', reason: 'x' })
      .expect(403);
  });
});
