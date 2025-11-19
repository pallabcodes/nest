/**
 * NeatORM Telescope - Monitoring & Debugging Interface
 *
 * Inspired by Laravel Telescope, NeatORM Telescope provides comprehensive
 * insights into your ORM operations, performance, and behavior.
 *
 * Features:
 * - Real-time query monitoring and analysis
 * - Transaction tracking and performance metrics
 * - Cache operations monitoring
 * - Connection pool health tracking
 * - Entity lifecycle event logging
 * - Slow query detection and alerting
 * - Web-based dashboard for visualization
 *
 * @module telescope/telescope-interface
 */

import type { Plugin } from '../plugins/plugin-interface.js';

/**
 * Telescope entry types for different monitoring categories.
 */
export enum TelescopeEntryType {
  QUERY = 'query',
  TRANSACTION = 'transaction',
  CACHE = 'cache',
  CONNECTION = 'connection',
  ENTITY = 'entity',
  MIGRATION = 'migration',
  SEEDING = 'seeding',
  EXCEPTION = 'exception',
  PERFORMANCE = 'performance',
  CUSTOM = 'custom',
}

/**
 * Base telescope entry interface.
 */
export interface TelescopeEntry {
  /**
   * Unique entry identifier.
   */
  id: string;

  /**
   * Entry type.
   */
  type: TelescopeEntryType;

  /**
   * Timestamp when entry was recorded.
   */
  timestamp: Date;

  /**
   * Entry content/data.
   */
  content: Record<string, unknown>;

  /**
   * Associated tags for filtering and searching.
   */
  tags: string[];

  /**
   * Performance metrics (if applicable).
   */
  metrics?: {
    duration?: number;
    memoryUsage?: number;
    cpuUsage?: number;
  };

  /**
   * Request context (if applicable).
   */
  context?: {
    requestId?: string;
    userId?: string | number;
    sessionId?: string;
    ipAddress?: string;
  };
}

/**
 * Query-specific telescope entry.
 */
export interface QueryEntry extends TelescopeEntry {
  type: TelescopeEntryType.QUERY;
  content: {
    sql: string;
    params: unknown[];
    dialect: string;
    connectionId?: string;
    result?: {
      rowCount: number;
      executionTime: number;
    };
    error?: {
      message: string;
      code: string;
    };
  };
  metrics: {
    duration: number;
    memoryUsage?: number;
  };
}

/**
 * Transaction-specific telescope entry.
 */
export interface TransactionEntry extends TelescopeEntry {
  type: TelescopeEntryType.TRANSACTION;
  content: {
    transactionId: string;
    operation: 'begin' | 'commit' | 'rollback';
    queries: QueryEntry[];
    isolationLevel?: string;
    error?: {
      message: string;
      code: string;
    };
  };
  metrics: {
    duration: number;
    queryCount: number;
  };
}

/**
 * Cache-specific telescope entry.
 */
export interface CacheEntry extends TelescopeEntry {
  type: TelescopeEntryType.CACHE;
  content: {
    operation: 'get' | 'set' | 'delete' | 'clear' | 'has';
    key: string;
    hit: boolean;
    size?: number;
    ttl?: number;
    provider: string;
  };
  metrics: {
    duration: number;
  };
}

/**
 * Connection-specific telescope entry.
 */
export interface ConnectionEntry extends TelescopeEntry {
  type: TelescopeEntryType.CONNECTION;
  content: {
    operation: 'connect' | 'disconnect' | 'acquire' | 'release' | 'ping';
    poolId?: string;
    connectionId?: string;
    poolStats?: {
      total: number;
      idle: number;
      waiting: number;
    };
  };
  metrics: {
    duration?: number;
  };
}

/**
 * Entity-specific telescope entry.
 */
export interface EntityEntry extends TelescopeEntry {
  type: TelescopeEntryType.ENTITY;
  content: {
    entityName: string;
    operation: 'create' | 'update' | 'delete' | 'find' | 'findMany';
    entityId?: string | number;
    changes?: Record<string, { old: unknown; new: unknown }>;
    relations?: string[];
  };
  metrics: {
    duration: number;
  };
}

/**
 * Performance-specific telescope entry.
 */
export interface PerformanceEntry extends TelescopeEntry {
  type: TelescopeEntryType.PERFORMANCE;
  content: {
    metric: string;
    value: number;
    unit: string;
    threshold?: number;
    breached?: boolean;
  };
  metrics: {
    duration: number;
  };
}

/**
 * Exception-specific telescope entry.
 */
export interface ExceptionEntry extends TelescopeEntry {
  type: TelescopeEntryType.EXCEPTION;
  content: {
    message: string;
    stack?: string;
    code?: string;
    context: Record<string, unknown>;
  };
}

/**
 * Telescope storage interface.
 */
export interface TelescopeStorage {
  /**
   * Store a telescope entry.
   */
  store(entry: TelescopeEntry): Promise<void>;

  /**
   * Retrieve entries with optional filtering.
   */
  retrieve(options?: {
    type?: TelescopeEntryType;
    tags?: string[];
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
    sortBy?: 'timestamp' | 'duration';
    sortOrder?: 'asc' | 'desc';
  }): Promise<TelescopeEntry[]>;

