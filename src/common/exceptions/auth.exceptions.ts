import {
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';

/**
 * Authentication and authorization custom exceptions
 */
export class InvalidCredentialsException extends UnauthorizedException {
  constructor() {
    super({
      message: 'Invalid email or password',
      errorCode: 'INVALID_CREDENTIALS',
    });
  }
}

export class TokenExpiredException extends UnauthorizedException {
  constructor() {
    super({
      message: 'Authentication token has expired',
      errorCode: 'TOKEN_EXPIRED',
    });
  }
}

export class InvalidTokenException extends UnauthorizedException {
  constructor() {
    super({
      message: 'Invalid or malformed authentication token',
      errorCode: 'INVALID_TOKEN',
    });
  }
}

export class InsufficientPermissionsException extends ForbiddenException {
  constructor(requiredRole?: string) {
    super({
      message: 'Insufficient permissions to access this resource',
      errorCode: 'INSUFFICIENT_PERMISSIONS',
      details: requiredRole ? { requiredRole } : undefined,
    });
  }
}

export class EmailNotVerifiedException extends ForbiddenException {
  constructor() {
    super({
      message: 'Email address not verified',
      errorCode: 'EMAIL_NOT_VERIFIED',
    });
  }
}

export class OTPExpiredException extends BadRequestException {
  constructor() {
    super({
      message: 'OTP has expired. Please request a new one.',
      errorCode: 'OTP_EXPIRED',
    });
  }
}

export class InvalidOTPException extends BadRequestException {
  constructor() {
    super({
      message: 'Invalid OTP code',
      errorCode: 'INVALID_OTP',
    });
  }
}

export class TooManyOTPRequestsException extends BadRequestException {
  constructor(retryAfter: number) {
    super({
      message: 'Too many OTP requests. Please try again later.',
      errorCode: 'TOO_MANY_OTP_REQUESTS',
      details: { retryAfter },
    });
  }
}

export class AccountLockedException extends ForbiddenException {
  constructor(unlockTime?: Date) {
    super({
      message: 'Account is temporarily locked due to security reasons',
      errorCode: 'ACCOUNT_LOCKED',
      details: unlockTime ? { unlockTime: unlockTime.toISOString() } : undefined,
    });
  }
}
