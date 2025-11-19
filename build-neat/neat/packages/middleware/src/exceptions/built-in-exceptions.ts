/**
 * Neat Framework - Built-in Exceptions
 *
 * Common exception classes for HTTP errors and application errors.
 * These exceptions are automatically mapped to appropriate HTTP status codes.
 */

import { BaseException } from './exception.interface';

/**
 * Bad Request Exception (400)
 */
export class BadRequestException extends BaseException {
  readonly statusCode = 400;
  errorCode = 'BAD_REQUEST';
}

/**
 * Unauthorized Exception (401)
 */
export class UnauthorizedException extends BaseException {
  readonly statusCode = 401;
  errorCode = 'UNAUTHORIZED';
}

/**
 * Forbidden Exception (403)
 */
export class ForbiddenException extends BaseException {
  readonly statusCode = 403;
  errorCode = 'FORBIDDEN';
}

/**
 * Not Found Exception (404)
 */
export class NotFoundException extends BaseException {
  readonly statusCode = 404;
  readonly errorCode = 'NOT_FOUND';
}

/**
 * Method Not Allowed Exception (405)
 */
export class MethodNotAllowedException extends BaseException {
    readonly statusCode = 405;
    readonly errorCode = 'METHOD_NOT_ALLOWED';
}

/**
 * Conflict Exception (409)
 */
export class ConflictException extends BaseException {
  readonly statusCode = 409;
  readonly errorCode = 'CONFLICT';
}

/**
 * Unprocessable Entity Exception (422)
 */
export class UnprocessableEntityException extends BaseException {
  readonly statusCode = 422;
  readonly errorCode = 'UNPROCESSABLE_ENTITY';
}

/**
 * Too Many Requests Exception (429)
 */
export class TooManyRequestsException extends BaseException {
  readonly statusCode = 429;
  errorCode = 'TOO_MANY_REQUESTS';
}

/**
 * Internal Server Error Exception (500)
 */
export class InternalServerErrorException extends BaseException {
  readonly statusCode = 500;
  errorCode = 'INTERNAL_SERVER_ERROR';
}

/**
 * Not Implemented Exception (501)
 */
export class NotImplementedException extends BaseException {
  readonly statusCode = 501;
  errorCode = 'NOT_IMPLEMENTED';
}

/**
 * Bad Gateway Exception (502)
 */
export class BadGatewayException extends BaseException {
  readonly statusCode = 502;
  errorCode = 'BAD_GATEWAY';
}

/**
 * Service Unavailable Exception (503)
 */
export class ServiceUnavailableException extends BaseException {
  readonly statusCode = 503;
  errorCode = 'SERVICE_UNAVAILABLE';
}

/**
 * Validation Exception - for validation errors
 */
export class ValidationException extends BadRequestException {
  errorCode = 'VALIDATION_ERROR';

  constructor(
    message: string = 'Validation failed',
    public readonly validationErrors: any[] = []
  ) {
    super(message, { validationErrors });
  }
}

/**
 * Authentication Exception - for auth failures
 */
export class AuthenticationException extends UnauthorizedException {
  errorCode = 'AUTHENTICATION_FAILED';

  constructor(message: string = 'Authentication failed') {
    super(message);
  }
}

/**
 * Authorization Exception - for permission failures
 */
export class AuthorizationException extends ForbiddenException {
  errorCode = 'AUTHORIZATION_FAILED';

  constructor(
    message: string = 'Insufficient permissions',
    public readonly requiredPermissions?: string[]
  ) {
    super(message, { requiredPermissions });
  }
}

/**
 * Database Exception - for database errors
 */
export class DatabaseException extends InternalServerErrorException {
  errorCode = 'DATABASE_ERROR';

  constructor(
    message: string = 'Database operation failed',
    public readonly operation?: string,
    public readonly originalError?: Error
  ) {
    super(message, { operation, originalError: originalError?.message });
  }
}

/**
 * Timeout Exception - for request timeouts
 */
export class TimeoutException extends InternalServerErrorException {
  errorCode = 'TIMEOUT_ERROR';

  constructor(
    message: string = 'Request timeout',
    public readonly timeoutMs?: number
  ) {
    super(message, { timeoutMs });
  }
}

/**
 * Rate Limit Exception - for rate limiting
 */
export class RateLimitException extends TooManyRequestsException {
  errorCode = 'RATE_LIMIT_EXCEEDED';

  constructor(
    message: string = 'Rate limit exceeded',
    public readonly retryAfter?: number
  ) {
    super(message, { retryAfter });
  }
}

/**
 * File Upload Exception - for file upload errors
 */
export class FileUploadException extends BadRequestException {
  errorCode = 'FILE_UPLOAD_ERROR';

  constructor(
    message: string = 'File upload failed',
    public readonly fieldName?: string,
    public readonly maxSize?: number
  ) {
    super(message, { fieldName, maxSize });
  }
}
