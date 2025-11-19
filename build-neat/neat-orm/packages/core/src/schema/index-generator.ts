/**
 * Index SQL Generator
 *
 * Generates CREATE INDEX and DROP INDEX SQL statements for different databases.
 * Supports PostgreSQL, MySQL, and SQLite with database-specific syntax.
 *
 * @module schema/index-generator
 */

import type { IndexMetadata } from '../decorators/index.decorator.js';
import type { EntityMetadata } from '../metadata/keys.js';

/**
 * Database type for index generation.
 */
export type DatabaseType = 'postgres' | 'mysql' | 'sqlite';

/**
 * Options for index SQL generation.
 */
export interface IndexGeneratorOptions {
  /**
   * Target database type.
   */
  database: DatabaseType;

  /**
   * Schema name (PostgreSQL only).
   */
  schema?: string;

  /**
   * Whether to generate IF NOT EXISTS clause.
   * Default: true
   */
  ifNotExists?: boolean;

  /**
   * Whether to generate DROP statements before CREATE.
   * Default: false
   */
  dropBeforeCreate?: boolean;
}

/**
 * Generated index SQL statements.
 */
export interface GeneratedIndexSQL {
  /**
   * CREATE INDEX statement.
   */
  create: string;

  /**
   * DROP INDEX statement.
   */
  drop: string;

  /**
   * Index name.
   */
  indexName: string;

  /**
   * Table name.
   */
  tableName: string;
}

/**
 * Index SQL Generator class.
 */
export class IndexGenerator {
  constructor(private options: IndexGeneratorOptions) {}

  /**
   * Generate CREATE INDEX SQL for all indexes on an entity.
   *
   * @param entityMetadata - Entity metadata
   * @param indexes - Array of index metadata
   * @returns Array of generated SQL statements
   */
  generateCreateIndexes(
    entityMetadata: EntityMetadata,
    indexes: IndexMetadata[]
  ): GeneratedIndexSQL[] {
    return indexes.map(index => this.generateIndexSQL(entityMetadata.tableName, index));
  }

  /**
   * Generate CREATE INDEX SQL for a single index.
   *
   * @param tableName - Table name
   * @param index - Index metadata
   * @returns Generated SQL statements
   */
  generateIndexSQL(tableName: string, index: IndexMetadata): GeneratedIndexSQL {
    const create = this.buildCreateIndexSQL(tableName, index);
    const drop = this.buildDropIndexSQL(tableName, index);

    return {
      create,
      drop,
      indexName: index.name,
      tableName,
    };
  }

  /**
   * Build CREATE INDEX SQL statement.
   *
   * @private
   */
  private buildCreateIndexSQL(tableName: string, index: IndexMetadata): string {
    const { database } = this.options;

    switch (database) {
      case 'postgres':
        return this.buildPostgresCreateIndex(tableName, index);
      case 'mysql':
        return this.buildMySQLCreateIndex(tableName, index);
      case 'sqlite':
        return this.buildSQLiteCreateIndex(tableName, index);
      default:
        throw new Error(`Unsupported database type: ${database}`);
    }
  }

  /**
   * Build PostgreSQL CREATE INDEX statement.
   *
   * @private
   */
  private buildPostgresCreateIndex(tableName: string, index: IndexMetadata): string {
    const parts: string[] = ['CREATE'];

    // Unique keyword
    if (index.unique) {
      parts.push('UNIQUE');
    }

    // Index keyword
    parts.push('INDEX');

    // Concurrent keyword
    if (index.concurrent) {
      parts.push('CONCURRENTLY');
    }

    // IF NOT EXISTS (PostgreSQL 9.5+)
    if (this.options.ifNotExists && !index.concurrent) {
      parts.push('IF NOT EXISTS');
    }

    // Index name
    parts.push(this.escapeIdentifier(index.name));

    // ON table
    parts.push('ON');
    if (this.options.schema) {
      parts.push(`${this.escapeIdentifier(this.options.schema)}.${this.escapeIdentifier(tableName)}`);
    } else {
      parts.push(this.escapeIdentifier(tableName));
    }

    // USING method
    if (index.type && index.type !== 'btree') {
      parts.push(`USING ${index.type.toUpperCase()}`);
    }

    // Columns or expression
    if (index.expression) {
      parts.push(`(${index.expression})`);
    } else {
      const columns = index.columns.map(col => {
        let colDef = this.escapeIdentifier(col);
        if (index.order) {
          colDef += ` ${index.order}`;
        }
        if (index.nulls) {
          colDef += ` NULLS ${index.nulls}`;
        }
        return colDef;
      });
      parts.push(`(${columns.join(', ')})`);
    }

    // INCLUDE columns (covering index, PostgreSQL 11+)
    if (index.include && index.include.length > 0) {
      const includeColumns = index.include.map(col => this.escapeIdentifier(col));
      parts.push(`INCLUDE (${includeColumns.join(', ')})`);
    }

    // WHERE clause (partial index)
    if (index.where) {
      parts.push(`WHERE ${index.where}`);
    }

    // Storage parameters
    if (index.storageParameters && Object.keys(index.storageParameters).length > 0) {
      const params = Object.entries(index.storageParameters)
        .map(([key, value]) => `${key} = ${value}`)
        .join(', ');
      parts.push(`WITH (${params})`);
    }

    // Tablespace
    if (index.tablespace) {
      parts.push(`TABLESPACE ${this.escapeIdentifier(index.tablespace)}`);
    }

    return parts.join(' ') + ';';
  }

