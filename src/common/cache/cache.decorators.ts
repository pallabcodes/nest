import { SetMetadata } from '@nestjs/common';

export const CACHE_KEY = 'cache_key';
export const CACHE_TTL = 'cache_ttl';
export const CACHE_TAGS = 'cache_tags';
export const CACHE_CONDITION = 'cache_condition';

/**
 * Decorator to cache method results
 * @param key - Cache key (can include parameters with :param syntax)
 * @param ttl - Time to live in seconds (optional)
 * @param options - Additional cache options
 */
export function Cache(
  key: string,
  ttl?: number,
  options?: {
    tags?: string[];
    condition?: (result: any) => boolean;
  },
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    SetMetadata(CACHE_KEY, key)(target, propertyKey, descriptor);
    if (ttl) {
      SetMetadata(CACHE_TTL, ttl)(target, propertyKey, descriptor);
    }
    if (options?.tags) {
      SetMetadata(CACHE_TAGS, options.tags)(target, propertyKey, descriptor);
    }
    if (options?.condition) {
      SetMetadata(CACHE_CONDITION, options.condition)(target, propertyKey, descriptor);
    }
  };
}

/**
 * Decorator to invalidate cache by keys
 * @param keys - Cache keys to invalidate
 */
export function CacheInvalidate(keys: string[]) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    SetMetadata('cache_invalidate_keys', keys)(target, propertyKey, descriptor);
  };
}

/**
 * Decorator to invalidate cache by tags
 * @param tags - Cache tags to invalidate
 */
export function CacheInvalidateByTags(tags: string[]) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    SetMetadata('cache_invalidate_tags', tags)(target, propertyKey, descriptor);
  };
}

/**
 * Decorator to skip caching for a method
 */
export function SkipCache() {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    SetMetadata('skip_cache', true)(target, propertyKey, descriptor);
  };
}
