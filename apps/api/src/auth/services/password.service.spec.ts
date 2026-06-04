import { BadRequestException } from '@nestjs/common';
import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('hashes and verifies a password', async () => {
    const hash = await service.hash('Sup3rSecret!');
    expect(hash).not.toBe('Sup3rSecret!');
    expect(await service.verify('Sup3rSecret!', hash)).toBe(true);
    expect(await service.verify('wrong', hash)).toBe(false);
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
