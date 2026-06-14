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
