import { RegisterDto } from '../../dto/register.dto';
import { LoginDto } from '../../dto/login.dto';
import { VerifyOtpDto } from '../../dto/verify-otp.dto';
import { ForgotPasswordDto } from '../../dto/forgot-password.dto';
import { ResetPasswordDto } from '../../dto/reset-password.dto';
import { RefreshTokenDto } from '../../dto/refresh-token.dto';
import { ResendOtpDto } from '../../dto/resend-otp.dto';

// Re-export DTOs for convenience
export type { RegisterDto, LoginDto, VerifyOtpDto, ForgotPasswordDto, ResetPasswordDto, RefreshTokenDto, ResendOtpDto };

/**
 * Auth Strategy Interface
 *
 * Defines the contract for different authentication approaches.
 * Each strategy encapsulates a complete auth flow while maintaining
 * consistent external API.
 */
export interface AuthStrategy {
  /**
   * Register a new user
   */
  register(registerDto: RegisterDto): Promise<AuthResult>;

  /**
   * Authenticate existing user
   */
  login(loginDto: LoginDto): Promise<AuthResult>;

  /**
   * Verify email with OTP
   */
  verifyEmail?(verifyOtpDto: VerifyOtpDto): Promise<AuthResult>;

  /**
   * Resend OTP for verification or password reset
   */
  resendOtp?(resendOtpDto: any): Promise<AuthResult>;

  /**
   * Initiate password reset
   */
  forgotPassword?(forgotPasswordDto: ForgotPasswordDto): Promise<AuthResult>;

  /**
   * Reset password with OTP
   */
  resetPassword?(resetPasswordDto: ResetPasswordDto): Promise<AuthResult>;

  /**
   * Refresh access token
   */
  refreshToken(refreshTokenDto: RefreshTokenDto): Promise<TokenResult>;

  /**
   * Get current user profile
   */
  getCurrentUser(userId: number): Promise<UserProfile>;
}

/**
 * Auth Result - Standardized response from auth operations
 */
export interface AuthResult {
  success: boolean;
  user?: UserProfile;
  tokens?: TokenPair;
  otp?: OtpInfo;
  message?: string;
  requiresVerification?: boolean;
}

/**
 * Token Result - For token-only operations
 */
export interface TokenResult {
  tokens: TokenPair;
}

/**
 * Token Pair - Access and refresh tokens
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * User Profile - Standardized user information
 */
export interface UserProfile {
  id: number;
  email: string;
  name: string;
  phone?: string | null;
  isEmailVerified: boolean;
  isActive?: boolean;
  roles: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * OTP Information
 */
export interface OtpInfo {
  code: string;
  expiresAt: Date;
  type?: string;
}
