import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('hashes with scrypt and verifies a password', async () => {
    const hash = await service.hash('Sup3rSecret!');
    expect(hash).not.toBe('Sup3rSecret!');
    expect(hash.startsWith('scrypt:')).toBe(true);
    expect(await service.verify('Sup3rSecret!', hash)).toBe(true);
    expect(await service.verify('wrong', hash)).toBe(false);
  });

  it('produces unique salts per hash', async () => {
    const a = await service.hash('Sup3rSecret!');
    const b = await service.hash('Sup3rSecret!');
    expect(a).not.toBe(b);
  });

  it('still verifies legacy bcrypt hashes and flags them for rehash', async () => {
    const legacy = await bcrypt.hash('Sup3rSecret!', 10);
    expect(await service.verify('Sup3rSecret!', legacy)).toBe(true);
    expect(await service.verify('wrong', legacy)).toBe(false);
    expect(service.needsRehash(legacy)).toBe(true);
  });

  it('does not flag a fresh scrypt hash for rehash', async () => {
    const hash = await service.hash('Sup3rSecret!');
    expect(service.needsRehash(hash)).toBe(false);
  });

  it('rejects malformed scrypt hashes without throwing', async () => {
    expect(await service.verify('Sup3rSecret!', 'scrypt:not:a:valid')).toBe(false);
  });

  it('generates policy-compliant temporary passwords', () => {
    for (let i = 0; i < 20; i++) {
      const temp = service.generateTemporary();
      expect(() => service.assertStrong(temp)).not.toThrow();
    }
  });

  it('accepts a strong password', () => {
    expect(() => service.assertStrong('Sup3rSecret!')).not.toThrow();
  });

  it.each(['short1A', 'alllowercase1', 'ALLUPPERCASE1', 'NoDigitsHere'])(
    'rejects weak password %s',
    (weak) => {
      expect(() => service.assertStrong(weak)).toThrow(BadRequestException);
    },
  );
});
