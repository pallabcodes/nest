import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthRepository } from '../auth.repository';
import { OtpType } from '../../../database/models/otp.model';

export interface OtpGenerationResult {
  code: string;
  expiresAt: Date;
}

/**
 * OTP Service
 *
 * Handles OTP generation, validation, and management.
 * Separated from AuthService for better single responsibility.
 */
@Injectable()
export class OtpService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Generate OTP code
   */
  generateOtpCode(): string {
    const length = this.configService.get<number>('otp.length') || 6;
    const digits = '0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
      code += digits.charAt(Math.floor(Math.random() * digits.length));
    }
    return code;
  }

  /**
   * Generate and create OTP for user
   */
  async generateOtp(userId: number, type: OtpType): Promise<OtpGenerationResult> {
    const code = this.generateOtpCode();
    const expiration = this.configService.get<number>('otp.expiration') || 600000;
    const expiresAt = new Date(Date.now() + expiration);

    // Invalidate existing OTPs of this type
    await this.authRepository.invalidateUserOtps(userId, type);

    const otp = await this.authRepository.createOtp({
      userId,
      code,
      type,
      expiresAt,
    });

    // Handle Sequelize model serialization
    const otpCode = otp.code || (otp as any).get?.('code') || (otp as any).toJSON?.()?.code;
    const otpExpiresAt =
      otp.expiresAt || (otp as any).get?.('expiresAt') || (otp as any).toJSON?.()?.expiresAt;

    if (!otpCode) {
      throw new Error('Failed to generate OTP code');
    }

    return {
      code: otpCode,
      expiresAt: otpExpiresAt,
    };
  }

  /**
   * Get OTP expiration time
   */
  getOtpExpiration(): number {
    return this.configService.get<number>('otp.expiration') || 600000;
  }
}
