import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import { type Observable, tap } from 'rxjs';
import type { AuthenticatedUser } from '../auth/auth.types';

/**
 * Structured access logging. Emits one line per request with method, path, status, duration, and
 * the acting tenant/user — never the request body or headers (no PII / secrets). Health checks are
 * skipped to avoid drowning the logs in load-balancer probes.
 *
 * Pairs with Sentry (errors/traces) for full observability; this is the request audit trail.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const http = context.switchToHttp();
    const req = http.getRequest<Request & { user?: AuthenticatedUser }>();
    const res = http.getResponse<Response>();

    if (req.path?.includes('/health/')) return next.handle();

    const startedAt = Date.now();
    const log = (outcome: 'ok' | 'error') => {
      const durationMs = Date.now() - startedAt;
      const tenant = req.user?.tenantId ?? '-';
      const user = req.user?.userId ?? 'anon';
      const line = `${req.method} ${req.originalUrl ?? req.url} ${res.statusCode} ${durationMs}ms tenant=${tenant} user=${user}`;
      if (outcome === 'error' || res.statusCode >= 500) this.logger.error(line);
      else if (res.statusCode >= 400) this.logger.warn(line);
      else this.logger.log(line);
    };

    return next.handle().pipe(
      tap({
        next: () => log('ok'),
        error: () => log('error'),
      }),
    );
  }
}
