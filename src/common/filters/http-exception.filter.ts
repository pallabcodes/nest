import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Inject,
  Optional,
} from '@nestjs/common';
import { Response } from 'express';
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
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: ValidationError[] | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as Record<string, unknown>;
        message = (responseObj.message as string) || message;

        if (Array.isArray(responseObj.message)) {
          errors = (responseObj.message as string[]).map((msg) => ({
            field: 'general',
            message: msg,
          }));
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const errorResponse: ApiResponse = {
      success: false,
      message,
      errors,
    };

    // Properly log error with stack trace
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

    response.status(status).json(errorResponse);
  }
}
