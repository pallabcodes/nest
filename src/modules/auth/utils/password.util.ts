import * as bcrypt from 'bcrypt';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Password Utility
 *
 * Centralized password hashing and validation logic.
 * Easy to test, maintain, and potentially replace (e.g., with Argon2).
 */
@Injectable()
export class PasswordUtil {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Hash a plain text password
   */
  async hash(password: string): Promise<string> {
    const rounds = this.configService.get<number>('bcrypt.rounds') || 12;
    return bcrypt.hash(password, rounds);
  }

  /**
   * Verify a password against its hash
   */
  async verify(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Check if password meets strength requirements
   */
  validateStrength(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
