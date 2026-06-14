# Munaxa Demo

A secure, **fully isolated**, **database-free** live demonstration of the Munaxa School
Operating System. It lets prospective school owners explore a complete, realistic school —
**Munaxa Academy** — across eight roles, without touching any production system, database, or
external service.

> This is a **standalone project**. It does **not** import from or depend on the Munaxa monorepo,
> so it can be lifted into its own repository (`munaxademo`) and deployed independently. The
> Munaxa design system (logo, colours, typography, spacing, components, shadows) is **vendored**
> here verbatim so the demo looks and feels identical to production.

---

## Highlights

- **No database.** All data is generated from TypeScript seed files into an in-memory baseline.
- **Session-only changes.** Create/edit/delete anything — students, attendance, invoices,
  announcements. Nothing is persisted; everything resets to the seeded baseline.
- **8 roles** with different permissions, dashboards and navigation: School Owner, Principal,
  Registrar, Finance Manager, Teacher, Parent, Student, Bus Supervisor. Switch from the login
  page or the top bar.
- **Login-protected.** Not publicly accessible: a signed, httpOnly session cookie gates every
  route. Admins manage time-boxed demo accounts (create / disable / delete / expiry / history).
- **All integrations mocked.** Email, SMS, WhatsApp, push, JoFotara e-invoicing and payments are
  stubbed and recorded in an in-app outbox — never sent. The CSP blocks all outbound connections.
- **Guided onboarding** + a permanent demo banner with one-click reset.

## Quick start

```bash
cd munaxademo
cp .env.example .env          # optional: set DEMO_SESSION_SECRET
npm install                   # or: pnpm install --ignore-workspace
npm run dev                   # http://localhost:4100
```

Build for production:

```bash
npm run build && npm run start
```

## Demo credentials

| Username             | Password           | Role        | Notes                         |
| -------------------- | ------------------ | ----------- | ----------------------------- |
| `demo`               | `MunaxaDemo#2026`  | prospect    | General exploration login     |
| `futureacademy-demo` | `X9P4M2K8`         | prospect    | Example, expires in 7 days    |
| `munaxa-admin`       | `MunaxaAdmin#2026` | demo admin  | Can manage demo accounts      |

After signing in, pick a role to explore. Switch roles any time from the top bar.

## Documentation

- [`docs/architecture.md`](./docs/architecture.md) — how the demo works and stays isolated.
- [`docs/security.md`](./docs/security.md) — the security model and threat boundaries.
- [`docs/deployment.md`](./docs/deployment.md) — deploying to the cloud.

## Tech

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS (vendored Munaxa preset).
No backend, no database, no external network calls.
