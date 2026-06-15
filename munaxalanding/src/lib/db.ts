import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { logger } from './logger';

/**
 * Server-only Supabase client backed by the service role key (bypasses RLS).
 *
 * Submissions are stored in the shared Munaxa Supabase project's `early_access_requests`
 * table (see db/migrations/002_add_contact_fields_to_early_access_requests.sql) so the
 * landing page's "talk to us" inquiries land alongside other early-access signups. RLS is
 * enabled on that table with no public policies, so only the service role (server-side,
 * never exposed to the browser) can read/write it.
 */
let client: SupabaseClient | undefined;

function getClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;

  if (!client) {
    client = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
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
 * Persists a contact inquiry. Returns the row id, or `null` if Supabase isn't configured
 * (the request can still proceed; emails are still sent).
 *
 * Uses an upsert keyed on `email` (the table has a unique constraint on it): a school that
 * submits the form again gets its existing early-access request updated with the latest
 * details rather than failing on a duplicate-key error.
 */
export async function insertContactInquiry(record: ContactInquiryRecord): Promise<string | null> {
  const supabase = getClient();
  if (!supabase) {
    logger.warn('db.not_configured', {
      reason: 'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set',
    });
    return null;
  }

  const { data, error } = await supabase
    .from('early_access_requests')
    .upsert(
      {
        name: record.name,
        school: record.schoolName,
        email: record.email,
        phone: record.phone,
        message: record.message,
        website: '',
        ip_address: record.ipAddress,
        user_agent: record.userAgent,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'email' },
    )
    .select('id')
    .single<{ id: string }>();

  if (error) throw new Error(error.message);
  return data?.id ?? null;
}
