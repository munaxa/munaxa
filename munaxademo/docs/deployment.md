# Munaxa Demo — Deployment

The demo is a single Next.js app with **no database and no external dependencies**, so it deploys
almost anywhere. It builds in `standalone` mode for a slim container image.

## Environment

| Variable                   | Required | Default        | Purpose                                  |
| -------------------------- | -------- | -------------- | ---------------------------------------- |
| `DEMO_SESSION_SECRET`      | prod     | dev fallback   | HMAC key for the signed session cookie.  |
| `DEMO_SESSION_TTL_MINUTES` | no       | `120`          | Absolute session lifetime.               |

Generate a secret: `openssl rand -base64 48`.

## Local

```bash
npm install
npm run dev      # http://localhost:4100
```

## Production (Node)

```bash
npm install
npm run build
DEMO_SESSION_SECRET="…" npm run start   # serves on :4100
```

## Docker

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 4100
ENV PORT=4100
CMD ["node", "server.js"]
```

```bash
docker build -t munaxademo .
docker run -p 4100:4100 -e DEMO_SESSION_SECRET="$(openssl rand -base64 48)" munaxademo
```

## Cloudflare Workers (recommended) — built from this subfolder

The app runs on Cloudflare Workers via the **OpenNext** adapter (`@opennextjs/cloudflare`). The
build is scoped entirely to this `munaxademo/` directory — it is isolated from the Munaxa monorepo.

One-time setup:

```bash
cd munaxademo
npm install

# 1) Create the KV namespace that persists admin-created demo accounts (no database):
npx wrangler kv namespace create DEMO_ACCOUNTS
#   → copy the printed id into wrangler.jsonc (kv_namespaces[0].id)

# 2) Set the session signing secret (required; not a plaintext var):
npx wrangler secret put DEMO_SESSION_SECRET        # paste: openssl rand -base64 48
```

Preview locally on the Workers runtime (with real KV/secret bindings):

```bash
npm run cf:preview      # opennextjs-cloudflare build && wrangler dev
```

Deploy:

```bash
npm run cf:deploy       # opennextjs-cloudflare build && wrangler deploy
```

**Cloudflare dashboard (CI builds / "Connect to Git"):** set the project **Root directory** to
`munaxademo`, build command `npm run cf:build`, and deploy command `npx wrangler deploy`. Add the
`DEMO_ACCOUNTS` KV binding and the `DEMO_SESSION_SECRET` secret in the Worker's settings. Attach a
custom domain (e.g. `demo.munaxa.com`).

Notes:

- **CPU / PBKDF2.** Password hashing needs more CPU than the Workers free tier allows. Use the
  **Workers Standard** plan (config sets `limits.cpu_ms = 300`) and/or lower the work factor via the
  `DEMO_PBKDF2_ITERATIONS` var (defaults to `100000` on Cloudflare in `wrangler.jsonc`).
- **Accounts** persist in KV across deploys; locally they use the JSON file (`DEMO_DATA_DIR`).
- No `DATABASE_URL`, no external services — the demo stays hermetic on Cloudflare too.

## Platforms

- **Vercel / Netlify:** import the repo, set `DEMO_SESSION_SECRET`, deploy. No database to provision.
- **Cloud Run / Fly / Render / a VM:** use the Docker image above.

> Run a **single instance** (or enable sticky sessions). Demo accounts and login history are held
> in-process by design — there is intentionally no shared datastore. A restart simply re-seeds the
> baseline, which is one of the expected reset triggers.

## Promoting to its own repository

Because the folder is self-contained and imports nothing from the monorepo, you can move it out:

```bash
git subtree split --prefix=munaxademo -b munaxademo-export
# push that branch to the new munaxademo repo, or simply copy the folder.
```
