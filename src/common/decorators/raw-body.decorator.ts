import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * RawBody decorator
 * 
 * Bypasses ValidationPipe by directly accessing the raw request body
 * Use this for endpoints that need flexible data structures (like bulk operations)
 */
export const RawBody = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.body;
  },
);

