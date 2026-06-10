import { Injectable, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

/**
 * Password hashing and policy. Uses bcrypt (work factor 12). Argon2 is preferred in
 * production hardening (Phase 15) but bcrypt is dependency-light and portable for CI.
 */
@Injectable()
export class PasswordService {
  private readonly rounds = 12;

  async hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.rounds);
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

  async verify(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
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
