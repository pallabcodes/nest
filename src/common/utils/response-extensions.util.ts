import type { Response } from 'express';
import type { PaginationMeta } from '../../types/api';
import { ResponseBuilder } from './response-builder.util';

/**
 * Response Extensions Utility
 *
 * Extends Express Response prototype with convenience methods.
 * Separated from response-builder for better organization.
 */

declare global {
  namespace Express {
    interface Response {
      apiSuccess<T>(data: T, message?: string, statusCode?: number): Response;
      apiPaginated<T>(data: T[], pagination: PaginationMeta, message?: string): Response;
      apiMessage(message: string, statusCode?: number): Response;
      apiError(
        message: string,
        statusCode?: number,
        errorCode?: string,
        details?: Record<string, unknown>,
      ): Response;
      apiValidationError(
        errors: Array<{ field: string; message: string; value?: unknown }>,
        message?: string,
      ): Response;
      apiNotFound(resource?: string, identifier?: string | number): Response;
      apiUnauthorized(message?: string): Response;
      apiForbidden(message?: string): Response;
      apiConflict(message?: string): Response;
      apiBadRequest(message?: string): Response;
      apiInternalError(message?: string, details?: Record<string, unknown>): Response;
    }
  }
}

// Add utility methods to Express Response prototype
Object.assign(Response.prototype, {
  apiSuccess<T>(this: Response, data: T, message?: string, statusCode: number = 200) {
    return ResponseBuilder.success(this, data, message, statusCode);
  },

  apiPaginated<T>(this: Response, data: T[], pagination: PaginationMeta, message?: string) {
    return ResponseBuilder.paginated(this, data, pagination, message);
  },

  apiMessage(this: Response, message: string, statusCode: number = 200) {
    return ResponseBuilder.successMessage(this, message, statusCode);
  },

  apiError(
    this: Response,
    message: string,
    statusCode: number = 500,
    errorCode?: string,
    details?: Record<string, unknown>,
  ) {
    return ResponseBuilder.error(this, message, statusCode, errorCode, details);
  },

  apiValidationError(
    this: Response,
    errors: Array<{ field: string; message: string; value?: unknown }>,
    message: string = 'Validation failed',
  ) {
    return ResponseBuilder.validationError(this, errors, message);
  },

  apiNotFound(this: Response, resource: string = 'Resource', identifier?: string | number) {
    return ResponseBuilder.notFound(this, resource, identifier);
  },

  apiUnauthorized(this: Response, message: string = 'Unauthorized access') {
    return ResponseBuilder.unauthorized(this, message);
  },

  apiForbidden(this: Response, message: string = 'Access forbidden') {
    return ResponseBuilder.forbidden(this, message);
  },

  apiConflict(this: Response, message: string = 'Resource conflict') {
    return ResponseBuilder.conflict(this, message);
  },

  apiBadRequest(this: Response, message: string = 'Bad request') {
    return ResponseBuilder.badRequest(this, message);
  },

  apiInternalError(
    this: Response,
    message: string = 'Internal server error',
    details?: Record<string, unknown>,
  ) {
    return ResponseBuilder.internalServerError(this, message, details);
  },
});
