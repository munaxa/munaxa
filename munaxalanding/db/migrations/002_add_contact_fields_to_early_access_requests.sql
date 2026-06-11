-- Munaxa Landing Page — extend the shared `early_access_requests` table (Supabase project
-- "Munaxa", ref fngkpuyvzqemkqnenryq) so the contact form can store its message and basic
-- abuse-investigation metadata alongside other early-access signups.
--
-- Already applied to the live project via the Supabase migration tooling (migration name
-- `add_contact_fields_to_early_access_requests`). This file documents that change for
-- version control / reproducing the schema elsewhere (e.g. a fresh Supabase project).
--
-- Pre-existing columns (not created here): id, created_at, name, school, email, phone,
-- website, status. RLS is enabled on this table with no public policies — only the
-- service role (SUPABASE_SERVICE_ROLE_KEY, server-side only) can read/write it.

ALTER TABLE public.early_access_requests
  ADD COLUMN IF NOT EXISTS message text,
  ADD COLUMN IF NOT EXISTS ip_address inet,
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

COMMENT ON TABLE public.early_access_requests IS 'Inquiries submitted via the munaxalanding contact form (and any future early-access flows). One row per email; later submissions update the existing row.';
COMMENT ON COLUMN public.early_access_requests.message IS 'Free-text message from the contact form.';
COMMENT ON COLUMN public.early_access_requests.ip_address IS 'Submitter IP address, for abuse investigation.';
COMMENT ON COLUMN public.early_access_requests.user_agent IS 'Submitter User-Agent header, for abuse investigation.';
