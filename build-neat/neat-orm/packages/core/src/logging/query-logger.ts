/**
 * Query Logger
 *
 * Provides comprehensive query logging and monitoring for production environments.
 * Supports multiple log levels, formatters, and transports.
 *
 * @module logging/query-logger
 */

// Timer functions - available in Node.js global scope
type TimerId = number | unknown;
declare const setTimeout: (callback: () => void, delay: number) => TimerId;
declare const clearTimeout: (id: TimerId) => void;

/**
 * Log level enumeration.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Query log entry.
 */
export interface QueryLogEntry {
  /**
   * Unique log ID.
   */
  id: string;

  /**
   * Timestamp.
   */
  timestamp: Date;

  /**
   * Log level.
   */
  level: LogLevel;

  /**
   * SQL query.
   */
  query: string;

  /**
   * Query parameters.
   */
  params?: unknown[];

  /**
   * Execution time in milliseconds.
   */
  executionTime: number;

  /**
   * Number of rows affected/returned.
   */
  rowCount?: number;

  /**
   * Query type (SELECT, INSERT, UPDATE, DELETE, etc.).
   */
  queryType: string;

  /**
   * Error (if query failed).
   */
  error?: Error;

  /**
   * Additional context.
   */
  context?: Record<string, unknown>;

  /**
   * Transaction ID (if in transaction).
   */
  transactionId?: string;

  /**
   * Connection ID.
   */
  connectionId?: string;

  /**
   * Whether query was cached.
   */
  cached?: boolean;
}

/**
 * Query statistics.
 */
export interface QueryStatistics {
  /**
   * Total queries executed.
   */
  totalQueries: number;

  /**
   * Queries by type.
   */
  byType: Record<string, number>;

  /**
   * Average execution time.
   */
  avgExecutionTime: number;

  /**
   * Min execution time.
   */
  minExecutionTime: number;

  /**
   * Max execution time.
   */
  maxExecutionTime: number;

  /**
   * Total execution time.
   */
  totalExecutionTime: number;

  /**
   * Failed queries.
   */
  failedQueries: number;

  /**
   * Cached queries.
   */
  cachedQueries: number;

  /**
   * Slow queries (> threshold).
   */
  slowQueries: number;
}

/**
 * Query logger options.
 */
export interface QueryLoggerOptions {
  /**
   * Minimum log level.
   * Default: 'info'
   */
  level?: LogLevel;

  /**
   * Whether to log query parameters.
   * Default: true
   */
  logParams?: boolean;

  /**
   * Whether to log execution time.
   * Default: true
   */
  logExecutionTime?: boolean;

  /**
   * Slow query threshold in milliseconds.
   * Queries slower than this will be logged as warnings.
   * Default: 1000 (1 second)
   */
  slowQueryThreshold?: number;

  /**
   * Whether to collect statistics.
   * Default: true
   */
  collectStats?: boolean;

  /**
   * Maximum number of logs to keep in memory.
   * Default: 1000
   */
  maxLogs?: number;

  /**
   * Custom formatter function.
   */
  formatter?: (entry: QueryLogEntry) => string;

  /**
   * Log transport (console, file, etc.).
   */
  transport?: LogTransport;

  /**
   * Whether to sanitize sensitive data in logs.
   * Default: true
   */
  sanitize?: boolean;

  /**
   * Patterns to sanitize (e.g., passwords, tokens).
   */
  sanitizePatterns?: RegExp[];
}

/**
 * Log transport interface.
 */
export interface LogTransport {
  /**
   * Write a log entry.
   */
  write(entry: QueryLogEntry, formatted: string): void | Promise<void>;

  /**
   * Flush buffered logs.
   */
  flush?(): void | Promise<void>;

  /**
   * Close the transport.
   */
  close?(): void | Promise<void>;
}

/**
 * Console log transport.
 */
export class ConsoleTransport implements LogTransport {
  write(entry: QueryLogEntry, formatted: string): void {
    const method = entry.level === 'error' ? 'error' : entry.level === 'warn' ? 'warn' : 'log';
    // eslint-disable-next-line no-console
    const consoleObj = (globalThis as { console?: { error?: (...args: unknown[]) => void; warn?: (...args: unknown[]) => void; log?: (...args: unknown[]) => void } }).console;
    if (consoleObj) {
      if (method === 'error' && consoleObj.error) {
        consoleObj.error(formatted);
      } else if (method === 'warn' && consoleObj.warn) {
        consoleObj.warn(formatted);
      } else if (consoleObj.log) {
        consoleObj.log(formatted);
      }
    }
  }
}

/**
 * File log transport (Node.js only).
 */
export class FileTransport implements LogTransport {
  private buffer: string[] = [];
  private writeTimeout?: TimerId;

