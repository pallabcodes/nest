/**
 * Neat Framework - Built-in Exception Filters
 *
 * Common exception filter implementations for handling various error types.
 */

import type { ExceptionFilter, ExceptionFilterResult, ExceptionFilterContext } from './exception.interface';
import { ExceptionFilter as ExceptionFilterDecorator, Catch } from './exception.decorators';
import { BaseException } from './exception.interface';

/**
 * HTTP Exception Filter - handles BaseException instances.
 */
@ExceptionFilterDecorator({
  name: 'HttpExceptionFilter',
  priority: 10,
  global: true
})
@Catch('BaseException')
export class HttpExceptionFilter implements ExceptionFilter<BaseException> {
  catch(exception: BaseException, context: ExceptionFilterContext): ExceptionFilterResult {
    return exception.toHttpResponse();
  }
}

/**
 * Validation Exception Filter - handles validation errors.
 */
@ExceptionFilterDecorator({
  name: 'ValidationExceptionFilter',
  priority: 20,
  global: false
})
@Catch('ValidationException')
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: any, context: ExceptionFilterContext): ExceptionFilterResult {
    if (exception.errorCode === 'VALIDATION_ERROR' && exception.validationErrors) {
      return {
        statusCode: 422,
        response: {
          success: false,
          error: {
            message: exception.message,
            code: exception.errorCode,
            type: 'VALIDATION_ERROR',
            timestamp: context.timestamp.toISOString(),
            path: context.route?.path,
            validationErrors: exception.validationErrors
          }
        }
      };
    }

    // Fallback for class-validator errors
    return {
      statusCode: 422,
      response: {
        success: false,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          type: 'VALIDATION_ERROR',
          timestamp: context.timestamp.toISOString(),
          path: context.route?.path,
          validationErrors: exception
        }
      }
    };
  }
}

/**
 * Authentication Exception Filter.
 */
@ExceptionFilterDecorator({
  name: 'AuthenticationExceptionFilter',
  priority: 15,
  global: false
})
@Catch('AuthenticationException', 'UnauthorizedException')
export class AuthenticationExceptionFilter implements ExceptionFilter {
  catch(exception: any, context: ExceptionFilterContext): ExceptionFilterResult {
    return {
      statusCode: 401,
      response: {
        success: false,
        error: {
          message: exception.message || 'Authentication required',
          code: exception.errorCode || 'AUTHENTICATION_FAILED',
          type: 'AUTHENTICATION_ERROR',
          timestamp: context.timestamp.toISOString(),
          path: context.route?.path
        }
      },
      headers: {
        'WWW-Authenticate': 'Bearer'
      }
    };
  }
}

/**
 * Authorization Exception Filter.
 */
@ExceptionFilterDecorator({
  name: 'AuthorizationExceptionFilter',
  priority: 15,
  global: false
})
@Catch('AuthorizationException', 'ForbiddenException')
export class AuthorizationExceptionFilter implements ExceptionFilter {
  catch(exception: any, context: ExceptionFilterContext): ExceptionFilterResult {
    return {
      statusCode: 403,
      response: {
        success: false,
        error: {
          message: exception.message || 'Access denied',
          code: exception.errorCode || 'AUTHORIZATION_FAILED',
          type: 'AUTHORIZATION_ERROR',
          timestamp: context.timestamp.toISOString(),
          path: context.route?.path,
          requiredPermissions: exception.requiredPermissions
        }
      }
    };
  }
}

/**
 * Database Exception Filter.
 */
@ExceptionFilterDecorator({
  name: 'DatabaseExceptionFilter',
  priority: 25,
  global: false
})
@Catch('DatabaseException')
export class DatabaseExceptionFilter implements ExceptionFilter {
  catch(exception: any, context: ExceptionFilterContext): ExceptionFilterResult {
    // Don't expose internal database errors in production
    const isDevelopment = process.env.NODE_ENV === 'development';

    return {
      statusCode: 500,
      response: {
        success: false,
        error: {
          message: isDevelopment ? exception.message : 'Internal server error',
          code: 'DATABASE_ERROR',
          type: 'DATABASE_ERROR',
          timestamp: context.timestamp.toISOString(),
          path: context.route?.path,
          ...(isDevelopment && {
            operation: exception.operation,
            originalError: exception.originalError?.message
          })
        }
      }
    };
  }
}

/**
 * Global Exception Filter - catches all unhandled exceptions.
 */
@ExceptionFilterDecorator({
  name: 'GlobalExceptionFilter',
  priority: 100,
  global: true
})
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: Error, context: ExceptionFilterContext): ExceptionFilterResult {
    // Log the error
    console.error('Unhandled exception:', {
      error: exception.message,
      stack: exception.stack,
      route: context.route,
      user: context.user?.id,
      timestamp: context.timestamp.toISOString()
    });

    // Don't expose stack traces in production
    const isDevelopment = process.env.NODE_ENV === 'development';

    return {
      statusCode: 500,
      response: {
        success: false,
        error: {
          message: isDevelopment ? exception.message : 'Internal server error',
          code: 'INTERNAL_ERROR',
          type: exception.name,
          timestamp: context.timestamp.toISOString(),
          path: context.route?.path,
          ...(isDevelopment && { stack: exception.stack })
        }
      }
    };
  }
}

/**
 * Timeout Exception Filter.
 */
@ExceptionFilterDecorator({
  name: 'TimeoutExceptionFilter',
  priority: 20,
  global: false
})
@Catch('TimeoutException')
export class TimeoutExceptionFilter implements ExceptionFilter {
  catch(exception: any, context: ExceptionFilterContext): ExceptionFilterResult {
    return {
      statusCode: 408,
      response: {
        success: false,
        error: {
          message: exception.message || 'Request timeout',
          code: 'TIMEOUT_ERROR',
          type: 'TIMEOUT_ERROR',
          timestamp: context.timestamp.toISOString(),
          path: context.route?.path,
          timeoutMs: exception.timeoutMs
        }
      }
    };
  }
}

/**
 * Rate Limit Exception Filter.
 */
@ExceptionFilterDecorator({
  name: 'RateLimitExceptionFilter',
  priority: 5,
  global: false
})
@Catch('RateLimitException')
export class RateLimitExceptionFilter implements ExceptionFilter {
  catch(exception: any, context: ExceptionFilterContext): ExceptionFilterResult {
    const retryAfter = exception.retryAfter || 60;

    return {
      statusCode: 429,
      response: {
        success: false,
        error: {
          message: exception.message || 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          type: 'RATE_LIMIT_ERROR',
          timestamp: context.timestamp.toISOString(),
          path: context.route?.path,
          retryAfter
        }
      },
      headers: {
        'Retry-After': retryAfter.toString(),
        'X-RateLimit-Reset': new Date(Date.now() + retryAfter * 1000).toISOString()
      }
    };
  }
}

/**
 * File Upload Exception Filter.
 */
@ExceptionFilterDecorator({
  name: 'FileUploadExceptionFilter',
  priority: 15,
  global: false
})
@Catch('FileUploadException')
export class FileUploadExceptionFilter implements ExceptionFilter {
  catch(exception: any, context: ExceptionFilterContext): ExceptionFilterResult {
    return {
      statusCode: 400,
      response: {
        success: false,
        error: {
          message: exception.message || 'File upload failed',
          code: 'FILE_UPLOAD_ERROR',
          type: 'FILE_UPLOAD_ERROR',
          timestamp: context.timestamp.toISOString(),
          path: context.route?.path,
          fieldName: exception.fieldName,
          maxSize: exception.maxSize
        }
      }
    };
  }
}
