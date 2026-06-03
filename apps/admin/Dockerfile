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
RUN pnpm --filter @munaxa/admin... build

FROM node:${NODE_VERSION} AS runtime
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

# Next.js standalone output (requires output: 'standalone' — enabled in Phase 15 hardening,
# falls back to full server here).
COPY --from=build /repo/apps/admin/.next ./.next
COPY --from=build /repo/apps/admin/public ./public
COPY --from=build /repo/apps/admin/package.json ./package.json
COPY --from=build /repo/node_modules ./node_modules

USER nextjs
EXPOSE 3000
CMD ["node_modules/.bin/next", "start", "-p", "3000"]