  constructor(
    private filePath: string,
    private options: { bufferSize?: number; flushInterval?: number } = {}
  ) {}

  write(entry: QueryLogEntry, formatted: string): void {
    this.buffer.push(formatted + '\n');

    if (this.buffer.length >= (this.options.bufferSize || 100)) {
      this.flush();
    }
  }

  flush(): void {
    if (this.buffer.length === 0) return;

    const content = this.buffer.join('');
    this.buffer = [];

    // In a real implementation, write to file using fs
    // For now, this is a placeholder
    // fs.appendFileSync(this.filePath, content);
  }

  close(): void {
    this.flush();
    if (this.writeTimeout) {
      clearTimeout(this.writeTimeout);
    }
  }
}

/**
 * Query logger for monitoring and debugging.
 */
export class QueryLogger {
  private logs: QueryLogEntry[] = [];
  private stats: QueryStatistics = {
    totalQueries: 0,
    byType: {},
    avgExecutionTime: 0,
    minExecutionTime: Infinity,
    maxExecutionTime: 0,
    totalExecutionTime: 0,
    failedQueries: 0,
    cachedQueries: 0,
    slowQueries: 0,
  };

  private options: {
    level: LogLevel;
    logParams: boolean;
    logExecutionTime: boolean;
    slowQueryThreshold: number;
    collectStats: boolean;
    maxLogs: number;
    sanitize: boolean;
    formatter?: (entry: QueryLogEntry) => string;
    transport: LogTransport;
    sanitizePatterns: RegExp[];
  };

