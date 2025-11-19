/**
 * Neat Framework - Built-in Interceptors
 *
 * Common interceptor implementations for logging, caching, timeout, and other concerns.
 */

import type {
  Interceptor,
  InterceptorResult,
  InterceptorContext,
  CallHandler
} from './interceptor.interface';
import { Interceptor as InterceptorDecorator } from './interceptor.decorators';

/**
 * Logging interceptor - logs request/response details.
 */
@InterceptorDecorator({
  name: 'LoggingInterceptor',
  priority: 1,
  global: false
})
export class LoggingInterceptor implements Interceptor {
  constructor(
    private readonly logger: (message: string, data?: any) => void = console.log
  ) {}

  async intercept(context: InterceptorContext, next: CallHandler): Promise<InterceptorResult> {
    const { request, route, startTime } = context;

    // Log request start
    this.logger(`[${route.method}] ${route.path} - Start`, {
      controller: route.controller,
      handler: route.handler,
      timestamp: new Date().toISOString()
    });

    try {
      const result = await next.handle();

      // Log request completion
      const duration = Date.now() - startTime;
      this.logger(`[${route.method}] ${route.path} - Complete`, {
        duration: `${duration}ms`,
        success: result.success,
        timestamp: new Date().toISOString()
      });

      return result;
    } catch (error) {
      // Log request error
      const duration = Date.now() - startTime;
      this.logger(`[${route.method}] ${route.path} - Error`, {
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });

      throw error;
    }
  }
}

/**
 * Performance monitoring interceptor.
 */
@InterceptorDecorator({
  name: 'PerformanceInterceptor',
  priority: 2,
  global: false
})
export class PerformanceInterceptor implements Interceptor {
  private readonly metrics = new Map<string, { count: number; totalTime: number; avgTime: number }>();

  constructor(
    private readonly slowQueryThreshold: number = 1000, // 1 second
    private readonly logger: (message: string, data?: any) => void = console.warn
  ) {}

  async intercept(context: InterceptorContext, next: CallHandler): Promise<InterceptorResult> {
    const startTime = Date.now();
    const routeKey = `${context.route.method} ${context.route.path}`;

    try {
      const result = await next.handle();
      const duration = Date.now() - startTime;

      // Update metrics
      this.updateMetrics(routeKey, duration);

      // Log slow queries
      if (duration > this.slowQueryThreshold) {
        this.logger(`Slow query detected: ${routeKey}`, {
          duration: `${duration}ms`,
          threshold: `${this.slowQueryThreshold}ms`,
          controller: context.route.controller,
          handler: context.route.handler
        });
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.updateMetrics(routeKey, duration);
      throw error;
    }
  }

  private updateMetrics(routeKey: string, duration: number): void {
    const existing = this.metrics.get(routeKey) || { count: 0, totalTime: 0, avgTime: 0 };

    existing.count++;
    existing.totalTime += duration;
    existing.avgTime = existing.totalTime / existing.count;

    this.metrics.set(routeKey, existing);
  }

  /**
   * Get performance metrics.
   */
  getMetrics(): Record<string, { count: number; avgTime: number }> {
    const result: Record<string, { count: number; avgTime: number }> = {};

    for (const [key, value] of this.metrics.entries()) {
      result[key] = {
        count: value.count,
        avgTime: Math.round(value.avgTime * 100) / 100
      };
    }

    return result;
  }
}

/**
 * Caching interceptor - caches responses based on request.
 */
@InterceptorDecorator({
  name: 'CacheInterceptor',
  priority: 5,
  global: false
})
export class CacheInterceptor implements Interceptor {
  private readonly cache = new Map<string, { data: any; expiry: number }>();

  constructor(
    private readonly ttl: number = 300000, // 5 minutes
    private readonly maxSize: number = 1000
  ) {}

  async intercept(context: InterceptorContext, next: CallHandler): Promise<InterceptorResult> {
    const cacheKey = this.generateCacheKey(context);

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return { success: true, data: cached.data };
    }

    // Execute handler
    const result = await next.handle();

    // Cache successful responses
    if (result.success && result.data !== undefined) {
      this.setCache(cacheKey, result.data);

      // Cleanup if cache is too large
      if (this.cache.size > this.maxSize) {
        this.cleanup();
      }
    }

    return result;
  }

  private generateCacheKey(context: InterceptorContext): string {
    // Create cache key from route and query params
    const { route, request } = context;
    const queryString = request.query ? JSON.stringify(request.query) : '';
    return `${route.method}:${route.path}:${queryString}`;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + this.ttl
    });
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (value.expiry <= now) {
        this.cache.delete(key);
      }
    }

    // If still too large, remove oldest entries
    if (this.cache.size > this.maxSize) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].expiry - b[1].expiry);

      const toRemove = entries.slice(0, this.cache.size - this.maxSize);
      for (const [key] of toRemove) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cached data.
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics.
   */
  getCacheStats(): { size: number; maxSize: number; hitRate: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0 // Would need hit/miss counters for accurate rate
    };
  }
}

/**
 * Timeout interceptor - enforces request timeouts.
 */
