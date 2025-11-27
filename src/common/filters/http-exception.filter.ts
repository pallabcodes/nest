import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Inject,
  Optional,
} from '@nestjs/common';
import { ApiResponse, ValidationError } from '../dto/api-response.dto';
import { LoggerService } from '../logger/logger.service';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(
    @Optional()
    @Inject(LoggerService)
    private readonly logger?: LoggerService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<any>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: ValidationError[] | undefined;

    let errorCode: string | undefined;
    let details: Record<string, unknown> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as Record<string, unknown>;
        message = (responseObj.message as string) || message;
        errorCode = responseObj.errorCode as string;
        details = responseObj.details as Record<string, unknown>;

        if (Array.isArray(responseObj.message)) {
          errors = (responseObj.message as string[]).map((msg) => ({
            field: 'general',
            message: msg,
          }));
        } else if (responseObj.errors) {
          errors = responseObj.errors as ValidationError[];
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const errorResponse: ApiResponse = {
      success: false,
      message,
      errors,
      ...(errorCode && { errorCode }),
      ...(details && { details }),
    };

    // Skip logging for common browser requests that result in 404s
    const shouldSkipLogging =
      status === HttpStatus.NOT_FOUND &&
      (request.url === '/favicon.ico' ||
        request.url.startsWith('/favicon') ||
        request.url === '/robots.txt');

    // Properly log error with stack trace (skip for common browser requests)
    if (!shouldSkipLogging) {
      if (this.logger) {
        if (exception instanceof Error) {
          this.logger.logError(
            exception,
            `${request.method} ${request.url} - ${status} - ${message}`,
            {
              method: request.method,
              url: request.url,
              status,
            },
          );
        } else {
          this.logger.error(
            `${request.method} ${request.url} - ${status} - ${message}`,
            undefined,
            'HttpExceptionFilter',
          );
        }
      } else {
        // Fallback to console if logger not available
        console.error(
          `${request.method} ${request.url} - ${status} - ${message}`,
          exception instanceof Error ? exception.stack : '',
        );
      }
    }

    // Support both Express and Fastify style responses
    if (typeof (response as any).json === 'function') {
      (response as any).status(status).json(errorResponse);
    } else if (typeof (response as any).send === 'function') {
      (response as any).status(status).send(errorResponse);
    } else if (typeof (response as any).end === 'function') {
      (response as any).status(status).end(JSON.stringify(errorResponse));
    }
  }
}
