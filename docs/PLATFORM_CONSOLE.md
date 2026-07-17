# Platform Console — access & hosting

The **Platform Console** (Munaxa employees: subscriptions, billing, upgrade reviews,
feature overrides, platform audit) is **not a separate application**. It is a set of
permission-gated routes inside the existing **Admin Portal** (`apps/admin`), under
`/platform/console/*`. School users never see it, because the nav and the API routes are
gated by `platform:*` permissions that only a **Platform role** carries.

## 1. Create the first platform login

There is no seeded employee account. Bootstrap one (idempotent):

```bash
# DATABASE_URL must point at your DB (the restricted munaxa_app role is fine — the
# script sets the platform RLS context itself).
PLATFORM_OWNER_EMAIL=you@munaxa.com \
PLATFORM_OWNER_PASSWORD='Str0ngPassw0rd!' \
pnpm --filter @munaxa/api db:seed:platform-owner
```

What it does: seeds the permission catalog, provisions the global Platform roles
(`tenantId = NULL`), ensures the reserved platform "home" tenant exists (owns employee
user rows; never a customer school and excluded from every console listing), then creates
the user and links the **Platform Owner** role.

Optional env: `PLATFORM_OWNER_ROLE` (default `PlatformOwner`; any of `PlatformOwner`,
`PlatformAdmin`, `PlatformFinance`, `PlatformSupport`, `PlatformSales`, `PlatformReadOnly`),
`PLATFORM_OWNER_FIRST_NAME`, `PLATFORM_OWNER_LAST_NAME`.

## 2. Log in

Go to the Admin Portal **`/login`** and sign in with that email + password. **Leave the
school / tenant field blank** — platform staff aren't scoped to a school. Once in, the
sidebar shows the **Platform** section (Platform Console, Schools, Subscriptions, Upgrade
Requests, Audit). The bootstrap password is a bcrypt hash that verifies immediately and is
transparently upgraded to scrypt on first login.

## 3. Serve it at `admin.munaxa.com`

Because the console lives in the admin app, hosting the admin app at `admin.munaxa.com`
serves the console too (same login; school admins and platform staff both authenticate
there, and each sees only what their role permits). To wire the domain:

1. **DNS** — add a `CNAME` for `admin` → your admin deployment host (Render/Cloudflare/…),
   and (recommended) `api` → the API host.
2. **Admin deploy** — add `admin.munaxa.com` as a custom domain on the admin service, and
   set the build-time `NEXT_PUBLIC_API_URL` to the API's public URL, e.g.
   `https://api.munaxa.com/api/v1` (baked in at build → redeploy the admin after changing).
3. **API deploy** — set `CORS_ORIGINS=https://admin.munaxa.com` (the API's CORS origin must
   equal the admin's exact public origin) and redeploy.

The admin reverse-proxies `/api/v1/*` to the API (`apps/admin/next.config.mjs`), so the
httpOnly session + CSRF cookies stay first-party on `admin.munaxa.com`.

> Want the console on its own host, fully separate from the school portal? Point a second
> domain (e.g. `console.munaxa.com`) at the **same** admin deployment — platform staff use
> that URL, schools use theirs, and role gating keeps them apart. A physically separate
> console app/deployment is possible but unnecessary given the permission isolation.
