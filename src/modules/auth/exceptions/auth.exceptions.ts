import { BadRequestException, ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';

/**
 * Custom Authentication Exceptions
 *
 * Domain-specific exceptions for better error handling and debugging
 */

export class UserAlreadyExistsException extends ConflictException {
  constructor(email: string) {
    super(`User with email ${email} already exists`);
  }
}

export class InvalidCredentialsException extends UnauthorizedException {
  constructor() {
    super('Invalid email or password');
  }
}

export class UserNotFoundException extends NotFoundException {
  constructor(identifier: string) {
    super(`User not found: ${identifier}`);
  }
}

export class EmailAlreadyVerifiedException extends BadRequestException {
  constructor() {
    super('Email is already verified');
  }
}

export class InvalidOtpException extends BadRequestException {
  constructor() {
    super('Invalid or expired OTP code');
  }
}

export class RefreshTokenNotFoundException extends UnauthorizedException {
  constructor() {
    super('Refresh token not found in request');
  }
}
