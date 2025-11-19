/**
 * Base Repository
 *
 * Generic repository providing CRUD operations for entities.
 * Implements the Repository Pattern for data access abstraction.
 *
 * @module repository/base-repository
 */

import type { DatabaseAdapter } from '../adapters/base-adapter.js';
import { QueryExecutor } from '../execution/query-executor.js';
import type { QueryExecutionOptions } from '../execution/query-executor.js';
import { metadataScanner } from '../metadata/scanner.js';
import { ENTITY_METADATA_KEY, PRIMARY_KEY_METADATA_KEY, SOFT_DELETE_METADATA_KEY, getMetadata } from '../metadata/keys.js';
import type { EntityMetadata } from '../metadata/keys.js';
import { executeHooks } from '../hooks/hook-executor.js';
import type { SoftDeleteMetadata } from '../decorators/soft-delete.decorator.js';
import { getSoftDeleteMetadata } from '../decorators/soft-delete.decorator.js';

/**
 * Options for finding entities.
 */
export interface FindOptions<T> {
  /**
   * Specific columns to select.
   */
  select?: (keyof T)[];

  /**
   * WHERE conditions.
   */
  where?: Partial<T> | WhereExpression<T>;

  /**
   * Relations to load.
   */
  relations?: string[];

  /**
   * Order by clauses.
   */
  orderBy?: OrderByExpression<T>;

  /**
   * Maximum number of results.
   */
  limit?: number;

  /**
   * Number of results to skip.
   */
  offset?: number;

  /**
   * Include soft deleted records.
   * Default: false
   */
  withTrashed?: boolean;

  /**
   * Only return soft deleted records.
   * Default: false
   */
  onlyTrashed?: boolean;

  /**
   * Query execution options.
   */
  executionOptions?: QueryExecutionOptions;
}

/**
 * WHERE expression type.
 */
export type WhereExpression<T> = Partial<T> & {
  [K in keyof T]?: T[K] | WhereCondition<T[K]>;
};

/**
 * WHERE condition with operators.
 */
export interface WhereCondition<T> {
  eq?: T;
  ne?: T;
  gt?: T;
  gte?: T;
  lt?: T;
  lte?: T;
  in?: T[];
  notIn?: T[];
  like?: string;
  notLike?: string;
  isNull?: boolean;
  isNotNull?: boolean;
}

/**
 * Order by expression.
 */
export type OrderByExpression<T> =
  | keyof T
  | Partial<Record<keyof T, 'ASC' | 'DESC'>>;

/**
 * Base Repository
 *
 * Provides standard CRUD operations for entities.
 *
 * @template T - Entity type
 */
export class BaseRepository<T> {
  protected executor: QueryExecutor;
  protected tableName: string;
  protected entityClass: new () => T;

  constructor(entityClass: new () => T, adapter: DatabaseAdapter) {
    this.entityClass = entityClass;
    this.executor = new QueryExecutor(adapter);
    this.tableName = this.getTableName();
  }

  /**
   * Find all entities matching the criteria.
   *
   * @param options - Find options
   * @returns Array of entities
   */
  async find(options?: FindOptions<T>): Promise<T[]> {
    const sql = this.buildFindQuery(options);
    const params = this.buildFindParams(options);

    const result = await this.executor.executeSelect<T>(
      sql,
      params,
      {
        ...options?.executionOptions,
        entityClass: this.entityClass,
        cache: true,
        tables: [this.tableName],
      }
    );

    const entities = result.rows;

    // Execute afterLoad hooks for all entities
    for (const entity of entities) {
      await executeHooks('afterLoad', entity, {
        operation: 'load',
        repository: this,
      });
    }

    return entities;
  }

  /**
   * Find a single entity matching the criteria.
   * Returns null if not found.
   *
   * @param options - Find options
   * @returns Entity or null
   */
  async findOne(options?: FindOptions<T>): Promise<T | null> {
    const limitedOptions = { ...options, limit: 1 };
    const results = await this.find(limitedOptions);
    return results[0] || null;
  }

