import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  Optional,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    @Optional()
    @Inject(LoggerService)
    private readonly logger?: LoggerService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, url, correlationId, user } = request;
    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const { statusCode } = response;
          const delay = Date.now() - now;

          if (this.logger) {
            this.logger.logHttpRequest(method, url, statusCode, delay, user?.id);
          } else {
            console.log(`${method} ${url} ${statusCode} - ${delay}ms`);
          }
        },
        error: (error) => {
          const delay = Date.now() - now;
          const statusCode = error?.status || 500;

          if (this.logger) {
            if (error instanceof Error) {
              this.logger.logError(error, `HTTP Request failed: ${method} ${url}`, {
                method,
                url,
                statusCode,
                delay,
                correlationId,
                userId: user?.id,
              });
            } else {
              this.logger.error(`HTTP Request failed: ${method} ${url}`, String(error), {
                method,
                url,
                statusCode,
                delay,
                correlationId,
                userId: user?.id,
              });
            }
          } else {
            console.error(
              `${method} ${url} - ${delay}ms - ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        },
      }),
    );
  }
}
