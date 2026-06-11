# syntax=docker/dockerfile:1
# Multi-stage build for the Munaxa Landing Page (Next.js standalone).
# Build context MUST be the repo root: docker build -f munaxalanding/Dockerfile -t munaxa-landing .
#
# This image is fully independent of the School OS apps (apps/api, apps/admin) — it can be
# built, deployed, and scaled on its own.

ARG NODE_VERSION=22-alpine

FROM node:${NODE_VERSION} AS base
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc turbo.json ./
COPY munaxalanding/package.json munaxalanding/
COPY packages/ packages/
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @munaxa/landing... build

FROM node:${NODE_VERSION} AS runtime
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

# Next.js standalone output (output: 'standalone' in next.config.mjs).
COPY --from=build /repo/munaxalanding/.next/standalone ./
COPY --from=build /repo/munaxalanding/.next/static ./munaxalanding/.next/static
COPY --from=build /repo/munaxalanding/public ./munaxalanding/public

USER nextjs
EXPOSE 3100
ENV PORT=3100
CMD ["node", "munaxalanding/server.js"]
