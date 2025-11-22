import { Module, Global } from '@nestjs/common';
import { CacheService } from './cache.service';

/**
 * Cache Module
 *
 * Provides caching functionality throughout the application
 * Uses Redis when available, falls back to in-memory cache
 */
@Global()
@Module({
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
