# syntax=docker/dockerfile:1
# Multi-stage build for the Munaxa Landing Page (standalone app).
# Build context is this directory: docker build -t munaxa-landing .
#
# NOTE: Cloudflare Workers (via `pnpm run deploy`, see README.md) is the primary deployment
# target. This Dockerfile is for self-hosting the same app on any Node-capable platform
# (e.g. behind your own reverse proxy / TLS termination).

ARG NODE_VERSION=22-alpine

FROM node:${NODE_VERSION} AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# Production-only node_modules.
FROM base AS prod-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prod

FROM node:${NODE_VERSION} AS runtime
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public

USER nextjs
EXPOSE 3100
ENV PORT=3100
CMD ["node_modules/.bin/next", "start", "-p", "3100"]
