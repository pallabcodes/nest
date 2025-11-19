/**
 * Unit of Work
 *
 * Manages entity lifecycle and coordinates database operations.
 * Implements the Unit of Work pattern for transactional consistency.
 *
 * @module unit-of-work/unit-of-work
 */

import type { DatabaseAdapter, Transaction } from '../adapters/base-adapter.js';
import { QueryExecutor } from '../execution/query-executor.js';
import { IdentityMap } from './identity-map.js';
import { ChangeTracker, EntityState } from './change-tracker.js';
import { metadataScanner } from '../metadata/scanner.js';
import { METADATA_KEYS } from '../metadata/keys.js';

/**
 * Unit of Work options.
 */
export interface UnitOfWorkOptions {
  /**
   * Automatically detect changes before flush.
   */
  autoDetectChanges?: boolean;

  /**
   * Enable logging.
   */
  logging?: boolean;

  /**
   * Custom logger.
   */
  logger?: (message: string, data?: unknown) => void;
}

/**
 * Unit of Work
 *
 * Central coordinator for entity persistence operations.
 */
export class UnitOfWork {
  private identityMap: IdentityMap;
  private changeTracker: ChangeTracker;
  private executor: QueryExecutor;
  private transaction?: Transaction;
  private options: Required<UnitOfWorkOptions>;

  constructor(
    private adapter: DatabaseAdapter,
    options: UnitOfWorkOptions = {}
  ) {
    this.identityMap = new IdentityMap();
    this.changeTracker = new ChangeTracker();
    this.executor = new QueryExecutor(adapter);
    this.options = {
      autoDetectChanges: true,
      logging: false,
      logger: console.log,
      ...options,
    };
  }

  /**
   * Register a new entity.
   *
   * @param entityType - Entity class name
   * @param id - Entity ID
   * @param entity - Entity instance
   */
  registerNew(entityType: string, id: unknown, entity: unknown): void {
    this.identityMap.set(entityType, id, entity);
    this.changeTracker.trackNew(entityType, id, entity);

    if (this.options.logging) {
      this.options.logger(`Registered new entity: ${entityType}:${String(id)}`);
    }
  }

  /**
   * Register an entity loaded from database.
   *
   * @param entityType - Entity class name
   * @param id - Entity ID
   * @param entity - Entity instance
   */
  registerManaged(entityType: string, id: unknown, entity: unknown): void {
    // Check if already in identity map
    if (this.identityMap.has(entityType, id)) {
      return;
    }

    this.identityMap.set(entityType, id, entity);
    this.changeTracker.trackManaged(entityType, id, entity);

    if (this.options.logging) {
      this.options.logger(`Registered managed entity: ${entityType}:${String(id)}`);
    }
  }

  /**
   * Register an entity for deletion.
   *
   * @param entityType - Entity class name
   * @param id - Entity ID
   */
  registerDeleted(entityType: string, id: unknown): void {
    this.changeTracker.trackDeleted(entityType, id);

    if (this.options.logging) {
      this.options.logger(`Registered deleted entity: ${entityType}:${String(id)}`);
    }
  }

  /**
   * Get an entity from the identity map.
   *
   * @param entityType - Entity class name
   * @param id - Entity ID
   * @returns Entity instance or undefined
   */
  getEntity<T>(entityType: string, id: unknown): T | undefined {
    return this.identityMap.get<T>(entityType, id);
  }

  /**
   * Detect changes in all tracked entities.
   */
  detectChanges(): void {
    const managedEntities = this.identityMap.getAllOfType<Record<string, unknown>>('');
    
    for (const entity of managedEntities) {
      const id = entity['id'];
      if (id !== undefined) {
        this.changeTracker.detectChanges(entity.constructor.name, id);
      }
    }

    if (this.options.logging) {
      this.options.logger('Change detection completed');
    }
  }

  /**
   * Flush all pending operations to the database.
   * Executes INSERT, UPDATE, and DELETE operations in order.
   */
  async flush(): Promise<void> {
    if (this.options.autoDetectChanges) {
      this.detectChanges();
    }

    // Start transaction if not already in one
    const wasInTransaction = !!this.transaction;
    if (!wasInTransaction) {
      this.transaction = await this.adapter.beginTransaction();
    }

    try {
      // Execute inserts
      await this.executeInserts();

      // Execute updates
      await this.executeUpdates();

      // Execute deletes
      await this.executeDeletes();

      // Commit transaction if we started it
      if (!wasInTransaction && this.transaction) {
        await this.transaction.commit();
        this.transaction = undefined;
      }

      if (this.options.logging) {
        this.options.logger('Flush completed successfully');
      }
    } catch (error) {
      // Rollback transaction if we started it
      if (!wasInTransaction && this.transaction) {
        await this.transaction.rollback();
        this.transaction = undefined;
      }

      if (this.options.logging) {
        this.options.logger('Flush failed', error);
      }

      throw error;
    }
  }

