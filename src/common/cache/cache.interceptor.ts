import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CacheService } from './cache.service';
import { CACHE_KEY, CACHE_TTL, CACHE_TAGS, CACHE_CONDITION } from './cache.decorators';

/**
 * Cache Interceptor
 *
 * Automatically caches method results based on @Cache decorator
 * and handles cache invalidation based on @CacheInvalidate decorators
 */
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    @Optional()
    @Inject(CacheService)
    private readonly cacheService?: CacheService,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    if (!this.cacheService) {
      return next.handle();
    }

    const cacheKey = this.reflector.get<string>(CACHE_KEY, context.getHandler());
    const skipCache = this.reflector.get<boolean>('skip_cache', context.getHandler());

    if (skipCache || !cacheKey) {
      return this.handleInvalidation(context, next);
    }

    // Generate dynamic cache key with parameters
    const resolvedKey = this.resolveCacheKey(cacheKey, context);

    try {
      // Try to get from cache first
      const cachedResult = await this.cacheService.get(resolvedKey);
      if (cachedResult !== null) {
        return of(cachedResult);
      }

      // Execute method and cache result
      return next.handle().pipe(
        tap(async (result) => {
          if (!this.cacheService) {
            return;
          }

          const condition = this.reflector.get<(result: any) => boolean>(
            CACHE_CONDITION,
            context.getHandler(),
          );

          // Only cache if condition is met (if provided)
          if (!condition || condition(result)) {
            const ttl = this.reflector.get<number>(CACHE_TTL, context.getHandler());
            const tags = this.reflector.get<string[]>(CACHE_TAGS, context.getHandler());

            await this.cacheService.set(resolvedKey, result, {
              ttl,
              tags,
            });
          }
        }),
      );
    } catch (error) {
      // Continue without caching if cache fails
      return next.handle();
    }
  }

  /**
   * Handle cache invalidation after method execution
   */
  private handleInvalidation(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      tap(async () => {
        if (!this.cacheService) {
          return;
        }

        const invalidateKeys = this.reflector.get<string[]>(
          'cache_invalidate_keys',
          context.getHandler(),
        );
        const invalidateTags = this.reflector.get<string[]>(
          'cache_invalidate_tags',
          context.getHandler(),
        );

        if (invalidateKeys) {
          for (const key of invalidateKeys) {
            const resolvedKey = this.resolveCacheKey(key, context);
            await this.cacheService.delete(resolvedKey);
          }
        }

        if (invalidateTags) {
          await this.cacheService.deleteByTags(invalidateTags);
        }
      }),
    );
  }

  /**
   * Resolve dynamic cache key with parameters
   */
  private resolveCacheKey(key: string, context: ExecutionContext): string {
    const request = context.switchToHttp().getRequest();
    const params = { ...request.params, ...request.query };

    // Replace :param placeholders with actual values
    let resolvedKey = key;
    for (const [param, value] of Object.entries(params)) {
      resolvedKey = resolvedKey.replace(`:${param}`, String(value));
    }

    // Add user ID to cache key for user-specific data
    if (request.user?.id) {
      resolvedKey = `${resolvedKey}:user_${request.user.id}`;
    }

    return resolvedKey;
  }
}
