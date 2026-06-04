import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  const base = {
    DATABASE_URL: 'postgresql://u:p@localhost:5432/db?schema=public',
  };

  it('applies defaults for optional values', () => {
    const env = validateEnv({ ...base });
    expect(env.PORT).toBe(4000);
    expect(env.NODE_ENV).toBe('development');
    expect(env.API_VERSION).toBe('v1');
  });

  it('throws when DATABASE_URL is missing', () => {
    expect(() => validateEnv({})).toThrow(/Invalid environment configuration/);
  });

  it('coerces numeric env vars', () => {
    const env = validateEnv({ ...base, PORT: '5000', THROTTLE_LIMIT: '50' });
    expect(env.PORT).toBe(5000);
    expect(env.THROTTLE_LIMIT).toBe(50);
  });
});
