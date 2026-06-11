# syntax=docker/dockerfile:1
# Multi-stage build for the Munaxa Landing Page.
# Build context MUST be the repo root: docker build -f munaxalanding/Dockerfile -t munaxa-landing .
#
# This image is fully independent of the School OS apps (apps/api, apps/admin) — it can be
# built, deployed, and scaled on its own.
#
# NOTE: Cloudflare Workers (via `pnpm --filter @munaxa/landing deploy`, see README.md) is the
# primary deployment target. This Dockerfile is for self-hosting the same app on any
# Node-capable platform (e.g. behind your own reverse proxy / TLS termination).

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

# Production-only node_modules for @munaxa/landing, with workspace deps (e.g. @munaxa/ui)
# resolved into real files.
FROM build AS pruned
RUN pnpm --filter @munaxa/landing deploy --prod /prod/landing

FROM node:${NODE_VERSION} AS runtime
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

COPY --from=pruned /prod/landing ./
COPY --from=build /repo/munaxalanding/.next ./.next
COPY --from=build /repo/munaxalanding/public ./public

USER nextjs
EXPOSE 3100
ENV PORT=3100
CMD ["node_modules/.bin/next", "start", "-p", "3100"]
