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