@InterceptorDecorator({
  name: 'TimeoutInterceptor',
  priority: 10,
  global: false
})
export class TimeoutInterceptor implements Interceptor {
  constructor(private readonly timeoutMs: number = 30000) {} // 30 seconds

  async intercept(context: InterceptorContext, next: CallHandler): Promise<InterceptorResult> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Request timeout after ${this.timeoutMs}ms`));
      }, this.timeoutMs);
    });

    try {
      return await Promise.race([next.handle(), timeoutPromise]);
    } catch (error) {
      if (error instanceof Error && error.message.includes('timeout')) {
        return {
          success: false,
          error
        };
      }
      throw error;
    }
  }
}

/**
 * Response transformation interceptor.
 */
@InterceptorDecorator({
  name: 'TransformInterceptor',
  priority: 100,
  global: false
})
export class TransformInterceptor implements Interceptor {
  constructor(
    private readonly transformResponse?: (data: any, context: InterceptorContext) => any
  ) {}

  async intercept(context: InterceptorContext, next: CallHandler): Promise<InterceptorResult> {
    const result = await next.handle();

    if (result.success && this.transformResponse) {
      try {
        const transformedData = this.transformResponse(result.data, context);
        return {
          success: true,
          data: transformedData
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error : new Error('Response transformation failed')
        };
      }
    }

    return result;
  }
}

/**
 * Request transformation interceptor.
 */
@InterceptorDecorator({
  name: 'RequestTransformInterceptor',
  priority: -10,
  global: false
})
export class RequestTransformInterceptor implements Interceptor {
  constructor(
    private readonly transformRequest?: (context: InterceptorContext) => void
  ) {}

  async intercept(context: InterceptorContext, next: CallHandler): Promise<InterceptorResult> {
    if (this.transformRequest) {
      try {
        this.transformRequest(context);
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error : new Error('Request transformation failed')
        };
      }
    }

    return next.handle();
  }
}

/**
 * Exception mapping interceptor - maps exceptions to standardized responses.
 */
@InterceptorDecorator({
  name: 'ExceptionMappingInterceptor',
  priority: 50,
  global: false
})
export class ExceptionMappingInterceptor implements Interceptor {
  private readonly exceptionMappings = new Map<string, (error: Error) => any>();

  constructor(mappings?: Record<string, (error: Error) => any>) {
    if (mappings) {
      for (const [key, mapper] of Object.entries(mappings)) {
        this.exceptionMappings.set(key, mapper);
      }
    }
  }

  async intercept(context: InterceptorContext, next: CallHandler): Promise<InterceptorResult> {
    try {
      return await next.handle();
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');

      // Try to map the exception
      const mapper = this.exceptionMappings.get(err.name) ||
                    this.exceptionMappings.get(err.constructor.name);

      if (mapper) {
        return {
          success: false,
          error: mapper(err)
        };
      }

      // Default mapping
      return {
        success: false,
        error: {
          message: err.message,
          name: err.name,
          timestamp: new Date().toISOString(),
          path: context.route?.path
        } as any
      };
    }
  }

  /**
   * Add an exception mapping.
   */
  addMapping(exceptionType: string, mapper: (error: Error) => any): void {
    this.exceptionMappings.set(exceptionType, mapper);
  }
}

/**
 * Rate limiting interceptor.
 */
@InterceptorDecorator({
  name: 'RateLimitInterceptor',
  priority: 5,
  global: false
})
export class RateLimitInterceptor implements Interceptor {
  private readonly requests = new Map<string, { count: number; resetTime: number }>();

  constructor(
    private readonly maxRequests: number = 100,
    private readonly windowMs: number = 15 * 60 * 1000, // 15 minutes
    private readonly skipSuccessfulRequests: boolean = false,
    private readonly skipFailedRequests: boolean = false
  ) {}

  async intercept(context: InterceptorContext, next: CallHandler): Promise<InterceptorResult> {
    const clientId = this.getClientIdentifier(context);
    const now = Date.now();

    // Check rate limit
    const record = this.requests.get(clientId) || { count: 0, resetTime: now + this.windowMs };

    if (now > record.resetTime) {
      record.count = 0;
      record.resetTime = now + this.windowMs;
    }

    if (record.count >= this.maxRequests) {
      return {
        success: false,
        error: new Error(`Rate limit exceeded. Try again in ${Math.ceil((record.resetTime - now) / 1000)} seconds.`)
      };
    }

    // Execute request
    const result = await next.handle();

    // Update counter based on configuration
    if (!this.skipSuccessfulRequests && result.success) {
      record.count++;
    } else if (!this.skipFailedRequests && !result.success) {
      record.count++;
    } else {
      record.count++;
    }

    this.requests.set(clientId, record);

    // Cleanup old entries
    if (Math.random() < 0.01) { // 1% chance
      this.cleanup();
    }

    return result;
  }

  private getClientIdentifier(context: InterceptorContext): string {
    return context.user?.id?.toString() ||
           context.request.headers?.['x-forwarded-for'] ||
           context.request.headers?.['x-real-ip'] ||
           'anonymous';
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.requests.entries()) {
      if (now > record.resetTime) {
        this.requests.delete(key);
      }
    }
  }
}
