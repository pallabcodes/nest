/**
 * Entity Manager
 *
 * Manages entity lifecycle and provides bulk operations.
 *
 * @module repository/entity-manager
 */

import type { DatabaseAdapter } from '../adapters/base-adapter.js';
import { QueryExecutor } from '../execution/query-executor.js';

/**
 * Entity Manager
 *
 * Central manager for entity operations and bulk operations.
 */
export class EntityManager {
  private executor: QueryExecutor;

  constructor(private adapter: DatabaseAdapter) {
    this.executor = new QueryExecutor(adapter);
  }

  /**
   * Save multiple entities at once.
   * Uses batch INSERT for better performance.
   */
  async saveMany<T>(entities: Partial<T>[], tableName: string): Promise<T[]> {
    if (entities.length === 0) {
      return [];
    }

    // For small batches, use individual inserts for simplicity
    if (entities.length <= 10) {
      return this.saveManyIndividual(entities, tableName);
    }

    // For larger batches, use batch insert
    return this.saveManyBatch(entities, tableName);
  }

  /**
   * Save entities individually.
   *
   * @private
   */
  private async saveManyIndividual<T>(
    entities: Partial<T>[],
    tableName: string
  ): Promise<T[]> {
    const results: T[] = [];

    for (const entity of entities) {
      const columns: string[] = [];
      const placeholders: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(entity)) {
        columns.push(this.escapeIdentifier(key));
        placeholders.push(`$${paramIndex++}`);
        values.push(value);
      }

      const sql = `INSERT INTO ${this.escapeIdentifier(tableName)} (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
      const result = await this.executor.executeInsert<T>(sql, values);
      results.push(result.rows[0]);
    }

    return results;
  }

  /**
   * Save entities in batch using multi-row INSERT.
   *
   * @private
   */
  private async saveManyBatch<T>(
    entities: Partial<T>[],
    tableName: string
  ): Promise<T[]> {
    // Get all unique columns across all entities
    const allColumns = new Set<string>();
    for (const entity of entities) {
      Object.keys(entity).forEach(key => allColumns.add(key));
    }

    const columns = Array.from(allColumns);
    const columnNames = columns.map(col => this.escapeIdentifier(col));

    // Build VALUES clause with multiple rows
    const allValues: unknown[] = [];
    const valueRows: string[] = [];

    for (const entity of entities) {
      const entityObj = entity as Record<string, unknown>;
      const rowValues: string[] = [];

      for (const column of columns) {
        const value = entityObj[column];
        if (value === undefined) {
          // Use DEFAULT for missing values
          rowValues.push('DEFAULT');
        } else {
          rowValues.push(`$${allValues.length + 1}`);
          allValues.push(value);
        }
      }

      valueRows.push(`(${rowValues.join(', ')})`);
    }

    const sql = `INSERT INTO ${this.escapeIdentifier(tableName)} (${columnNames.join(', ')}) VALUES ${valueRows.join(', ')} RETURNING *`;
    const result = await this.executor.executeInsert<T>(sql, allValues);

    return result.rows;
  }

  /**
   * Delete multiple entities by IDs.
   * Uses batch operations for better performance.
   */
  async deleteMany(
    ids: unknown[],
    tableName: string,
    pkColumn: string = 'id'
  ): Promise<number> {
    if (ids.length === 0) {
      return 0;
    }

    // For large batches, split into smaller chunks to avoid parameter limits
    if (ids.length > 1000) {
      return this.deleteManyInChunks(ids, tableName, pkColumn, 500);
    }

    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
    const sql = `DELETE FROM ${this.escapeIdentifier(tableName)} WHERE ${this.escapeIdentifier(pkColumn)} IN (${placeholders})`;

    const result = await this.executor.executeDelete(sql, ids);
    return result.rowCount;
  }

  /**
   * Delete entities in chunks to avoid parameter limits.
   *
   * @private
   */
  private async deleteManyInChunks(
    ids: unknown[],
    tableName: string,
    pkColumn: string,
    chunkSize: number
  ): Promise<number> {
    let totalDeleted = 0;

    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const placeholders = chunk.map((_, idx) => `$${idx + 1}`).join(', ');
      const sql = `DELETE FROM ${this.escapeIdentifier(tableName)} WHERE ${this.escapeIdentifier(pkColumn)} IN (${placeholders})`;

      const result = await this.executor.executeDelete(sql, chunk);
      totalDeleted += result.rowCount;
    }

    return totalDeleted;
  }

  /**
   * Update multiple entities with the same changes.
   */
  async updateMany<T>(
    criteria: Partial<T>,
    updates: Partial<T>,
    tableName: string
  ): Promise<number> {
    const setClauses: string[] = [];
    const whereClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    // Build SET clause
    for (const [key, value] of Object.entries(updates)) {
      setClauses.push(`${this.escapeIdentifier(key)} = $${paramIndex++}`);
      values.push(value);
    }

    if (setClauses.length === 0) {
      return 0; // Nothing to update
    }

    // Build WHERE clause
    for (const [key, value] of Object.entries(criteria)) {
      whereClauses.push(`${this.escapeIdentifier(key)} = $${paramIndex++}`);
      values.push(value);
    }

    const whereClause = whereClauses.length > 0 ? ` WHERE ${whereClauses.join(' AND ')}` : '';
    const sql = `UPDATE ${this.escapeIdentifier(tableName)} SET ${setClauses.join(', ')}${whereClause}`;

    const result = await this.executor.executeUpdate(sql, values);
    return result.rowCount;
  }

  /**
   * Execute a raw query with entity mapping.
   */
  async queryRaw<T>(
    sql: string,
    params?: unknown[],
    entityClass?: new () => T
  ): Promise<T[]> {
    const result = await this.executor.executeSelect(
      sql,
      params,
      entityClass ? { entityClass } : undefined
    );
    return result.rows;
  }

  /**
   * Execute a raw query for modifications.
   */
  async executeRaw(sql: string, params?: unknown[]): Promise<number> {
    const result = await this.executor.executeRaw(sql, params);
    return result.rowCount;
  }

  /**
   * Get database statistics.
   */
  async getStats(tableName?: string): Promise<{
    tableCount: number;
    rowCount: number;
    size: string;
  }> {
    // This is a simplified implementation - real implementation would query system tables
    const result = await this.executor.executeSelect<{ count: number }>(
      tableName
        ? `SELECT COUNT(*) as count FROM ${this.escapeIdentifier(tableName)}`
        : `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public'`
    );

    return {
      tableCount: result.rows[0]?.count || 0,
      rowCount: 0, // Would need to sum all tables
      size: 'Unknown', // Would need to query database size
    };
  }

  /**
   * Flush all pending operations.
   * Placeholder for Unit of Work pattern integration.
   */
  async flush(): Promise<void> {
    // To be implemented with Unit of Work pattern
  }

  /**
   * Clear entity manager state.
   */
  async clear(): Promise<void> {
    // To be implemented with Unit of Work pattern
  }

  /**
   * Get the database adapter.
   */
  getAdapter(): DatabaseAdapter {
    return this.adapter;
  }

  /**
   * Escape database identifier.
   */
  private escapeIdentifier(identifier: string): string {
    return this.adapter.escapeIdentifier(identifier);
  }
}

