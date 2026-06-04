/**
 * End-to-end tests for the Timetable Engine against a real PostgreSQL: master slots,
 * exception overrides, Ramadan mode, the current-class resolver, and RBAC.
 */
import { Test } from '@nestjs/testing';
import { ValidationPipe, VersioningType, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PasswordService } from '../src/auth/services/password.service';
import { RbacService } from '../src/auth/services/rbac.service';
import { withPlatform } from '../src/prisma/tenant.helpers';
import { dayOfWeekOf } from '../src/timetable/engine/timetable-engine';
import { RoleKey } from '@munaxa/domain';

const TENANT = 'aaaa1111-aaaa-1111-aaaa-111111111111';
const PASSWORD = 'Sup3rSecret!';
const SUNDAY = '2025-09-07'; // a Sunday
const RAMADAN_DAY = '2026-03-01';

describe('Timetable engine (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let parentToken: string;
  let sectionId: string;
  let campusId: string;

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
      await tx.tenant.create({ data: { id: TENANT, name: 'tt', slug: 'tt', status: 'ACTIVE' } });
      await rbac.provisionTenantRoles(tx, TENANT);
      const school = await tx.school.create({
        data: { tenantId: TENANT, nameEn: 'S', nameAr: 'S' },
      });
      const campus = await tx.campus.create({
        data: { tenantId: TENANT, schoolId: school.id, nameEn: 'C', nameAr: 'C' },
      });
      campusId = campus.id;
      const grade = await tx.grade.create({
        data: { tenantId: TENANT, campusId: campus.id, nameEn: 'G', nameAr: 'G', level: 1 },
      });
      const section = await tx.section.create({
        data: { tenantId: TENANT, gradeId: grade.id, name: 'A' },
      });
      sectionId = section.id;

      const admin = await tx.user.create({
        data: {
          tenantId: TENANT,
          email: 'admin@tt.example',
          status: 'ACTIVE',
          passwordHash: hash,
          mustChangePassword: false,
        },
      });
      await rbac.assignRole(tx, TENANT, admin.id, RoleKey.SchoolAdmin);
      const parent = await tx.user.create({
        data: {
          tenantId: TENANT,
          email: 'parent@tt.example',
          status: 'ACTIVE',
          passwordHash: hash,
          mustChangePassword: false,
        },
      });
      await rbac.assignRole(tx, TENANT, parent.id, RoleKey.Parent);
    });

    adminToken = await login('admin@tt.example');
    parentToken = await login('parent@tt.example');

    // Master schedule (REGULAR) for Sunday: two periods.
    await createSlot({
      dayOfWeek: 'SUN',
      periodIndex: 1,
      startTime: '08:00',
      endTime: '08:45',
      subject: 'Math',
    });
    await createSlot({
      dayOfWeek: 'SUN',
      periodIndex: 2,
      startTime: '08:50',
      endTime: '09:35',
      subject: 'Science',
    });
    // RAMADAN variant for the Ramadan test day.
    await createSlot({
      scheduleType: 'RAMADAN',
      dayOfWeek: dayOfWeekOf(new Date(RAMADAN_DAY)),
      periodIndex: 1,
      startTime: '09:00',
      endTime: '09:30',
      subject: 'Math (Ramadan)',
    });
  });

  afterAll(async () => {
    await withPlatform(prisma, (tx) => tx.tenant.delete({ where: { id: TENANT } }));
    await app.close();
  });

  async function login(email: string): Promise<string> {
    const res = await http()
      .post('/api/v1/auth/login')
      .send({ email, password: PASSWORD, tenantSlug: 'tt' })
      .expect(200);
    return res.body.accessToken as string;
  }

  function createSlot(over: Record<string, unknown>) {
    return http()
      .post('/api/v1/timetable/slots')
      .set(auth(adminToken))
      .send({ sectionId, ...over })
      .expect(201);
  }

  it('resolves the regular master schedule for a day', async () => {
    const res = await http()
      .get(`/api/v1/timetable/sections/${sectionId}/day?date=${SUNDAY}`)
      .set(auth(adminToken))
      .expect(200);
    expect(res.body.scheduleType).toBe('REGULAR');
    expect(res.body.periods).toHaveLength(2);
    expect(res.body.periods.every((p: { status: string }) => p.status === 'SCHEDULED')).toBe(true);
  });

  it('resolves the current and next class', async () => {
    const res = await http()
      .get(`/api/v1/timetable/sections/${sectionId}/current?at=${SUNDAY}T09:00:00Z`)
      .set(auth(adminToken))
      .expect(200);
    expect(res.body.current?.periodIndex).toBe(2);
    expect(res.body.next).toBeNull();
  });

  it('applies a cancellation exception', async () => {
    await http()
      .post('/api/v1/timetable/exceptions')
      .set(auth(adminToken))
      .send({ date: SUNDAY, sectionId, periodIndex: 1, type: 'CANCELLATION', note: 'Assembly' })
      .expect(201);

    const res = await http()
      .get(`/api/v1/timetable/sections/${sectionId}/day?date=${SUNDAY}`)
      .set(auth(adminToken))
      .expect(200);
    const p1 = res.body.periods.find((p: { periodIndex: number }) => p.periodIndex === 1);
    expect(p1.status).toBe('CANCELLED');
  });

  it('uses the Ramadan schedule when enabled for the date', async () => {
    await http()
      .put(`/api/v1/timetable/config/${campusId}`)
      .set(auth(adminToken))
      .send({
        ramadanModeEnabled: true,
        ramadanStartDate: '2026-02-18',
        ramadanEndDate: '2026-03-19',
      })
      .expect(200);

    const res = await http()
      .get(`/api/v1/timetable/sections/${sectionId}/day?date=${RAMADAN_DAY}`)
      .set(auth(adminToken))
      .expect(200);
    expect(res.body.scheduleType).toBe('RAMADAN');
    expect(res.body.periods).toHaveLength(1);
    expect(res.body.periods[0].startTime).toBe('09:00');
  });

  it('allows read for a Parent but blocks slot management', async () => {
    await http()
      .get(`/api/v1/timetable/sections/${sectionId}/day?date=${SUNDAY}`)
      .set(auth(parentToken))
      .expect(200);
    await http()
      .post('/api/v1/timetable/slots')
      .set(auth(parentToken))
      .send({
        sectionId,
        dayOfWeek: 'MON',
        periodIndex: 1,
        startTime: '08:00',
        endTime: '08:45',
        subject: 'X',
      })
      .expect(403);
  });
});
