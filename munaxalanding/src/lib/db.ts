import { Pool } from 'pg';
import { logger } from './logger';

/**
 * Dedicated connection pool for the landing page's own `contact_inquiries` table
 * (see db/migrations/001_create_contact_inquiries.sql).
 *
 * Kept independent from the main Munaxa Prisma schema/connection on purpose: the landing
 * page must be deployable (and its DB migratable) without touching `prisma/schema.prisma`
 * or the School OS's RLS-protected tenant database. Point `LANDING_DATABASE_URL` at the
 * same Postgres instance (different schema/role) or a separate database — either works.
 */
let pool: Pool | undefined;

function getPool(): Pool | null {
  const connectionString = process.env.LANDING_DATABASE_URL;
  if (!connectionString) return null;

  if (!pool) {
    pool = new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      ssl: process.env.LANDING_DATABASE_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
    });
    pool.on('error', (err) => {
      logger.error('db.pool_error', { message: err.message });
    });
  }
  return pool;
}

export interface ContactInquiryRecord {
  name: string;
  schoolName: string;
  email: string;
  phone: string;
  message: string;
  ipAddress: string | null;
  userAgent: string | null;
}

/**
 * Persists a contact inquiry using a parameterized query (no string concatenation —
 * prevents SQL injection per OWASP A03). Returns the generated row id, or `null` if no
 * database is configured (the request can still proceed; emails are still sent).
 */
export async function insertContactInquiry(record: ContactInquiryRecord): Promise<string | null> {
  const db = getPool();
  if (!db) {
    logger.warn('db.not_configured', { reason: 'LANDING_DATABASE_URL not set' });
    return null;
  }

  const result = await db.query<{ id: string }>(
    `INSERT INTO contact_inquiries
       (name, school_name, email, phone, message, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      record.name,
      record.schoolName,
      record.email,
      record.phone,
      record.message,
      record.ipAddress,
      record.userAgent,
    ],
  );

  return result.rows[0]?.id ?? null;
}