  /**
   * Build MySQL CREATE INDEX statement.
   *
   * @private
   */
  private buildMySQLCreateIndex(tableName: string, index: IndexMetadata): string {
    const parts: string[] = ['CREATE'];

    // Unique or fulltext or spatial keyword
    if (index.unique) {
      parts.push('UNIQUE');
    } else if (index.type === 'fulltext') {
      parts.push('FULLTEXT');
    } else if (index.type === 'spatial') {
      parts.push('SPATIAL');
    }

    // Index keyword
    parts.push('INDEX');

    // Index name
    parts.push(this.escapeIdentifier(index.name));

    // ON table
    parts.push('ON');
    parts.push(this.escapeIdentifier(tableName));

    // Columns or expression
    if (index.expression) {
      parts.push(`(${index.expression})`);
    } else {
      const columns = index.columns.map(col => {
        let colDef = this.escapeIdentifier(col);
        if (index.order && index.type !== 'fulltext' && index.type !== 'spatial') {
          colDef += ` ${index.order}`;
        }
        return colDef;
      });
      parts.push(`(${columns.join(', ')})`);
    }

    // USING method (btree or hash for MySQL)
    if (index.type === 'btree' || index.type === 'hash') {
      parts.push(`USING ${index.type.toUpperCase()}`);
    }

    // Comment
    if (index.comment) {
      parts.push(`COMMENT '${index.comment.replace(/'/g, "''")}'`);
    }

    return parts.join(' ') + ';';
  }

  /**
   * Build SQLite CREATE INDEX statement.
   *
   * @private
   */
  private buildSQLiteCreateIndex(tableName: string, index: IndexMetadata): string {
    const parts: string[] = ['CREATE'];

    // Unique keyword
    if (index.unique) {
      parts.push('UNIQUE');
    }

    // Index keyword
    parts.push('INDEX');

    // IF NOT EXISTS
    if (this.options.ifNotExists) {
      parts.push('IF NOT EXISTS');
    }

    // Index name
    parts.push(this.escapeIdentifier(index.name));

    // ON table
    parts.push('ON');
    parts.push(this.escapeIdentifier(tableName));

    // Columns or expression
    if (index.expression) {
      parts.push(`(${index.expression})`);
    } else {
      const columns = index.columns.map(col => {
        let colDef = this.escapeIdentifier(col);
        if (index.order) {
          colDef += ` ${index.order}`;
        }
        return colDef;
      });
      parts.push(`(${columns.join(', ')})`);
    }

    // WHERE clause (partial index)
    if (index.where) {
      parts.push(`WHERE ${index.where}`);
    }

    return parts.join(' ') + ';';
  }

  /**
   * Build DROP INDEX SQL statement.
   *
   * @private
   */
  private buildDropIndexSQL(tableName: string, index: IndexMetadata): string {
    const { database } = this.options;

    switch (database) {
      case 'postgres':
        return this.buildPostgresDropIndex(index);
      case 'mysql':
        return this.buildMySQLDropIndex(tableName, index);
      case 'sqlite':
        return this.buildSQLiteDropIndex(index);
      default:
        throw new Error(`Unsupported database type: ${database}`);
    }
  }

  /**
   * Build PostgreSQL DROP INDEX statement.
   *
   * @private
   */
  private buildPostgresDropIndex(index: IndexMetadata): string {
    const parts: string[] = ['DROP INDEX'];

    // Concurrent keyword
    if (index.concurrent) {
      parts.push('CONCURRENTLY');
    }

    // IF EXISTS
    parts.push('IF EXISTS');

    // Schema-qualified index name
    if (this.options.schema) {
      parts.push(`${this.escapeIdentifier(this.options.schema)}.${this.escapeIdentifier(index.name)}`);
    } else {
      parts.push(this.escapeIdentifier(index.name));
    }

    // CASCADE option
    parts.push('CASCADE');

    return parts.join(' ') + ';';
  }

  /**
   * Build MySQL DROP INDEX statement.
   *
   * @private
   */
  private buildMySQLDropIndex(tableName: string, index: IndexMetadata): string {
    return `DROP INDEX ${this.escapeIdentifier(index.name)} ON ${this.escapeIdentifier(tableName)};`;
  }

  /**
   * Build SQLite DROP INDEX statement.
   *
   * @private
   */
  private buildSQLiteDropIndex(index: IndexMetadata): string {
    return `DROP INDEX IF EXISTS ${this.escapeIdentifier(index.name)};`;
  }

  /**
   * Escape database identifier.
   *
   * @private
   */
  private escapeIdentifier(identifier: string): string {
    const { database } = this.options;

    switch (database) {
      case 'postgres':
        return `"${identifier.replace(/"/g, '""')}"`;
      case 'mysql':
        return `\`${identifier.replace(/`/g, '``')}\``;
      case 'sqlite':
        return `"${identifier.replace(/"/g, '""')}"`;
      default:
        return identifier;
    }
  }
}

/**
 * Generate CREATE INDEX SQL statements for an entity.
 *
 * @param tableName - Table name
 * @param indexes - Array of index metadata
 * @param options - Generator options
 * @returns Array of generated SQL statements
 */
export function generateIndexSQL(
  tableName: string,
  indexes: IndexMetadata[],
  options: IndexGeneratorOptions
): GeneratedIndexSQL[] {
  const generator = new IndexGenerator(options);
  return indexes.map(index => generator.generateIndexSQL(tableName, index));
}