  /**
   * Get aggregated statistics.
   */
  getStats(timeRange?: {
    start: Date;
    end: Date;
  }): Promise<TelescopeStats>;

  /**
   * Clear old entries.
   */
  prune(olderThan: Date): Promise<number>;

  /**
   * Get storage info.
   */
  getInfo(): Promise<{
    totalEntries: number;
    oldestEntry?: Date;
    newestEntry?: Date;
    storageSize?: number;
  }>;
}

/**
 * Telescope statistics.
 */
export interface TelescopeStats {
  /**
   * Total entries by type.
   */
  entriesByType: Record<TelescopeEntryType, number>;

  /**
   * Performance metrics.
   */
  performance: {
    avgQueryTime: number;
    slowQueries: number;
    totalQueries: number;
    avgTransactionTime: number;
    cacheHitRate: number;
  };

  /**
   * Error metrics.
   */
  errors: {
    totalExceptions: number;
    queryErrors: number;
    transactionErrors: number;
  };

  /**
   * System health.
   */
  health: {
    activeConnections: number;
    connectionPoolUtilization: number;
    memoryUsage: number;
  };

  /**
   * Time range covered by stats.
   */
  timeRange: {
    start: Date;
    end: Date;
  };
}

/**
 * Telescope watcher interface.
 */
export interface TelescopeWatcher {
  /**
   * Record a telescope entry.
   */
  record(entry: TelescopeEntry): Promise<void>;

  /**
   * Check if watcher should record entries of given type.
   */
  shouldRecord(type: TelescopeEntryType): boolean;

  /**
   * Get watcher configuration.
   */
  getConfig(): TelescopeWatcherConfig;
}

/**
 * Telescope watcher configuration.
 */
export interface TelescopeWatcherConfig {
  /**
   * Enabled entry types.
   */
  enabledTypes: TelescopeEntryType[];

  /**
   * Sampling rate (0.0 to 1.0, where 1.0 = 100% sampling).
   */
  samplingRate: number;

  /**
   * Slow query threshold in milliseconds.
   */
  slowQueryThreshold: number;

  /**
   * Maximum entries to keep in memory buffer.
   */
  maxBufferSize: number;

  /**
   * Tags to apply to all entries.
   */
  defaultTags: string[];
}

/**
 * Telescope dashboard interface.
 */
export interface TelescopeDashboard {
  /**
   * Get dashboard data for given time range.
   */
  getDashboardData(timeRange?: {
    start: Date;
    end: Date;
  }): Promise<DashboardData>;

  /**
   * Get real-time updates.
   */
  subscribeToUpdates(callback: (entry: TelescopeEntry) => void): () => void;

  /**
   * Search entries.
   */
  search(query: string, options?: {
    type?: TelescopeEntryType;
    limit?: number;
  }): Promise<TelescopeEntry[]>;
}

/**
 * Dashboard data structure.
 */
export interface DashboardData {
  /**
   * Summary statistics.
   */
  stats: TelescopeStats;

  /**
   * Recent entries.
   */
  recentEntries: TelescopeEntry[];

  /**
   * Performance charts data.
   */
  charts: {
    queriesOverTime: Array<{ timestamp: Date; count: number; avgDuration: number }>;
    transactionsOverTime: Array<{ timestamp: Date; count: number; avgDuration: number }>;
    cacheOperations: Array<{ operation: string; count: number; avgDuration: number }>;
    errorsOverTime: Array<{ timestamp: Date; count: number }>;
  };

  /**
   * Active connections and pools.
   */
  connections: Array<{
    id: string;
    type: string;
    status: 'active' | 'idle' | 'waiting';
    lastActivity: Date;
  }>;

  /**
   * Slow queries summary.
   */
  slowQueries: QueryEntry[];
}

/**
 * Telescope configuration.
 */
export interface TelescopeConfig {
  /**
   * Enable/disable telescope.
   */
  enabled: boolean;

  /**
   * Storage backend.
   */
  storage: TelescopeStorage;

  /**
   * Watcher configuration.
   */
  watcher: TelescopeWatcherConfig;

  /**
   * Dashboard configuration.
   */
  dashboard?: {
    port?: number;
    host?: string;
    auth?: {
      enabled: boolean;
      username?: string;
      password?: string;
    };
  };

  /**
   * Alerting configuration.
   */
  alerting?: {
    enabled: boolean;
    slowQueryThreshold: number;
    errorThreshold: number;
    emailRecipients?: string[];
  };

  /**
   * Data retention policy.
   */
  retention?: {
    maxAge: number; // in days
    pruneInterval: number; // in hours
  };
}

/**
 * Main telescope interface.
 */
export interface Telescope extends Plugin {
  /**
   * Get telescope configuration.
   */
  getConfig(): TelescopeConfig;

  /**
   * Record an entry.
   */
  record(entry: TelescopeEntry): Promise<void>;

  /**
   * Get dashboard data.
   */
  getDashboard(): TelescopeDashboard;

  /**
   * Get storage interface.
   */
  getStorage(): TelescopeStorage;

  /**
   * Clear all entries.
   */
  clear(): Promise<void>;

  /**
   * Get telescope stats.
   */
  getStats(timeRange?: { start: Date; end: Date }): Promise<TelescopeStats>;
}
