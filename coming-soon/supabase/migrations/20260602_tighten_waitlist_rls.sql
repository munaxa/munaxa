-- Tighten RLS on the waitlist table.
--
-- The Edge Functions (early-access-subscribe / early-access-confirm) talk to
-- the database with the service role, which bypasses RLS entirely. That means
-- the previous "public insert" and "public select" policies were not needed
-- and were actively risky: the public SELECT policy let anyone holding the
-- anon/publishable key read every signup email through the REST API.
--
-- Dropping these policies leaves RLS enabled with NO policies for anon /
-- authenticated, so the table is effectively private to the service role.

DROP POLICY IF EXISTS "Allow public insert" ON waitlist;
DROP POLICY IF EXISTS "Allow public select" ON waitlist;
-- Any signed-in user could otherwise read every signup; the app only reads via
-- the service role, so this policy is dead weight and overly broad.
DROP POLICY IF EXISTS "Users can view own data" ON waitlist;

-- Keep the service-role catch-all (harmless; service role bypasses RLS anyway).
DROP POLICY IF EXISTS "Service role full access" ON waitlist;
CREATE POLICY "Service role full access" ON waitlist
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- rls_auto_enable() is an event-trigger helper that auto-enables RLS on new
-- tables. It should never be callable as an RPC; revoke EXECUTE from the
-- exposed roles. (Event triggers still fire regardless of these grants.)
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM public, anon, authenticated;