  /**
   * Find an entity by its ID.
   * Returns null if not found.
   *
   * @param id - Entity ID
   * @returns Entity or null
   */
  async findById(id: unknown): Promise<T | null> {
    const pkColumn = this.getPrimaryKeyColumn();
    const sql = `SELECT * FROM ${this.escapeIdentifier(this.tableName)} WHERE ${this.escapeIdentifier(pkColumn)} = $1 LIMIT 1`;

    const result = await this.executor.executeSelect<T>(
      sql,
      [id],
      { entityClass: this.entityClass, cache: true, tables: [this.tableName] }
    );

    const entity = result.rows[0] || null;

    if (entity) {
      // Execute afterLoad hooks
      await executeHooks('afterLoad', entity, {
        operation: 'load',
        repository: this,
      });
    }

    return entity;
  }

  /**
   * Find entities by specific criteria.
   *
   * @param criteria - Partial entity object as criteria
   * @returns Array of matching entities
   */
  async findBy(criteria: Partial<T>): Promise<T[]> {
    return this.find({ where: criteria });
  }

  /**
   * Find a single entity by specific criteria.
   * Returns null if not found.
   *
   * @param criteria - Partial entity object as criteria
   * @returns Entity or null
   */
  async findOneBy(criteria: Partial<T>): Promise<T | null> {
    return this.findOne({ where: criteria });
  }

  /**
   * Save an entity (insert or update).
   * If entity has an ID, performs update; otherwise performs insert.
   *
   * @param entity - Entity to save
   * @returns Saved entity
   */
  async save(entity: Partial<T>): Promise<T> {
    const pkColumn = this.getPrimaryKeyColumn();
    const entityWithPk = entity as Record<string, unknown>;

    if (entityWithPk[pkColumn]) {
      return this.update(entityWithPk[pkColumn], entity);
    }

    return this.create(entity);
  }

  /**
   * Create a new entity.
   *
   * @param entity - Entity data
   * @returns Created entity
   */
  async create(entity: Partial<T>): Promise<T> {
    // Execute beforeInsert hooks
    await executeHooks('beforeInsert', entity as T, {
      operation: 'insert',
      repository: this,
    });

    const columns: string[] = [];
    const placeholders: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(entity)) {
      columns.push(this.escapeIdentifier(key));
      placeholders.push(`$${paramIndex++}`);
      values.push(value);
    }

