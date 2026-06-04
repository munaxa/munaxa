import { Logger, type CallHandler, type ExecutionContext } from '@nestjs/common';
import { firstValueFrom, of } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';

function httpContext(req: Record<string, unknown>, res: Record<string, unknown>): ExecutionContext {
  return {
    getType: () => 'http',
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => res,
    }),
  } as unknown as ExecutionContext;
}

const handler = (): CallHandler => ({ handle: () => of({ ok: true }) });

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
    jest.restoreAllMocks();
  });

  it('logs a summary line including method, status, and tenant', async () => {
    const spy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const ctx = httpContext(
      {
        method: 'GET',
        url: '/api/v1/x',
        originalUrl: '/api/v1/x',
        path: '/api/v1/x',
        user: { tenantId: 't1', userId: 'u1' },
      },
      { statusCode: 200 },
    );

    await firstValueFrom(interceptor.intercept(ctx, handler()));

    expect(spy).toHaveBeenCalledTimes(1);
    const line = String(spy.mock.calls[0]?.[0] ?? '');
    expect(line).toContain('GET');
    expect(line).toContain('200');
    expect(line).toContain('tenant=t1');
    expect(line).toContain('user=u1');
  });

  it('warns on 4xx and skips health probes', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);

    await firstValueFrom(
      interceptor.intercept(
        httpContext({ method: 'GET', url: '/api/v1/y', path: '/api/v1/y' }, { statusCode: 403 }),
        handler(),
      ),
    );
    expect(warn).toHaveBeenCalledTimes(1);

    await firstValueFrom(
      interceptor.intercept(
        httpContext(
          { method: 'GET', url: '/health/ready', path: '/health/ready' },
          { statusCode: 200 },
        ),
        handler(),
      ),
    );
    // Health probe is not logged.
    expect(log).not.toHaveBeenCalled();
  });
});
