import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';

/**
 * User-related custom exceptions with consistent error responses
 */
export class UserNotFoundException extends NotFoundException {
  constructor(userId: string | number) {
    super({
      message: 'User not found',
      errorCode: 'USER_NOT_FOUND',
      details: { userId },
    });
  }
}

export class UserAlreadyExistsException extends ConflictException {
  constructor(identifier: string) {
    super({
      message: 'User already exists',
      errorCode: 'USER_ALREADY_EXISTS',
      details: { identifier },
    });
  }
}

export class InvalidUserDataException extends BadRequestException {
  constructor(details: Record<string, any>) {
    super({
      message: 'Invalid user data provided',
      errorCode: 'INVALID_USER_DATA',
      details,
    });
  }
}

export class UserInactiveException extends BadRequestException {
  constructor(userId: string | number) {
    super({
      message: 'User account is inactive',
      errorCode: 'USER_INACTIVE',
      details: { userId },
    });
  }
}