    const sql = `INSERT INTO ${this.escapeIdentifier(this.tableName)} (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;

    const result = await this.executor.executeInsert<T>(
      sql,
      values,
      { entityClass: this.entityClass, tables: [this.tableName] }
    );

    const createdEntity = result.rows[0];
    if (!createdEntity) {
      throw new Error('Failed to create entity - no result returned');
    }

    // Execute afterInsert hooks
    await executeHooks('afterInsert', createdEntity, {
      operation: 'insert',
      repository: this,
    });

    return createdEntity;
  }

  /**
   * Update an entity by ID.
   *
   * @param id - Entity ID
   * @param entity - Updated entity data
   * @returns Updated entity
   */
  async update(id: unknown, entity: Partial<T>): Promise<T> {
    // Find existing entity for beforeUpdate hooks
    const existingEntity = await this.findById(id);
    if (!existingEntity) {
      throw new Error(`Entity with ID ${id} not found`);
    }

    // Merge existing entity with updates
    const updatedEntity = { ...existingEntity, ...entity } as T;

    // Execute beforeUpdate hooks
    await executeHooks('beforeUpdate', updatedEntity, {
      operation: 'update',
      repository: this,
    });

    const pkColumn = this.getPrimaryKeyColumn();
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(entity)) {
      if (key !== pkColumn) {
        setClauses.push(
          `${this.escapeIdentifier(key)} = $${paramIndex++}`
        );
        values.push(value);
      }
    }

    values.push(id);
    const sql = `UPDATE ${this.escapeIdentifier(this.tableName)} SET ${setClauses.join(', ')} WHERE ${this.escapeIdentifier(pkColumn)} = $${paramIndex} RETURNING *`;

    const result = await this.executor.executeUpdate<T>(
      sql,
      values,
      { entityClass: this.entityClass, tables: [this.tableName] }
    );

    const finalEntity = result.rows[0] as T;

    // Execute afterUpdate hooks
    await executeHooks('afterUpdate', finalEntity, {
      operation: 'update',
      repository: this,
    });

    return finalEntity;
  }

  /**
   * Delete an entity by ID.
   * If entity has soft delete enabled, performs a soft delete instead.
   *
   * @param id - Entity ID
   * @returns True if deleted, false if not found
   */
  async delete(id: unknown): Promise<boolean> {
    const softDeleteMetadata = getSoftDeleteMetadata(this.entityClass);

    // If soft delete is enabled, use soft delete
    if (softDeleteMetadata && !softDeleteMetadata.allowHardDelete) {
      return this.softDelete(id);
    }

    // Find existing entity for beforeDelete hooks
    const existingEntity = await this.findById(id);
    if (!existingEntity) {
      return false;
    }

    // Execute beforeDelete hooks
    await executeHooks('beforeDelete', existingEntity, {
      operation: 'delete',
      repository: this,
    });

    const pkColumn = this.getPrimaryKeyColumn();
    const sql = `DELETE FROM ${this.escapeIdentifier(this.tableName)} WHERE ${this.escapeIdentifier(pkColumn)} = $1`;

    const result = await this.executor.executeDelete(sql, [id], {
      tables: [this.tableName],
    });

    if (result.rowCount > 0) {
      // Execute afterDelete hooks
      await executeHooks('afterDelete', existingEntity, {
        operation: 'delete',
        repository: this,
      });
    }

    return result.rowCount > 0;
  }

  /**
   * Soft delete an entity by ID.
   * Marks the entity as deleted without physically removing it.
   *
   * @param id - Entity ID
   * @returns True if entity was soft deleted
   */
  async softDelete(id: unknown): Promise<boolean> {
    const softDeleteMetadata = getSoftDeleteMetadata(this.entityClass);
    if (!softDeleteMetadata) {
      throw new Error(
        `Entity ${this.entityClass.name} does not have @SoftDelete decorator`
      );
    }

    // Find existing entity for beforeDelete hooks
    const existingEntity = await this.findById(id);
    if (!existingEntity) {
      return false;
    }

    // Execute beforeDelete hooks
    await executeHooks('beforeDelete', existingEntity, {
      operation: 'delete',
      repository: this,
    });

    const pkColumn = this.getPrimaryKeyColumn();
    const deletedValue = softDeleteMetadata.deletedValue();

    const sql = `UPDATE ${this.escapeIdentifier(this.tableName)} SET ${this.escapeIdentifier(softDeleteMetadata.columnName)} = $1 WHERE ${this.escapeIdentifier(pkColumn)} = $2`;

    const result = await this.executor.executeUpdate(
      sql,
      [deletedValue, id],
      { tables: [this.tableName] }
    );

    if (result.rowCount > 0) {
      // Execute afterDelete hooks
      await executeHooks('afterDelete', existingEntity, {
        operation: 'delete',
        repository: this,
      });
    }

    return result.rowCount > 0;
  }

  /**
   * Restore a soft deleted entity by ID.
   *
   * @param id - Entity ID
   * @returns True if entity was restored
   */
  async restore(id: unknown): Promise<boolean> {
    const softDeleteMetadata = getSoftDeleteMetadata(this.entityClass);
    if (!softDeleteMetadata) {
      throw new Error(
        `Entity ${this.entityClass.name} does not have @SoftDelete decorator`
      );
    }

    const pkColumn = this.getPrimaryKeyColumn();
    const restoredValue = softDeleteMetadata.restoredValue;

    const sql = `UPDATE ${this.escapeIdentifier(this.tableName)} SET ${this.escapeIdentifier(softDeleteMetadata.columnName)} = $1 WHERE ${this.escapeIdentifier(pkColumn)} = $2`;

    const result = await this.executor.executeUpdate(
      sql,
      [restoredValue, id],
      { tables: [this.tableName] }
    );

    return result.rowCount > 0;
  }

  /**
   * Permanently delete a soft deleted entity.
   * This is a hard delete that cannot be undone.
   *
   * @param id - Entity ID
   * @returns True if entity was permanently deleted
   */
  async forceDelete(id: unknown): Promise<boolean> {
    const pkColumn = this.getPrimaryKeyColumn();
    const sql = `DELETE FROM ${this.escapeIdentifier(this.tableName)} WHERE ${this.escapeIdentifier(pkColumn)} = $1`;

    const result = await this.executor.executeDelete(sql, [id], {
      tables: [this.tableName],
    });

    return result.rowCount > 0;
  }

  /**
   * Count entities matching the criteria.
   *
   * @param options - Find options
   * @returns Number of matching entities
   */
  async count(options?: FindOptions<T>): Promise<number> {
    const sql = this.buildCountQuery(options);
    const params = this.buildFindParams(options);

    const result = await this.executor.executeSelect<{ count: string }>(
      sql,
      params
    );

    return parseInt(result.rows[0]?.count || '0', 10);
  }

  /**
   * Check if any entities match the criteria.
   *
   * @param options - Find options
   * @returns True if at least one entity exists
   */
  async exists(options?: FindOptions<T>): Promise<boolean> {
    const count = await this.count(options);
    return count > 0;
  }

  /**
   * Get table name from entity metadata.
   *
   * @protected
   */
  protected getTableName(): string {
    const metadata = getMetadata<EntityMetadata>(
      ENTITY_METADATA_KEY,
      this.entityClass
    );

    if (!metadata || !metadata.tableName) {
      throw new Error(
        `Entity ${this.entityClass.name} does not have @Entity decorator`
      );
    }

    return metadata.tableName;
  }

  /**
   * Get primary key column name from entity metadata.
   *
   * @protected
   */
  protected getPrimaryKeyColumn(): string {
    // Iterate over entity properties to find @PrimaryKey decorator
    const proto = this.entityClass.prototype;
    const propertyKeys = Object.getOwnPropertyNames(proto);

    for (const propertyKey of propertyKeys) {
      const isPrimaryKey = getMetadata(
        PRIMARY_KEY_METADATA_KEY,
        this.entityClass,
        propertyKey
      );

      if (isPrimaryKey) {
        return propertyKey;
      }
    }

    // Default to 'id' if no @PrimaryKey found
    return 'id';
  }

  /**
   * Build SELECT query from find options.
   *
   * @protected
   */
  protected buildFindQuery(options?: FindOptions<T>): string {
    const columns = options?.select
      ? options.select.map((col) => this.escapeIdentifier(String(col))).join(', ')
      : '*';

    let sql = `SELECT ${columns} FROM ${this.escapeIdentifier(this.tableName)}`;

    // Build WHERE clause with soft delete support
    const whereClauses: string[] = [];

    // Add soft delete condition
    const softDeleteCondition = this.buildSoftDeleteCondition(options);
    if (softDeleteCondition) {
      whereClauses.push(softDeleteCondition);
    }

    // Add user-provided WHERE conditions
    if (options?.where) {
      whereClauses.push(this.buildWhereClause(options.where));
    }

    if (whereClauses.length > 0) {
      sql += ' WHERE ' + whereClauses.join(' AND ');
    }

    if (options?.orderBy) {
      sql += ' ORDER BY ' + this.buildOrderByClause(options.orderBy);
    }

    if (options?.limit) {
      sql += ` LIMIT ${options.limit}`;
    }

    if (options?.offset) {
      sql += ` OFFSET ${options.offset}`;
    }

    return sql;
  }

  /**
   * Build COUNT query from find options.
   *
   * @protected
   */
  protected buildCountQuery(options?: FindOptions<T>): string {
    let sql = `SELECT COUNT(*) as count FROM ${this.escapeIdentifier(this.tableName)}`;

    // Build WHERE clause with soft delete support
    const whereClauses: string[] = [];

    // Add soft delete condition
    const softDeleteCondition = this.buildSoftDeleteCondition(options);
    if (softDeleteCondition) {
      whereClauses.push(softDeleteCondition);
    }

    // Add user-provided WHERE conditions
    if (options?.where) {
      whereClauses.push(this.buildWhereClause(options.where));
    }

    if (whereClauses.length > 0) {
      sql += ' WHERE ' + whereClauses.join(' AND ');
    }

    return sql;
  }

  /**
   * Build WHERE clause from criteria.
   *
   * @protected
   */
  protected buildWhereClause(where: WhereExpression<T>): string {
    const conditions: string[] = [];
    const params: unknown[] = [];

    this.buildWhereConditions(where, conditions, params);

    return conditions.join(' AND ');
  }

  /**
   * Build WHERE conditions recursively.
   *
   * @private
   */
  private buildWhereConditions(
    where: WhereExpression<T>,
    conditions: string[],
    params: unknown[]
  ): void {
    for (const [key, value] of Object.entries(where)) {
      if (value === null || value === undefined) {
        conditions.push(`${this.escapeIdentifier(key)} IS NULL`);
      } else if (this.isWhereCondition(value)) {
        // Handle complex WHERE conditions
        this.buildWhereCondition(key, value, conditions, params);
      } else {
        // Simple equality
        conditions.push(`${this.escapeIdentifier(key)} = $${params.length + 1}`);
        params.push(value);
      }
    }
  }

  /**
   * Build a single WHERE condition with operators.
   *
   * @private
   */
  private buildWhereCondition(
    column: string,
    condition: WhereCondition<unknown>,
    conditions: string[],
    params: unknown[]
  ): void {
    const columnName = this.escapeIdentifier(column);

    if (condition.eq !== undefined) {
      conditions.push(`${columnName} = $${params.length + 1}`);
      params.push(condition.eq);
    }

    if (condition.ne !== undefined) {
      conditions.push(`${columnName} != $${params.length + 1}`);
      params.push(condition.ne);
    }

    if (condition.gt !== undefined) {
      conditions.push(`${columnName} > $${params.length + 1}`);
      params.push(condition.gt);
    }

    if (condition.gte !== undefined) {
      conditions.push(`${columnName} >= $${params.length + 1}`);
      params.push(condition.gte);
    }

    if (condition.lt !== undefined) {
      conditions.push(`${columnName} < $${params.length + 1}`);
      params.push(condition.lt);
    }

    if (condition.lte !== undefined) {
      conditions.push(`${columnName} <= $${params.length + 1}`);
      params.push(condition.lte);
    }

    if (condition.in !== undefined) {
      const placeholders = condition.in.map((_, i) => `$${params.length + i + 1}`).join(', ');
      conditions.push(`${columnName} IN (${placeholders})`);
      params.push(...condition.in);
    }

    if (condition.notIn !== undefined) {
      const placeholders = condition.notIn.map((_, i) => `$${params.length + i + 1}`).join(', ');
      conditions.push(`${columnName} NOT IN (${placeholders})`);
      params.push(...condition.notIn);
    }

    if (condition.like !== undefined) {
      conditions.push(`${columnName} LIKE $${params.length + 1}`);
      params.push(condition.like);
    }

    if (condition.notLike !== undefined) {
      conditions.push(`${columnName} NOT LIKE $${params.length + 1}`);
      params.push(condition.notLike);
    }

    if (condition.isNull === true) {
      conditions.push(`${columnName} IS NULL`);
    }

    if (condition.isNull === false) {
      conditions.push(`${columnName} IS NOT NULL`);
    }
  }

  /**
   * Check if value is a WhereCondition object.
   *
   * @private
   */
  private isWhereCondition(value: unknown): value is WhereCondition<unknown> {
    return (
      value !== null &&
      typeof value === 'object' &&
      (
        'eq' in value ||
        'ne' in value ||
        'gt' in value ||
        'gte' in value ||
        'lt' in value ||
        'lte' in value ||
        'in' in value ||
        'notIn' in value ||
        'like' in value ||
        'notLike' in value ||
        'isNull' in value
      )
    );
  }

  /**
   * Build ORDER BY clause.
   *
   * @protected
   */
  protected buildOrderByClause(orderBy: OrderByExpression<T>): string {
    if (typeof orderBy === 'string') {
      return this.escapeIdentifier(orderBy);
    }

    const clauses: string[] = [];
    for (const [key, direction] of Object.entries(orderBy)) {
      clauses.push(
        `${this.escapeIdentifier(key)} ${direction || 'ASC'}`
      );
    }

    return clauses.join(', ');
  }

  /**
   * Build parameters array from find options.
   *
   * @protected
   */
  protected buildFindParams(options?: FindOptions<T>): unknown[] {
    if (!options?.where) {
      return [];
    }

    const params: unknown[] = [];
    this.collectWhereParams(options.where, params);
    return params;
  }

  /**
   * Collect parameters from WHERE conditions.
   *
   * @private
   */
  private collectWhereParams(where: WhereExpression<T>, params: unknown[]): void {
    for (const value of Object.values(where)) {
      if (value === null || value === undefined) {
        continue;
      }

      if (this.isWhereCondition(value)) {
        // Collect parameters from WhereCondition
        this.collectWhereConditionParams(value, params);
      } else {
        // Simple equality parameter
        params.push(value);
      }
    }
  }

  /**
   * Collect parameters from a single WhereCondition.
   *
   * @private
   */
  private collectWhereConditionParams(
    condition: WhereCondition<unknown>,
    params: unknown[]
  ): void {
    // Collect all non-undefined values from the condition
    const values = [
      condition.eq,
      condition.ne,
      condition.gt,
      condition.gte,
      condition.lt,
      condition.lte,
      ...(condition.in || []),
      ...(condition.notIn || []),
      condition.like,
      condition.notLike,
    ].filter(val => val !== undefined);

    params.push(...values);
  }

  /**
   * Build soft delete condition for queries.
   *
   * @protected
   */
  protected buildSoftDeleteCondition(options?: FindOptions<T>): string | null {
    const softDeleteMetadata = getSoftDeleteMetadata(this.entityClass);
    if (!softDeleteMetadata) {
      return null;
    }

    // If onlyTrashed is set, return only deleted records
    if (options?.onlyTrashed) {
      if (softDeleteMetadata.type === 'timestamp') {
        return `${this.escapeIdentifier(softDeleteMetadata.columnName)} IS NOT NULL`;
      } else {
        return `${this.escapeIdentifier(softDeleteMetadata.columnName)} = true`;
      }
    }

    // If withTrashed is set or includeDeletedByDefault is true, don't filter
    if (options?.withTrashed || softDeleteMetadata.includeDeletedByDefault) {
      return null;
    }

    // Default: exclude soft deleted records
    if (softDeleteMetadata.type === 'timestamp') {
      return `${this.escapeIdentifier(softDeleteMetadata.columnName)} IS NULL`;
    } else {
      return `${this.escapeIdentifier(softDeleteMetadata.columnName)} = false`;
    }
  }

  /**
   * Escape database identifier.
   *
   * @protected
   */
  protected escapeIdentifier(identifier: string): string {
    return this.executor.getAdapter().escapeIdentifier(identifier);
  }
}

