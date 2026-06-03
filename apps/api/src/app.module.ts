import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { SentryModule } from '@sentry/nestjs/setup';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';

/**
 * Application root module (Phase 1 — foundation only).
 * Wires global concerns: config validation, Sentry, rate limiting, Prisma, health.
 * Business/domain modules are added in later phases.
 */
@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: Number(process.env.THROTTLE_TTL ?? '60') * 1000,
        limit: Number(process.env.THROTTLE_LIMIT ?? '120'),
      },
    ]),
    PrismaModule,
    HealthModule,
  ],
  providers: [
    // Global rate limiting (OWASP A04/A07). Tightened per-route in Phase 3/15.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
