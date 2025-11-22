import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../cache/cache.service';

export interface HealthStatus {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  version: string;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cache?: {
    hits: number;
    misses: number;
    hitRate: string;
  };
  database?: {
    status: 'connected' | 'disconnected' | 'unknown';
  };
}

/**
 * Minimal Health Service
 *
 * Provides basic health checks and metrics without overwhelming monitoring.
 * Shows essential health indicators for production monitoring.
 */
@Injectable()
export class HealthService {
  constructor(
    private configService: ConfigService,
    private cacheService: CacheService,
  ) {}

  /**
   * Get comprehensive health status
   */
  async getHealthStatus(): Promise<HealthStatus> {
    const memUsage = process.memoryUsage();
    const totalMem = memUsage.heapTotal;
    const usedMem = memUsage.heapUsed;

    const health: HealthStatus = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      version: this.configService.get('app.version', '1.0.0'),
      memory: {
        used: Math.round(usedMem / 1024 / 1024), // MB
        total: Math.round(totalMem / 1024 / 1024), // MB
        percentage: Math.round((usedMem / totalMem) * 100),
      },
    };

    // Add cache metrics
    const cacheStats = this.cacheService.getStats();
    health.cache = {
      hits: cacheStats.hits,
      misses: cacheStats.misses,
      hitRate: cacheStats.hitRate,
    };

    // Add database status
    try {
      // This is a basic check - in real implementation you'd test actual DB connection
      health.database = {
        status: 'connected', // Assume connected if service is running
      };
    } catch (error) {
      health.database = {
        status: 'disconnected',
      };
      health.status = 'error';
    }

    // Check memory usage threshold (mark as error if critical)
    if (health.memory.percentage > 95) {
      health.status = 'error';
    }

    return health;
  }

  /**
   * Readiness check for deployment
   */
  async getReadinessStatus() {
    // Basic readiness check - extend as needed
    const isReady = true; // Add actual readiness checks here

    return {
      status: isReady ? 'ready' : 'not ready' as 'ready' | 'not ready',
      timestamp: new Date().toISOString(),
      database: 'connected' as 'connected' | 'disconnected' | 'unknown',
    };
  }

  /**
   * Get basic metrics for monitoring
   */
  getMetrics() {
    return {
      uptime: Math.floor(process.uptime()),
      memory: process.memoryUsage(),
      version: this.configService.get('app.version', '1.0.0'),
      timestamp: new Date().toISOString(),
    };
  }
}
