import { Injectable } from '@nestjs/common';
import { OtpService } from '../services/otp.service';

/**
 * OTP Utility
 *
 * Centralized OTP generation and validation logic.
 * Easy to modify OTP behavior without touching service logic.
 */
@Injectable()
export class OtpUtil {
  constructor(private readonly otpService: OtpService) {}

  /**
   * Generate OTP with custom length
   */
  generateCode(length: number = 6): string {
    return this.otpService.generateOtpCode();
  }

  /**
   * Validate OTP format
   */
  isValidFormat(code: string): boolean {
    // Only digits, length between 4-8
    return /^\d{4,8}$/.test(code);
  }

  /**
   * Check if OTP is expired
   */
  isExpired(expiresAt: Date): boolean {
    return new Date() > expiresAt;
  }

  /**
   * Get remaining time before expiration (in minutes)
   */
  getRemainingTime(expiresAt: Date): number {
    const remaining = expiresAt.getTime() - Date.now();
    return Math.max(0, Math.floor(remaining / (1000 * 60)));
  }

  /**
   * Format OTP for display (mask most digits)
   */
  maskOtp(code: string): string {
    if (code.length <= 2) return '*'.repeat(code.length);
    return code.slice(0, 2) + '*'.repeat(code.length - 2);
  }
}
