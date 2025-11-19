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
    const { method, url } = request;
    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const { statusCode } = response;
          const delay = Date.now() - now;
          if (this.logger) {
            this.logger.log(`${method} ${url} ${statusCode} - ${delay}ms`);
          } else {
            console.log(`${method} ${url} ${statusCode} - ${delay}ms`);
          }
        },
        error: (error) => {
          const delay = Date.now() - now;
          if (this.logger) {
            if (error instanceof Error) {
              this.logger.logError(error, `${method} ${url} - ${delay}ms`, {
                method,
                url,
                delay,
              });
            } else {
              this.logger.error(
                `${method} ${url} - ${delay}ms - ${String(error)}`,
                undefined,
                'LoggingInterceptor',
              );
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
