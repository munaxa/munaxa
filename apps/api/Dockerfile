# syntax=docker/dockerfile:1
# Multi-stage build for the Munaxa API. Build context MUST be the repo root
# (monorepo). Example: docker build -f apps/api/Dockerfile -t munaxa-api .

ARG NODE_VERSION=22-alpine

# ---------- Base ----------
FROM node:${NODE_VERSION} AS base
RUN corepack enable
WORKDIR /repo

# ---------- Dependencies ----------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc turbo.json ./
COPY apps/api/package.json apps/api/
COPY packages/ packages/
COPY prisma/ prisma/
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ---------- Build ----------
FROM deps AS build
COPY . .
RUN pnpm --filter @munaxa/api prisma:generate \
    && pnpm --filter @munaxa/api... build

# ---------- Runtime ----------
FROM node:${NODE_VERSION} AS runtime
ENV NODE_ENV=production
WORKDIR /app
# Non-root user (security hardening)
RUN addgroup -S nodejs && adduser -S nestjs -G nodejs

COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/package.json ./package.json
COPY --from=build /repo/prisma ./prisma

USER nestjs
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||4000)+'/api/v1/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/main.js"]
