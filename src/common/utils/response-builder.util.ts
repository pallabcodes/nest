import type { Response } from 'express';
import type {
  ApiResponse,
  PaginatedResponse,
  PaginationMeta,
  SuccessMessageResponse,
  ErrorResponse,
  ValidationErrorResponse,
} from '../../types/api';

/**
 * Response Builder Utility
 *
 * Core response building methods without Express prototype extensions.
 * Separated from response.util.ts for better organization.
 */
export class ResponseBuilder {
  static success<T>(res: Response, data: T, message?: string, statusCode: number = 200): Response {
    const response: ApiResponse<T> = {
      success: true,
      data,
      ...(message && { message }),
    };

    return res.status(statusCode).json(response);
  }

  static paginated<T>(
    res: Response,
    data: T[],
    pagination: PaginationMeta,
    message?: string,
    statusCode: number = 200,
  ): Response {
    const response: PaginatedResponse<T> = {
      success: true,
      data,
      pagination,
      ...(message && { message }),
    };

    return res.status(statusCode).json(response);
  }

  static successMessage(res: Response, message: string, statusCode: number = 200): Response {
    const response: SuccessMessageResponse = {
      success: true,
      data: null,
      message,
    };

    return res.status(statusCode).json(response);
  }

  static error(
    res: Response,
    message: string,
    statusCode: number = 500,
    errorCode?: string,
    details?: Record<string, unknown>,
  ): Response {
    const response: ErrorResponse = {
      success: false,
      message,
      ...(errorCode && { errorCode }),
      ...(details && { details }),
    };

    return res.status(statusCode).json(response);
  }

  static validationError(
    res: Response,
    errors: Array<{
      field: string;
      message: string;
      value?: unknown;
    }>,
    message: string = 'Validation failed',
  ): Response {
    const response: ValidationErrorResponse = {
      success: false,
      message,
      errors,
    };

    return res.status(422).json(response);
  }

  static notFound(
    res: Response,
    resource: string = 'Resource',
    identifier?: string | number,
  ): Response {
    const message = identifier
      ? `${resource} with id '${identifier}' not found`
      : `${resource} not found`;

    return this.error(res, message, 404, 'NOT_FOUND');
  }

  static unauthorized(res: Response, message: string = 'Unauthorized access'): Response {
    return this.error(res, message, 401, 'UNAUTHORIZED');
  }

  static forbidden(res: Response, message: string = 'Access forbidden'): Response {
    return this.error(res, message, 403, 'FORBIDDEN');
  }

  static conflict(res: Response, message: string = 'Resource conflict'): Response {
    return this.error(res, message, 409, 'CONFLICT');
  }

  static badRequest(res: Response, message: string = 'Bad request'): Response {
    return this.error(res, message, 400, 'BAD_REQUEST');
  }

  static internalServerError(
    res: Response,
    message: string = 'Internal server error',
    details?: Record<string, unknown>,
  ): Response {
    return this.error(res, message, 500, 'INTERNAL_SERVER_ERROR', details);
  }
}
