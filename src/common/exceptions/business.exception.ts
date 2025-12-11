import { HttpException, HttpStatus } from '@nestjs/common';

export interface BusinessErrorDetails {
  errorCode: string;
  statusCode?: HttpStatus;
  message?: string;
  details?: Record<string, unknown>;
}

/**
 * BusinessException
 *
 * Base class for domain or business rule violations.
 * These are expected errors that should be mapped to clean API responses
 * with stable error codes and optional details, without noisy stack traces.
 */
export class BusinessException extends HttpException {
  readonly errorCode: string;
  readonly details?: Record<string, unknown>;

  constructor(options: BusinessErrorDetails) {
    const {
      errorCode,
      statusCode = HttpStatus.BAD_REQUEST,
      message = 'Business rule violation',
      details,
    } = options;

    super(
      {
        success: false,
        message,
        errorCode,
        ...(details && { details }),
      },
      statusCode,
    );

    this.errorCode = errorCode;
    this.details = details;
  }
}

