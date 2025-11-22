/**
 * Authentication Constants
 *
 * Centralized constants for auth operations to improve maintainability
 */

export const AUTH_CONSTANTS = {
  // Cookie settings
  COOKIES: {
    ACCESS_TOKEN: {
      NAME: 'accessToken',
      MAX_AGE: 15 * 60 * 1000, // 15 minutes
      HTTP_ONLY: true,
      SECURE: process.env.NODE_ENV === 'production',
      SAME_SITE: 'strict' as const,
    },
    REFRESH_TOKEN: {
      NAME: 'refreshToken',
      MAX_AGE: 7 * 24 * 60 * 60 * 1000, // 7 days
      HTTP_ONLY: true,
      SECURE: process.env.NODE_ENV === 'production',
      SAME_SITE: 'strict' as const,
    },
  },

  // Error messages
  ERRORS: {
    USER_EXISTS: 'User with this email already exists',
    INVALID_CREDENTIALS: 'Invalid credentials',
    USER_NOT_FOUND: 'User not found',
    EMAIL_ALREADY_VERIFIED: 'Email already verified',
    INVALID_OTP: 'Invalid or expired OTP',
    EMAIL_NOT_EXISTS: 'If the email exists, a password reset OTP has been sent',
    PASSWORD_RESET_SUCCESS: 'Password reset successfully',
    OTP_SENT: 'OTP sent successfully',
    EMAIL_VERIFIED: 'Email verified successfully',
    REFRESH_TOKEN_NOT_FOUND: 'Refresh token not found',
  },

  // Default values
  DEFAULTS: {
    BCRYPT_ROUNDS: 12,
    USER_ROLE: 'USER',
  },
} as const;