  /**
   * Clear the Unit of Work.
   * Detaches all entities and clears all changes.
   */
  clear(): void {
    this.identityMap.clear();
    this.changeTracker.clear();

    if (this.options.logging) {
      this.options.logger('Unit of Work cleared');
    }
  }

  /**
   * Begin a transaction.
   */
  async beginTransaction(): Promise<void> {
    if (this.transaction) {
      throw new Error('Transaction already started');
    }

    this.transaction = await this.adapter.beginTransaction();

    if (this.options.logging) {
      this.options.logger('Transaction started');
    }
  }

  /**
   * Commit the current transaction.
   */
  async commit(): Promise<void> {
    if (!this.transaction) {
      throw new Error('No active transaction');
    }

    await this.transaction.commit();
    this.transaction = undefined;

    if (this.options.logging) {
      this.options.logger('Transaction committed');
    }
  }

  /**
   * Rollback the current transaction.
   */
  async rollback(): Promise<void> {
    if (!this.transaction) {
      throw new Error('No active transaction');
    }

    await this.transaction.rollback();
    this.transaction = undefined;

    if (this.options.logging) {
      this.options.logger('Transaction rolled back');
    }
  }

  /**
   * Execute insert operations for new entities.
   *
   * @private
   */
  private async executeInserts(): Promise<void> {
    const newEntities = this.changeTracker.getNew();

    for (const { entity } of newEntities) {
      const entityObj = entity as Record<string, unknown>;
      const entityType = entity.constructor.name;

      // Get table name from metadata
      const tableName = this.getTableName(entityType);

      // Get column metadata
      const columns = this.getEntityColumns(entityType);

      // Build INSERT query
      const columnNames: string[] = [];
      const placeholders: string[] = [];
      const values: unknown[] = [];

      for (const [propName, columnMeta] of columns.entries()) {
        if (entityObj[propName] !== undefined) {
          columnNames.push(this.adapter.escapeIdentifier(columnMeta.name || propName));
          placeholders.push(`$${columnNames.length}`);
          values.push(entityObj[propName]);
        }
      }

      if (columnNames.length === 0) {
        throw new Error(`No columns to insert for entity ${entityType}`);
      }

      const sql = `INSERT INTO ${this.adapter.escapeIdentifier(tableName)} (${columnNames.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;

      // Execute insert
      const result = await this.executor.executeInsert(
        sql,
        values,
        {
          entityClass: entity.constructor as new () => unknown,
          transaction: this.transaction,
        }
      );

      // Update entity with generated values (like auto-increment IDs)
      if (result.rows[0]) {
        const insertedRow = result.rows[0];
        for (const [propName, columnMeta] of columns.entries()) {
          if (columnMeta.generated && insertedRow[columnMeta.name || propName] !== undefined) {
            entityObj[propName] = insertedRow[columnMeta.name || propName];
          }
        }
      }

      if (this.options.logging) {
        this.options.logger(`Inserted entity ${entityType}`, { id: entityObj.id, table: tableName });
      }
    }
  }

  /**
   * Execute update operations for modified entities.
   *
   * @private
   */
  private async executeUpdates(): Promise<void> {
    const modifiedEntities = this.changeTracker.getModified();

    for (const { entity, changedProperties } of modifiedEntities) {
      const entityObj = entity as Record<string, unknown>;
      const entityType = entity.constructor.name;

      // Skip if no changes
      if (changedProperties.size === 0) {
        continue;
      }

      // Get table name and primary key
      const tableName = this.getTableName(entityType);
      const pkColumn = this.getPrimaryKeyColumn(entityType);
      const pkValue = entityObj[pkColumn];

      if (!pkValue) {
        throw new Error(`Entity ${entityType} has no primary key value for update`);
      }

      // Get column metadata
      const columns = this.getEntityColumns(entityType);

      // Build UPDATE query with only changed columns
      const setClauses: string[] = [];
      const values: unknown[] = [];

      for (const propName of changedProperties) {
        const columnMeta = columns.get(propName);
        if (columnMeta && !columnMeta.generated) {
          setClauses.push(`${this.adapter.escapeIdentifier(columnMeta.name || propName)} = $${setClauses.length + 1}`);
          values.push(entityObj[propName]);
        }
      }

      if (setClauses.length === 0) {
        continue; // Nothing to update
      }

      values.push(pkValue); // Add primary key value for WHERE clause
      const sql = `UPDATE ${this.adapter.escapeIdentifier(tableName)} SET ${setClauses.join(', ')} WHERE ${this.adapter.escapeIdentifier(pkColumn)} = $${values.length} RETURNING *`;

      // Execute update
      const result = await this.executor.executeUpdate(
        sql,
        values,
        {
          entityClass: entity.constructor as new () => unknown,
          transaction: this.transaction,
        }
      );

      if (this.options.logging) {
        this.options.logger(`Updated entity ${entityType}`, {
          id: pkValue,
          table: tableName,
          changedProperties: Array.from(changedProperties)
        });
      }
    }
  }

  /**
   * Execute delete operations for deleted entities.
   *
   * @private
   */
  private async executeDeletes(): Promise<void> {
    const deletedEntities = this.changeTracker.getDeleted();

    for (const { entity } of deletedEntities) {
      const entityObj = entity as Record<string, unknown>;
      const entityType = entity.constructor.name;

      // Get table name and primary key
      const tableName = this.getTableName(entityType);
      const pkColumn = this.getPrimaryKeyColumn(entityType);
      const pkValue = entityObj[pkColumn];

      if (!pkValue) {
        throw new Error(`Entity ${entityType} has no primary key value for deletion`);
      }

      const sql = `DELETE FROM ${this.adapter.escapeIdentifier(tableName)} WHERE ${this.adapter.escapeIdentifier(pkColumn)} = $1`;

      // Execute delete
      const result = await this.executor.executeDelete(
        sql,
        [pkValue],
        { transaction: this.transaction }
      );

      if (this.options.logging) {
        this.options.logger(`Deleted entity ${entityType}`, {
          id: pkValue,
          table: tableName,
          affectedRows: result.rowCount
        });
      }
    }
  }

  /**
   * Get table name for an entity type.
   *
   * @private
   */
  private getTableName(entityType: string): string {
    // Find the entity constructor by name
    const entityConstructor = this.findEntityConstructor(entityType);
    if (!entityConstructor) {
      throw new Error(`Entity type ${entityType} not found in registered entities`);
    }

    const metadata = metadataScanner.getMetadata(METADATA_KEYS.ENTITY, entityConstructor);
    if (!metadata || !metadata.tableName) {
      throw new Error(`Entity ${entityType} does not have @Entity decorator with table name`);
    }

    return metadata.tableName;
  }

  /**
   * Get primary key column name for an entity type.
   *
   * @private
   */
  private getPrimaryKeyColumn(entityType: string): string {
    const entityConstructor = this.findEntityConstructor(entityType);
    if (!entityConstructor) {
      throw new Error(`Entity type ${entityType} not found in registered entities`);
    }

    const proto = entityConstructor.prototype;
    const propertyKeys = Object.getOwnPropertyNames(proto);

    for (const propertyKey of propertyKeys) {
      const isPrimaryKey = metadataScanner.getMetadata(
        METADATA_KEYS.PRIMARY_KEY,
        entityConstructor,
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
   * Get column metadata for an entity type.
   *
   * @private
   */
  private getEntityColumns(entityType: string): Map<string, any> {
    const entityConstructor = this.findEntityConstructor(entityType);
    if (!entityConstructor) {
      throw new Error(`Entity type ${entityType} not found in registered entities`);
    }

    const columns = new Map<string, any>();
    const proto = entityConstructor.prototype;
    const propertyKeys = Object.getOwnPropertyNames(proto);

    for (const propertyKey of propertyKeys) {
      const columnMeta = metadataScanner.getMetadata(
        METADATA_KEYS.COLUMN,
        entityConstructor,
        propertyKey
      );

      if (columnMeta) {
        columns.set(propertyKey, columnMeta);
      }
    }

    return columns;
  }

  /**
   * Find entity constructor by class name.
   *
   * @private
   */
  private findEntityConstructor(entityType: string): (new () => unknown) | null {
    // This is a simplified implementation. In a real ORM, you'd have a registry
    // of all known entity types. For now, we'll try to find it in the identity map.

    const allEntities = this.identityMap.getAllOfType<Record<string, unknown>>('');
    for (const entity of allEntities) {
      if (entity.constructor.name === entityType) {
        return entity.constructor as new () => unknown;
      }
    }

    return null;
  }
}

