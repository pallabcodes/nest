/**
 * NeatORM Telescope Core Implementation
 *
 * The main telescope implementation that coordinates monitoring,
 * storage, and dashboard functionality.
 *
 * @module telescope/telescope-core
 */

import type {
  Plugin,
  PluginMetadata,
  PluginContext,
  MiddlewarePlugin,
  QueryResult,
} from '../plugins/plugin-interface.js';
import type {
  Telescope,
  TelescopeConfig,
  TelescopeEntry,
  TelescopeEntryType,
  TelescopeStorage,
  TelescopeWatcher,
  TelescopeDashboard,
  TelescopeStats,
  QueryEntry,
  TransactionEntry,
  CacheEntry,
  ConnectionEntry,
  EntityEntry,
  PerformanceEntry,
  ExceptionEntry,
} from './telescope-interface.js';

/**
 * Default in-memory storage implementation.
 */
class InMemoryTelescopeStorage implements TelescopeStorage {
  private entries: TelescopeEntry[] = [];
  private maxEntries = 10000;

  async store(entry: TelescopeEntry): Promise<void> {
    this.entries.push(entry);

    // Keep only the most recent entries
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }
  }

  async retrieve(options: {
    type?: TelescopeEntryType;
    tags?: string[];
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
    sortBy?: 'timestamp' | 'duration';
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<TelescopeEntry[]> {
    let filtered = [...this.entries];

    // Filter by type
    if (options.type) {
      filtered = filtered.filter(entry => entry.type === options.type);
    }

    // Filter by tags
    if (options.tags && options.tags.length > 0) {
      filtered = filtered.filter(entry =>
        options.tags!.some(tag => entry.tags.includes(tag))
      );
    }

    // Filter by date range
    if (options.startDate) {
      filtered = filtered.filter(entry => entry.timestamp >= options.startDate!);
    }
    if (options.endDate) {
      filtered = filtered.filter(entry => entry.timestamp <= options.endDate!);
    }

    // Sort
    const sortBy = options.sortBy || 'timestamp';
    const sortOrder = options.sortOrder || 'desc';

    filtered.sort((a, b) => {
      let comparison = 0;

      if (sortBy === 'timestamp') {
        comparison = a.timestamp.getTime() - b.timestamp.getTime();
      } else if (sortBy === 'duration' && a.metrics?.duration && b.metrics?.duration) {
        comparison = a.metrics.duration - b.metrics.duration;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    // Apply pagination
    const offset = options.offset || 0;
    const limit = options.limit || 100;

    return filtered.slice(offset, offset + limit);
  }

  async getStats(timeRange?: { start: Date; end: Date }): Promise<TelescopeStats> {
    const entries = timeRange
      ? await this.retrieve({ startDate: timeRange.start, endDate: timeRange.end })
      : this.entries;

    const entriesByType = entries.reduce((acc, entry) => {
      acc[entry.type] = (acc[entry.type] || 0) + 1;
      return acc;
    }, {} as Record<TelescopeEntryType, number>);

    // Calculate performance metrics
    const queries = entries.filter(e => e.type === TelescopeEntryType.QUERY) as QueryEntry[];
    const transactions = entries.filter(e => e.type === TelescopeEntryType.TRANSACTION) as TransactionEntry[];
    const caches = entries.filter(e => e.type === TelescopeEntryType.CACHE) as CacheEntry[];

    const avgQueryTime = queries.length > 0
      ? queries.reduce((sum, q) => sum + (q.metrics?.duration || 0), 0) / queries.length
      : 0;

    const slowQueries = queries.filter(q =>
      (q.metrics?.duration || 0) > 1000 // Default slow query threshold
    ).length;

    const avgTransactionTime = transactions.length > 0
      ? transactions.reduce((sum, t) => sum + (t.metrics?.duration || 0), 0) / transactions.length
      : 0;

    const cacheHits = caches.filter(c => c.content.hit).length;
    const cacheHitRate = caches.length > 0 ? (cacheHits / caches.length) * 100 : 0;

    return {
      entriesByType: entriesByType as any,
      performance: {
        avgQueryTime,
        slowQueries,
        totalQueries: queries.length,
        avgTransactionTime,
        cacheHitRate,
      },
      errors: {
        totalExceptions: entries.filter(e => e.type === TelescopeEntryType.EXCEPTION).length,
        queryErrors: queries.filter(q => q.content.error).length,
        transactionErrors: transactions.filter(t => t.content.error).length,
      },
      health: {
        activeConnections: 0, // Would need connection monitoring
        connectionPoolUtilization: 0,
        memoryUsage: process.memoryUsage().heapUsed,
      },
      timeRange: {
        start: entries.length > 0 ? entries[0].timestamp : new Date(),
        end: entries.length > 0 ? entries[entries.length - 1].timestamp : new Date(),
      },
    };
  }

  async prune(olderThan: Date): Promise<number> {
    const beforeCount = this.entries.length;
    this.entries = this.entries.filter(entry => entry.timestamp >= olderThan);
    return beforeCount - this.entries.length;
  }

  async getInfo(): Promise<{
    totalEntries: number;
    oldestEntry?: Date;
    newestEntry?: Date;
    storageSize?: number;
  }> {
    return {
      totalEntries: this.entries.length,
      oldestEntry: this.entries.length > 0 ? this.entries[0].timestamp : undefined,
      newestEntry: this.entries.length > 0 ? this.entries[this.entries.length - 1].timestamp : undefined,
      storageSize: JSON.stringify(this.entries).length,
    };
  }
}

/**
 * Default telescope watcher implementation.
 */
class DefaultTelescopeWatcher implements TelescopeWatcher {
  constructor(private config: TelescopeWatcherConfig) {}

  async record(entry: TelescopeEntry): Promise<void> {
    // Apply sampling
    if (Math.random() > this.config.samplingRate) {
      return;
    }

    // Add default tags
    entry.tags.push(...this.config.defaultTags);
  }

  shouldRecord(type: TelescopeEntryType): boolean {
    return this.config.enabledTypes.includes(type);
  }

  getConfig(): TelescopeWatcherConfig {
    return { ...this.config };
  }
}

/**
 * Telescope dashboard implementation.
 */
class TelescopeDashboardImpl implements TelescopeDashboard {
  constructor(private storage: TelescopeStorage) {}

  async getDashboardData(timeRange?: { start: Date; end: Date }): Promise<any> {
    const stats = await this.storage.getStats(timeRange);

    const recentEntries = await this.storage.retrieve({
      limit: 50,
      sortBy: 'timestamp',
      sortOrder: 'desc',
    });

    // Generate chart data (simplified)
    const queriesOverTime = await this.generateTimeSeriesData(
      TelescopeEntryType.QUERY,
      timeRange
    );

    const transactionsOverTime = await this.generateTimeSeriesData(
      TelescopeEntryType.TRANSACTION,
      timeRange
    );

    return {
      stats,
      recentEntries,
      charts: {
        queriesOverTime,
        transactionsOverTime,
        cacheOperations: [],
        errorsOverTime: [],
      },
      connections: [],
      slowQueries: [],
    };
  }

  subscribeToUpdates(callback: (entry: TelescopeEntry) => void): () => void {
    // In a real implementation, this would set up WebSocket or Server-Sent Events
    // For now, return a no-op unsubscribe function
    return () => {};
  }

  async search(query: string, options?: { type?: TelescopeEntryType; limit?: number }): Promise<TelescopeEntry[]> {
    // Simple text search implementation
    const entries = await this.storage.retrieve({
      type: options?.type,
      limit: options?.limit || 100,
    });

    return entries.filter(entry =>
      JSON.stringify(entry).toLowerCase().includes(query.toLowerCase())
    );
  }

  private async generateTimeSeriesData(
    type: TelescopeEntryType,
    timeRange?: { start: Date; end: Date }
  ): Promise<Array<{ timestamp: Date; count: number; avgDuration: number }>> {
    // Simplified time series generation
    // In a real implementation, this would aggregate data by time intervals
    return [];
  }
}

/**
 * Main telescope implementation.
 */
export class TelescopeImpl implements Telescope, MiddlewarePlugin {
  readonly metadata: PluginMetadata = {
    id: 'neat-orm-telescope',
    name: 'NeatORM Telescope',
    version: '1.0.0',
    description: 'Comprehensive monitoring and debugging tool for NeatORM',
    author: 'NeatORM Team',
    keywords: ['monitoring', 'debugging', 'performance', 'analytics'],
    supportedDialects: ['postgres', 'mysql', 'sqlite', 'sqlserver'],
  };

  readonly lifecycle = {
    onInit: (context: PluginContext) => {
      this.context = context;
      context.logger.info('NeatORM Telescope initialized');
    },
    onDestroy: () => {
      this.context?.logger.info('NeatORM Telescope destroyed');
    },
  };

  readonly queryMiddleware = {
    beforeExecute: this.onQueryBeforeExecute.bind(this),
    afterExecute: this.onQueryAfterExecute.bind(this),
  };

  private config: TelescopeConfig;
  private storage: TelescopeStorage;
  private watcher: TelescopeWatcher;
  private dashboard: TelescopeDashboard;
  private context?: PluginContext;

  constructor(config: Partial<TelescopeConfig> = {}) {
    this.config = {
      enabled: true,
      storage: new InMemoryTelescopeStorage(),
      watcher: {
        enabledTypes: [
          TelescopeEntryType.QUERY,
          TelescopeEntryType.TRANSACTION,
          TelescopeEntryType.CACHE,
          TelescopeEntryType.CONNECTION,
          TelescopeEntryType.ENTITY,
          TelescopeEntryType.EXCEPTION,
          TelescopeEntryType.PERFORMANCE,
        ],
        samplingRate: 1.0,
        slowQueryThreshold: 1000,
        maxBufferSize: 1000,
        defaultTags: ['neat-orm'],
      },
      ...config,
    };

    this.storage = this.config.storage;
    this.watcher = new DefaultTelescopeWatcher(this.config.watcher);
    this.dashboard = new TelescopeDashboardImpl(this.storage);
  }

  getConfig(): TelescopeConfig {
    return { ...this.config };
  }

  async record(entry: TelescopeEntry): Promise<void> {
    if (!this.config.enabled || !this.watcher.shouldRecord(entry.type)) {
      return;
    }

    await this.watcher.record(entry);
    await this.storage.store(entry);

    // Emit event for real-time updates
    this.context?.emit('telescope:entry-recorded', entry);
  }

  getDashboard(): TelescopeDashboard {
    return this.dashboard;
  }

  getStorage(): TelescopeStorage {
    return this.storage;
  }

  async clear(): Promise<void> {
    // In-memory storage doesn't persist, so this is a no-op
    // For persistent storage, this would clear the database
  }

  async getStats(timeRange?: { start: Date; end: Date }): Promise<TelescopeStats> {
    return this.storage.getStats(timeRange);
  }

  // Middleware hooks
  private onQueryBeforeExecute(
    sql: string,
    params: unknown[],
    context: PluginContext
  ): void {
    // Store start time for duration calculation
    (context as any)._telescopeQueryStart = Date.now();
    (context as any)._telescopeSql = sql;
    (context as any)._telescopeParams = params;
  }

  private async onQueryAfterExecute(
    sql: string,
    params: unknown[],
    result: QueryResult,
    context: PluginContext
  ): Promise<void> {
    const startTime = (context as any)._telescopeQueryStart;
    if (!startTime) return;

    const duration = Date.now() - startTime;

    const entry: QueryEntry = {
      id: `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: TelescopeEntryType.QUERY,
      timestamp: new Date(),
      content: {
        sql,
        params,
        dialect: this.context?.adapter.getConfig().dialect || 'unknown',
        result: {
          rowCount: result.rowCount,
          executionTime: duration,
        },
      },
      tags: ['query'],
      metrics: {
        duration,
      },
    };

    await this.record(entry);

    // Check for slow query
    if (duration > this.config.watcher.slowQueryThreshold) {
      this.context?.logger.warn('Slow query detected', {
        sql: sql.substring(0, 100),
        duration,
        threshold: this.config.watcher.slowQueryThreshold,
      });
    }
  }
}

/**
 * Create a telescope instance with default configuration.
 */
export function createTelescope(config: Partial<TelescopeConfig> = {}): Telescope {
  return new TelescopeImpl(config);
}

/**
 * Get default telescope configuration.
 */
export function getDefaultTelescopeConfig(): TelescopeConfig {
  return {
    enabled: true,
    storage: new InMemoryTelescopeStorage(),
    watcher: {
      enabledTypes: [
        TelescopeEntryType.QUERY,
        TelescopeEntryType.TRANSACTION,
        TelescopeEntryType.CACHE,
        TelescopeEntryType.CONNECTION,
        TelescopeEntryType.ENTITY,
        TelescopeEntryType.EXCEPTION,
        TelescopeEntryType.PERFORMANCE,
      ],
      samplingRate: 1.0,
      slowQueryThreshold: 1000,
      maxBufferSize: 1000,
      defaultTags: ['neat-orm'],
    },
  };
}
