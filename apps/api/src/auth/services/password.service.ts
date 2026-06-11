import { Injectable, BadRequestException } from '@nestjs/common';
import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from 'node:crypto';
import * as bcrypt from 'bcryptjs';

// Explicit wrapper: util.promisify drops the overload that accepts ScryptOptions.
function scrypt(
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(password, salt, keylen, options, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

// scrypt parameters (OWASP recommendation: N=2^15, r=8, p=1 minimum for interactive logins).
const SCRYPT_N = 32768;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;
// scrypt needs 128*N*r bytes; give headroom so Node doesn't reject the params.
const SCRYPT_MAXMEM = 128 * SCRYPT_N * SCRYPT_R * 2;

/**
 * Password hashing and policy.
 *
 * New hashes use Node's built-in scrypt (memory-hard KDF, dependency-free) in the format
 * `scrypt:N:r:p:salt(base64):key(base64)`. Legacy bcrypt hashes ($2a$/$2b$, from the
 * pre-hardening era) still VERIFY, and {@link needsRehash} lets the auth flow transparently
 * upgrade them to scrypt on the next successful login.
 */
@Injectable()
export class PasswordService {
  async hash(plain: string): Promise<string> {
    const salt = randomBytes(SALT_LENGTH);
    const key = await scrypt(plain, salt, KEY_LENGTH, {
      N: SCRYPT_N,
      r: SCRYPT_R,
      p: SCRYPT_P,
      maxmem: SCRYPT_MAXMEM,
    });
    return `scrypt:${SCRYPT_N}:${SCRYPT_R}:${SCRYPT_P}:${salt.toString('base64')}:${key.toString('base64')}`;
  }

  async verify(plain: string, hash: string): Promise<boolean> {
    if (hash.startsWith('scrypt:')) {
      const parts = hash.split(':');
      if (parts.length !== 6) return false;
      const n = Number(parts[1]);
      const r = Number(parts[2]);
      const p = Number(parts[3]);
      const salt = Buffer.from(parts[4]!, 'base64');
      const expected = Buffer.from(parts[5]!, 'base64');
      if (!Number.isFinite(n) || !Number.isFinite(r) || !Number.isFinite(p)) return false;
      const key = await scrypt(plain, salt, expected.length, {
        N: n,
        r,
        p,
        maxmem: 128 * n * r * 2,
      });
      return key.length === expected.length && timingSafeEqual(key, expected);
    }
    // Legacy bcrypt hash from before the scrypt migration.
    return bcrypt.compare(plain, hash);
  }

  /** True when the stored hash should be transparently upgraded on the next successful login. */
  needsRehash(hash: string): boolean {
    if (!hash.startsWith('scrypt:')) return true;
    const parts = hash.split(':');
    return Number(parts[1]) < SCRYPT_N;
  }

  /**
   * Generate a random temporary password that satisfies the policy. Handed to an admin once when
   * provisioning/resetting an account (the user must change it at first login). Never logged.
   */
  generateTemporary(): string {
    const pick = (set: string) =>
      set[Math.floor((crypto.getRandomValues(new Uint32Array(1))[0]! / 2 ** 32) * set.length)]!;
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnpqrstuvwxyz';
    const digits = '23456789';
    const all = upper + lower + digits;
    const chars = [pick(upper), pick(lower), pick(digits), pick(digits)];
    while (chars.length < 12) chars.push(pick(all));
    // Fisher–Yates shuffle so the guaranteed-class characters aren't always in front.
    for (let i = chars.length - 1; i > 0; i--) {
      const j = Math.floor((crypto.getRandomValues(new Uint32Array(1))[0]! / 2 ** 32) * (i + 1));
      [chars[i], chars[j]] = [chars[j]!, chars[i]!];
    }
    return chars.join('');
  }

  /**
   * Enforce the password policy: min 10 chars, with upper, lower and a digit.
   * Throws BadRequestException on failure. (Breach-list checks are added in Phase 15.)
   */
  assertStrong(password: string): void {
    const failures: string[] = [];
    if (password.length < 10) failures.push('at least 10 characters');
    if (!/[A-Z]/.test(password)) failures.push('an uppercase letter');
    if (!/[a-z]/.test(password)) failures.push('a lowercase letter');
    if (!/\d/.test(password)) failures.push('a digit');
    if (failures.length > 0) {
      throw new BadRequestException(`Password must contain ${failures.join(', ')}.`);
    }
  }
}