  constructor(options: QueryLoggerOptions = {}) {
    const baseOptions = {
      level: options.level || 'info',
      logParams: options.logParams ?? true,
      logExecutionTime: options.logExecutionTime ?? true,
      slowQueryThreshold: options.slowQueryThreshold || 1000,
      collectStats: options.collectStats ?? true,
      maxLogs: options.maxLogs || 1000,
      sanitize: options.sanitize ?? true,
      transport: options.transport || new ConsoleTransport(),
      sanitizePatterns: options.sanitizePatterns || [
        /password\s*=\s*['"].*?['"]/gi,
        /token\s*=\s*['"].*?['"]/gi,
        /secret\s*=\s*['"].*?['"]/gi,
      ],
    };
    
    this.options = options.formatter 
      ? { ...baseOptions, formatter: options.formatter }
      : baseOptions;
  }

  /**
   * Log a query execution.
   */
  log(entry: Omit<QueryLogEntry, 'id' | 'timestamp'>): void {
    const fullEntry: QueryLogEntry = {
      ...entry,
      id: this.generateId(),
      timestamp: new Date(),
    };

    // Sanitize sensitive data
    if (this.options.sanitize) {
      fullEntry.query = this.sanitizeQuery(fullEntry.query);
    }

    // Determine log level
    if (!fullEntry.level) {
      if (fullEntry.error) {
        fullEntry.level = 'error';
      } else if (fullEntry.executionTime > this.options.slowQueryThreshold) {
        fullEntry.level = 'warn';
      } else {
        fullEntry.level = 'info';
      }
    }

    // Check if should log based on level
    if (!this.shouldLog(fullEntry.level)) {
      return;
    }

    // Add to logs
    this.logs.push(fullEntry);
    if (this.logs.length > this.options.maxLogs) {
      this.logs.shift();
    }

    // Update statistics
    if (this.options.collectStats) {
      this.updateStats(fullEntry);
    }

    // Format and write to transport
    const formatted = this.format(fullEntry);
    if (this.options.transport) {
      this.options.transport.write(fullEntry, formatted);
    }
  }

  /**
   * Log a successful query.
   */
  logQuery(
    query: string,
    params: unknown[] | undefined,
    executionTime: number,
    rowCount?: number,
    context?: Record<string, unknown>
  ): void {
    const level: LogLevel = executionTime > this.options.slowQueryThreshold ? 'warn' : 'info';
    const baseEntry = {
      level,
      query,
      params: params || [],
      executionTime,
      queryType: this.extractQueryType(query),
    };
    
    this.log({
      ...baseEntry,
      ...(rowCount !== undefined && { rowCount }),
      ...(context !== undefined && { context }),
    });
  }

  /**
   * Log a failed query.
   */
  logError(
    query: string,
    params: unknown[] | undefined,
    error: Error,
    executionTime: number,
    context?: Record<string, unknown>
  ): void {
    const baseEntry = {
      level: 'error' as const,
      query,
      params: params || [],
      executionTime,
      queryType: this.extractQueryType(query),
      error,
    };
    
    this.log({
      ...baseEntry,
      ...(context !== undefined && { context }),
    });
  }

  /**
   * Log a slow query.
   */
  logSlowQuery(
    query: string,
    params: unknown[] | undefined,
    executionTime: number,
    rowCount?: number,
    context?: Record<string, unknown>
  ): void {
    const baseEntry = {
      level: 'warn' as const,
      query,
      params: params || [],
      executionTime,
      queryType: this.extractQueryType(query),
    };
    
    this.log({
      ...baseEntry,
      ...(rowCount !== undefined && { rowCount }),
      ...(context !== undefined && { context }),
    });
  }

  /**
   * Get query logs.
   */
  getLogs(filter?: { level?: LogLevel; queryType?: string; limit?: number }): QueryLogEntry[] {
    let filtered = this.logs;

    if (filter?.level) {
      filtered = filtered.filter(log => log.level === filter.level);
    }

    if (filter?.queryType) {
      filtered = filtered.filter(log => log.queryType === filter.queryType);
    }

    if (filter?.limit) {
      filtered = filtered.slice(-filter.limit);
    }

    return filtered;
  }

  /**
   * Get query statistics.
   */
  getStats(): QueryStatistics {
    return { ...this.stats };
  }

  /**
   * Reset statistics.
   */
  resetStats(): void {
    this.stats = {
      totalQueries: 0,
      byType: {},
      avgExecutionTime: 0,
      minExecutionTime: Infinity,
      maxExecutionTime: 0,
      totalExecutionTime: 0,
      failedQueries: 0,
      cachedQueries: 0,
      slowQueries: 0,
    };
  }

  /**
   * Clear logs.
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Flush transport.
   */
  async flush(): Promise<void> {
    if (this.options.transport?.flush) {
      await this.options.transport.flush();
    }
  }

  /**
   * Close logger and transport.
   */
  async close(): Promise<void> {
    await this.flush();
    if (this.options.transport?.close) {
      await this.options.transport.close();
    }
  }

  /**
   * Check if should log based on level.
   *
   * @private
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const minLevel = levels.indexOf(this.options.level);
    const currentLevel = levels.indexOf(level);
    return currentLevel >= minLevel;
  }

  /**
   * Extract query type from SQL.
   *
   * @private
   */
  private extractQueryType(query: string): string {
    const match = query.trim().match(/^(\w+)/i);
    return match && match[1] ? match[1].toUpperCase() : 'UNKNOWN';
  }

  /**
   * Format log entry.
   *
   * @private
   */
  private format(entry: QueryLogEntry): string {
    if (this.options.formatter) {
      return this.options.formatter(entry);
    }

    const parts: string[] = [
      `[${entry.timestamp.toISOString()}]`,
      `[${entry.level.toUpperCase()}]`,
      `[${entry.queryType}]`,
    ];

    if (this.options.logExecutionTime) {
      parts.push(`(${entry.executionTime}ms)`);
    }

    parts.push(entry.query);

    if (this.options.logParams && entry.params && entry.params.length > 0) {
      parts.push(`Params: ${JSON.stringify(entry.params)}`);
    }

    if (entry.rowCount !== undefined) {
      parts.push(`Rows: ${entry.rowCount}`);
    }

    if (entry.error) {
      parts.push(`Error: ${entry.error.message}`);
    }

    return parts.join(' ');
  }

  /**
   * Update statistics.
   *
   * @private
   */
  private updateStats(entry: QueryLogEntry): void {
    this.stats.totalQueries++;
    this.stats.byType[entry.queryType] = (this.stats.byType[entry.queryType] || 0) + 1;

    this.stats.totalExecutionTime += entry.executionTime;
    this.stats.avgExecutionTime = this.stats.totalExecutionTime / this.stats.totalQueries;

    if (entry.executionTime < this.stats.minExecutionTime) {
      this.stats.minExecutionTime = entry.executionTime;
    }

    if (entry.executionTime > this.stats.maxExecutionTime) {
      this.stats.maxExecutionTime = entry.executionTime;
    }

    if (entry.error) {
      this.stats.failedQueries++;
    }

    if (entry.cached) {
      this.stats.cachedQueries++;
    }

    if (entry.executionTime > this.options.slowQueryThreshold) {
      this.stats.slowQueries++;
    }
  }

  /**
   * Sanitize query.
   *
   * @private
   */
  private sanitizeQuery(query: string): string {
    let sanitized = query;

    for (const pattern of this.options.sanitizePatterns) {
      sanitized = sanitized.replace(pattern, (match) => {
        const parts = match.split('=');
        return (parts[0] || '') + '= [REDACTED]';
      });
    }

    return sanitized;
  }

  /**
   * Generate unique ID.
   *
   * @private
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

