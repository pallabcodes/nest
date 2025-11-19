/**
 * Custom Query Builder Plugin Example
 *
 * Demonstrates how to create a plugin that extends the query builder
 * with custom methods and functionality.
 *
 * @module plugins/examples/query-builder-plugin
 */

import type {
  Plugin,
  PluginMetadata,
  QueryBuilderPlugin,
  PluginContext,
} from '../plugin-interface.js';

/**
 * Configuration for the query builder plugin.
 */
export interface QueryBuilderPluginConfig {
  /**
   * Enable audit logging for queries.
   */
  enableAuditLogging?: boolean;

  /**
   * Custom query methods to add.
   */
  customMethods?: Record<string, Function>;

  /**
   * Default query timeouts.
   */
  defaultTimeout?: number;
}

/**
 * Custom query builder plugin that adds audit trails and custom methods.
 */
export class AuditQueryBuilderPlugin implements QueryBuilderPlugin {
  readonly metadata: PluginMetadata = {
    id: 'neat-orm-audit-query-builder',
    name: 'Audit Query Builder Plugin',
    version: '1.0.0',
    description: 'Adds audit logging and custom query methods to the query builder',
    author: 'NeatORM Team',
    keywords: ['query-builder', 'audit', 'logging', 'custom-methods'],
    supportedDialects: ['postgres', 'mysql', 'sqlite', 'sqlserver'],
  };

  private config: QueryBuilderPluginConfig = {};

  extendQueryBuilder(builder: any, context: PluginContext): void {
    this.config = context.config as QueryBuilderPluginConfig;

    // Add audit logging methods
    builder.auditLog = function(message: string) {
      if (this.config.enableAuditLogging) {
        context.logger.info(`Audit: ${message}`, {
          table: this._table,
          operation: this._operation || 'query',
          timestamp: new Date().toISOString(),
        });
      }
      return this;
    };

    // Add custom query methods
    builder.withTimeout = function(timeoutMs: number) {
      this._timeout = timeoutMs;
      return this;
    };

    builder.explain = function() {
      this._explain = true;
      return this;
    };

    builder.auditTrail = function(userId: string, action: string) {
      this._audit = { userId, action, timestamp: new Date() };
      return this.auditLog(`${action} by user ${userId}`);
    };

    // Add soft delete support
    builder.withDeleted = function() {
      this._withDeleted = true;
      return this;
    };

    builder.onlyDeleted = function() {
      this._onlyDeleted = true;
      return this;
    };

    // Add pagination helpers
    builder.paginate = function(page: number, pageSize: number = 20) {
      const offset = (page - 1) * pageSize;
      return this.limit(pageSize).offset(offset);
    };

    // Add search functionality
    builder.search = function(searchTerm: string, columns: string[]) {
      if (!searchTerm || !columns.length) return this;

      const conditions = columns.map(col => `${col} LIKE ?`);
      const params = columns.map(() => `%${searchTerm}%`);

      return this.whereRaw(`(${conditions.join(' OR ')})`, params);
    };

    // Add ordering helpers
    builder.orderByNewest = function() {
      return this.orderBy('created_at', 'desc');
    };

    builder.orderByOldest = function() {
      return this.orderBy('created_at', 'asc');
    };

    builder.orderByRelevance = function(searchTerm?: string) {
      // Simple relevance ordering - can be enhanced with actual ranking
      if (searchTerm) {
        return this.orderBy('updated_at', 'desc');
      }
      return this.orderBy('created_at', 'desc');
    };

    // Override the execute method to add audit logging
    const originalExecute = builder.execute.bind(builder);
    builder.execute = async function() {
      if (this._audit) {
        context.logger.info('Audit trail query executed', this._audit);
      }

      if (this._timeout) {
        // Set timeout for the query
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`Query timeout after ${this._timeout}ms`)), this._timeout);
        });

        return Promise.race([originalExecute(), timeoutPromise]);
      }

      if (this._explain) {
        // Modify query to add EXPLAIN
        const originalSql = this.toSQL();
        this._originalSql = originalSql;
        // This would need integration with the SQL generator
        context.logger.info('EXPLAIN query would be executed', { originalSql });
      }

      return originalExecute();
    };

    // Add hook for query building completion
    const originalToSQL = builder.toSQL.bind(builder);
    builder.toSQL = function() {
      const sql = originalToSQL();

      if (this._withDeleted) {
        // Modify SQL to include soft deleted records
        // This would need integration with the entity's soft delete configuration
        context.logger.debug('Including soft deleted records in query');
      }

      if (this._onlyDeleted) {
        // Modify SQL to only include soft deleted records
        context.logger.debug('Querying only soft deleted records');
      }

      return sql;
    };
  }

  transformQuery(
    sql: string,
    params: unknown[],
    context: PluginContext
  ): { sql: string; params: unknown[] } {
    // Add audit logging comments to SQL
    if (this.config.enableAuditLogging) {
      const auditComment = `-- Audit: ${new Date().toISOString()}`;
      sql = `${auditComment}\n${sql}`;
    }

    // Add timeout hints for supported databases
    if (this.config.defaultTimeout) {
      if (context.adapter.getConfig().dialect === 'postgres') {
        sql = `SET LOCAL statement_timeout = ${this.config.defaultTimeout};\n${sql}`;
      } else if (context.adapter.getConfig().dialect === 'mysql') {
        // MySQL doesn't have statement timeout, but we can add comments
        sql = `/* Query timeout: ${this.config.defaultTimeout}ms */\n${sql}`;
      }
    }

    return { sql, params };
  }
}

/**
 * Create an audit query builder plugin instance.
 */
export function createAuditQueryBuilderPlugin(config: QueryBuilderPluginConfig = {}): Plugin {
  return new AuditQueryBuilderPlugin();
}

/**
 * Default audit query builder plugin instance.
 */
export const auditQueryBuilderPlugin = new AuditQueryBuilderPlugin();

/**
 * Example usage:
 *
 * ```typescript
 * // Register the plugin
 * await pluginManager.registerPlugin(auditQueryBuilderPlugin, {
 *   enableAuditLogging: true,
 *   defaultTimeout: 5000,
 * });
 *
 * // Use enhanced query builder
 * const results = await db
 *   .select('id', 'name', 'email')
 *   .from('users')
 *   .auditTrail('user123', 'viewed_user_list')
 *   .search('john', ['name', 'email'])
 *   .paginate(1, 20)
 *   .orderByRelevance('john')
 *   .execute();
 * ```
 */
