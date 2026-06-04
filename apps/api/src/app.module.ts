import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { SentryModule } from '@sentry/nestjs/setup';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { StructureModule } from './structure/structure.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { PermissionsGuard } from './auth/guards/permissions.guard';
import { TenantIsolationGuard } from './auth/guards/tenant-isolation.guard';
import { TenantContextInterceptor } from './auth/tenant-context.interceptor';

/**
 * Application root module.
 * Global concerns: config validation, Sentry, rate limiting, Prisma, health, and — from
 * Phase 3 — authentication (JWT), RBAC, and tenant-isolation guards + context binding.
 *
 * Guard order matters: rate limit → authenticate → authorize (permissions) → tenant isolation.
 */
@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnv }),
    ThrottlerModule.forRoot([
      {
        ttl: Number(process.env.THROTTLE_TTL ?? '60') * 1000,
        limit: Number(process.env.THROTTLE_LIMIT ?? '120'),
      },
    ]),
    PrismaModule,
    HealthModule,
    AuthModule,
    StructureModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_GUARD, useClass: TenantIsolationGuard },
    { provide: APP_INTERCEPTOR, useClass: TenantContextInterceptor },
  ],
})
export class AppModule {}
