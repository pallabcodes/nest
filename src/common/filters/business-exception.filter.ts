import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { BusinessException } from '../exceptions/business.exception';
import { ApiResponse } from '../dto/api-response.dto';
import { LoggerService } from '../logger/logger.service';

@Catch(BusinessException)
export class BusinessExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: BusinessException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<any>();
    const request = ctx.getRequest();

    const status = exception.getStatus?.() ?? HttpStatus.BAD_REQUEST;
    const errorCode = exception.errorCode;

    const body = exception.getResponse() as {
      message?: string;
      errorCode?: string;
      details?: Record<string, unknown>;
    };

    const message = body.message || 'Business error';
    const details = body.details;

    const errorResponse: ApiResponse = {
      success: false,
      message,
      ...(errorCode && { errorCode }),
      ...(details && { details }),
    };

    this.logger.warn('Business exception', {
      method: request.method,
      url: request.url,
      status,
      errorCode,
    });

    if (typeof (response as any).json === 'function') {
      (response as any).status(status).json(errorResponse);
    } else if (typeof (response as any).send === 'function') {
      (response as any).status(status).send(errorResponse);
    } else if (typeof (response as any).end === 'function') {
      (response as any).status(status).end(JSON.stringify(errorResponse));
    }
  }
}

