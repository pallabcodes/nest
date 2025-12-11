import { HttpStatus } from '@nestjs/common';
import { BusinessException } from '@common/exceptions/business.exception';

/**
 * Custom Authentication Exceptions
 *
 * Domain-specific exceptions for better error handling and debugging
 */

export class UserAlreadyExistsException extends BusinessException {
  constructor(email: string) {
    super({
      errorCode: 'AUTH.USER_ALREADY_EXISTS',
      statusCode: HttpStatus.CONFLICT,
      message: `User with email ${email} already exists`,
      details: { email },
    });
  }
}

export class InvalidCredentialsException extends BusinessException {
  constructor() {
    super({
      errorCode: 'AUTH.INVALID_CREDENTIALS',
      statusCode: HttpStatus.UNAUTHORIZED,
      message: 'Invalid email or password',
    });
  }
}

export class UserNotFoundException extends BusinessException {
  constructor(identifier: string) {
    super({
      errorCode: 'AUTH.USER_NOT_FOUND',
      statusCode: HttpStatus.NOT_FOUND,
      message: `User not found: ${identifier}`,
      details: { identifier },
    });
  }
}

export class EmailAlreadyVerifiedException extends BusinessException {
  constructor() {
    super({
      errorCode: 'AUTH.EMAIL_ALREADY_VERIFIED',
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Email is already verified',
    });
  }
}

export class InvalidOtpException extends BusinessException {
  constructor() {
    super({
      errorCode: 'AUTH.INVALID_OTP',
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Invalid or expired OTP code',
    });
  }
}

export class RefreshTokenNotFoundException extends BusinessException {
  constructor() {
    super({
      errorCode: 'AUTH.REFRESH_TOKEN_NOT_FOUND',
      statusCode: HttpStatus.UNAUTHORIZED,
      message: 'Refresh token not found in request',
    });
  }
}
