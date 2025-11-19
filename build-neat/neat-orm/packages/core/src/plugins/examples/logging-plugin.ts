/**
 * Enhanced Logging Plugin Example
 *
 * Demonstrates how to create a plugin that adds enhanced logging capabilities
 * to NeatORM operations.
 *
 * @module plugins/examples/logging-plugin
 */

import type {
  Plugin,
  PluginMetadata,
  PluginLifecycle,
  PluginContext,
  MiddlewarePlugin,
  QueryResult,
} from '../plugin-interface.js';

/**
 * Configuration for the logging plugin.
 */
export interface LoggingPluginConfig {
  /**
   * Enable query logging.
   */
  enableQueryLogging?: boolean;

  /**
   * Enable transaction logging.
   */
  enableTransactionLogging?: boolean;

  /**
   * Log level threshold.
   */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';

  /**
   * Include parameter values in logs (security risk!).
   */
  includeParameters?: boolean;

  /**
   * Slow query threshold in milliseconds.
   */
  slowQueryThreshold?: number;
}

/**
 * Enhanced logging plugin implementation.
 */
export class LoggingPlugin implements MiddlewarePlugin {
  readonly metadata: PluginMetadata = {
    id: 'neat-orm-logging',
    name: 'Enhanced Logging Plugin',
    version: '1.0.0',
    description: 'Adds comprehensive logging capabilities to NeatORM operations',
    author: 'NeatORM Team',
    keywords: ['logging', 'monitoring', 'debugging'],
    supportedDialects: ['postgres', 'mysql', 'sqlite', 'sqlserver'],
  };

  readonly lifecycle: PluginLifecycle = {
    onInit: this.onInit.bind(this),
    onDestroy: this.onDestroy.bind(this),
  };

  readonly queryMiddleware = {
    beforeExecute: this.beforeQueryExecute.bind(this),
    afterExecute: this.afterQueryExecute.bind(this),
  };

  readonly transactionMiddleware = {
    beforeBegin: this.beforeTransactionBegin.bind(this),
    afterBegin: this.afterTransactionBegin.bind(this),
    beforeCommit: this.beforeTransactionCommit.bind(this),
    beforeRollback: this.beforeTransactionRollback.bind(this),
  };

  private config: LoggingPluginConfig = {};
  private queryStartTimes: Map<string, number> = new Map();

  private onInit(context: PluginContext): void {
    this.config = context.config as LoggingPluginConfig;

    // Set defaults
    this.config = {
      enableQueryLogging: true,
      enableTransactionLogging: true,
      logLevel: 'info',
      includeParameters: false,
      slowQueryThreshold: 1000,
      ...this.config,
    };

    context.logger.info('Enhanced logging plugin initialized', this.config);

    // Listen for custom events
    context.on('custom:log', (data) => {
      context.logger.info('Custom log event:', data);
    });
  }

  private onDestroy(): void {
    this.queryStartTimes.clear();
  }

  private beforeQueryExecute(
    sql: string,
    params: unknown[],
    context: PluginContext
  ): void {
    if (!this.config.enableQueryLogging) return;

    const queryId = `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.queryStartTimes.set(queryId, Date.now());

    const logData: any = {
      queryId,
      sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
    };

    if (this.config.includeParameters && params.length > 0) {
      logData.params = params;
    }

    context.logger.info('Query executing', logData);
  }

  private afterQueryExecute(
    sql: string,
    params: unknown[],
    result: QueryResult,
    context: PluginContext
  ): void {
    if (!this.config.enableQueryLogging) return;

    const queryId = `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = this.queryStartTimes.get(queryId) || Date.now();
    const duration = Date.now() - startTime;

    this.queryStartTimes.delete(queryId);

    const logData: any = {
      queryId,
      duration: `${duration}ms`,
      rowsAffected: result.rowCount,
      rowCount: result.rows?.length || 0,
    };

    // Check for slow queries
    if (this.config.slowQueryThreshold && duration > this.config.slowQueryThreshold) {
      context.logger.warn('Slow query detected', {
        ...logData,
        sql: sql.substring(0, 200) + (sql.length > 200 ? '...' : ''),
        threshold: `${this.config.slowQueryThreshold}ms`,
      });
    } else {
      context.logger.info('Query completed', logData);
    }
  }

  private beforeTransactionBegin(options: unknown, context: PluginContext): void {
    if (!this.config.enableTransactionLogging) return;

    context.logger.info('Transaction beginning', { options });
  }

  private afterTransactionBegin(transaction: unknown, context: PluginContext): void {
    if (!this.config.enableTransactionLogging) return;

    context.logger.info('Transaction started', { transactionId: (transaction as any)?.id });
  }

  private beforeTransactionCommit(transaction: unknown, context: PluginContext): void {
    if (!this.config.enableTransactionLogging) return;

    context.logger.info('Transaction committing', { transactionId: (transaction as any)?.id });
  }

  private beforeTransactionRollback(transaction: unknown, context: PluginContext): void {
    if (!this.config.enableTransactionLogging) return;

    context.logger.warn('Transaction rolling back', { transactionId: (transaction as any)?.id });
  }
}

/**
 * Create a logging plugin instance with custom configuration.
 */
export function createLoggingPlugin(config: LoggingPluginConfig = {}): Plugin {
  return new LoggingPlugin();
}

/**
 * Default logging plugin instance.
 */
export const loggingPlugin = new LoggingPlugin();
