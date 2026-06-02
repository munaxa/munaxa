# Munaxa — Trust-based Booking Platform (coming-soon waitlist)

The `index.html` landing page collects early-access emails using a **double
opt-in** flow backed by Supabase Edge Functions + Resend, with Cloudflare
Turnstile bot protection.

## How the waitlist flow works

1. **Sign up** — A visitor submits their email on `index.html`. The page POSTs
   to the `early-access-subscribe` Edge Function, which inserts the email into
   the `waitlist` table (`confirmed = false`) and emails a **confirmation link**
   via Resend.
2. **Confirm email** — The link points at the `early-access-confirm` Edge
   Function (`/functions/v1/early-access-confirm?token=…`). It flips the row to
   `confirmed = true`, sends a **"you're on the waitlist" welcome email**, and
   redirects the visitor to `confirmed.html?state=confirmed`.
3. **Can't confirm twice** — The confirm step is an atomic update guarded by
   `WHERE confirm_token = … AND confirmed = false`. A second click matches no
   unconfirmed row, so it sends **no second welcome email** and instead
   redirects to `confirmed.html?state=already`. Unknown/expired tokens redirect
   to `?state=invalid`.

`confirmed.html` reads the `?state=` query param (`confirmed` | `already` |
`invalid` | `error`) and shows the matching message.

## Project configuration (live)

- **Supabase project:** `fngkpuyvzqemkqnenryq` (MunaxaCS) —
  `https://fngkpuyvzqemkqnenryq.supabase.co`
- **Edge Functions:** `early-access-subscribe`, `early-access-confirm`
  (both `verify_jwt = false`)
- **Email:** Resend (verified sending domain) — default `From` is
  `Munaxa <hello@munaxa.com>`
- **Bot protection:** Cloudflare Turnstile (site key is public, baked into
  `index.html`)

## 1. Supabase setup

### Database
Apply the migrations in `supabase/migrations/`:
- `20240101_create_waitlist.sql` — creates the `waitlist` table
  (`id, email, source, turnstile_token, confirmed, confirm_token,
  confirmed_at, created_at, updated_at`) with RLS enabled.
- `20260602_tighten_waitlist_rls.sql` — removes the over-permissive public
  INSERT/SELECT policies (the functions use the service role, which bypasses
  RLS) so signup emails can't be read with the anon key.

### Edge Functions
The function source lives in `supabase/functions/`:
```bash
supabase link --project-ref fngkpuyvzqemkqnenryq
supabase functions deploy early-access-subscribe
supabase functions deploy early-access-confirm
```

### Edge Function secrets (Settings → Edge Functions → Secrets)
| Secret | Purpose |
| --- | --- |
| `SUPABASE_URL` | `https://fngkpuyvzqemkqnenryq.supabase.co` (used to build the confirm link) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key — DB access that bypasses RLS |
| `RESEND_API_KEY` | Resend API key for sending both emails |
| `FROM_EMAIL` | Sender, e.g. `Munaxa <hello@munaxa.com>` (must be on your verified Resend domain) |
| `SITE_URL` | Public site origin, e.g. `https://munaxa.com` (used for the post-confirm redirect to `confirmed.html`) |

## 2. Cloudflare deployment

The site is static (served as-is, no build step). `index.html` falls back to
the correct Supabase URL + publishable key when no `VITE_*` vars are injected,
so no Cloudflare env vars are strictly required. Deploy via Wrangler
(`wrangler.jsonc`) or connect the repo in the Cloudflare dashboard.

## 3. Testing

1. Submit an email on the page → check the `waitlist` table for a new
   `confirmed = false` row and look for the confirmation email.
2. Click the link → you should land on `confirmed.html` with
   "You're on the waitlist", the row flips to `confirmed = true`, and a welcome
   email arrives.
3. Click the same link again → "Already confirmed", no second email.

## Troubleshooting

- **No emails:** verify `RESEND_API_KEY` / `FROM_EMAIL` and that the domain is
  verified in Resend. Check `supabase functions logs early-access-subscribe`.
- **Confirm link 404s:** make sure the link points at the Edge Function
  (`/functions/v1/early-access-confirm`), not a `/confirm` route on the static
  site — `SUPABASE_URL` must be set on the subscribe function.
- **Wrong confirmed.html message:** ensure `SITE_URL` has no trailing slash
  issues; the redirect targets `${SITE_URL}/confirmed.html?state=…`.
