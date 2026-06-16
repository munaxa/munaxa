# syntax=docker/dockerfile:1
# Multi-stage build for the Munaxa Admin Portal (Next.js standalone).
# Build context MUST be the repo root: docker build -f apps/admin/Dockerfile -t munaxa-admin .

ARG NODE_VERSION=22-alpine

FROM node:${NODE_VERSION} AS base
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc turbo.json ./
COPY apps/admin/package.json apps/admin/
COPY packages/ packages/
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# NEXT_PUBLIC_* values are inlined into the client bundle at BUILD time. Declare them as
# build args (Render passes matching service env vars into the Docker build only when an
# ARG of the same name exists) and promote to ENV so `next build` picks them up. Without
# this the admin falls back to http://localhost:4000/api/v1 and the browser can't reach
# the API.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_ENV
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_ENV=$NEXT_PUBLIC_ENV
RUN pnpm --filter @munaxa/admin... build

FROM node:${NODE_VERSION} AS runtime
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
WORKDIR /app
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

# Next.js standalone output (output: 'standalone'): a self-contained server with only the
# runtime node_modules it needs — no full workspace node_modules in the image. In a pnpm
# monorepo the server lands at <standalone>/apps/admin/server.js.
COPY --from=build --chown=nextjs:nodejs /repo/apps/admin/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /repo/apps/admin/.next/static ./apps/admin/.next/static
COPY --from=build --chown=nextjs:nodejs /repo/apps/admin/public ./apps/admin/public

USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||3000)+'/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/admin/server.js"]
