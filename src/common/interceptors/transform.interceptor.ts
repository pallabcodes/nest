import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SuccessResponse } from '../dto/api-response.dto';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, SuccessResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<SuccessResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // If data is already a SuccessResponse, return it as is
        if (data && typeof data === 'object' && 'success' in data) {
          return data as SuccessResponse<T>;
        }
        // Otherwise, wrap it in SuccessResponse
        return new SuccessResponse(data);
      }),
    );
  }
}
