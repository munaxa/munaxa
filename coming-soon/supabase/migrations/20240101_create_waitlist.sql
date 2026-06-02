-- Create waitlist table
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  source TEXT DEFAULT 'unknown',
  turnstile_token TEXT,
  confirmed BOOLEAN DEFAULT FALSE,
  confirm_token UUID NOT NULL DEFAULT gen_random_uuid(),
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist(email);

-- Confirmation links look up rows by this token
CREATE INDEX IF NOT EXISTS idx_waitlist_confirm_token ON waitlist(confirm_token);

-- Enable Row Level Security
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (for waitlist signup)
CREATE POLICY "Allow public insert" ON waitlist
  FOR INSERT
  WITH CHECK (true);

-- Allow anyone to select their own email
CREATE POLICY "Allow public select" ON waitlist
  FOR SELECT
  USING (true);

-- Allow service role to do everything
CREATE POLICY "Service role full access" ON waitlist
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');
