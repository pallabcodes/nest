import { OtpType } from '../../../database/models/otp.model';

/**
 * OTP Interface Definitions
 *
 * Type-safe interfaces for OTP-related operations.
 */

export interface CreateOtpData {
  userId?: number;
  code: string;
  type: OtpType;
  expiresAt: Date;
}

export interface OtpValidationResult {
  isValid: boolean;
  otp?: any;
  error?: string;
}
