/**
 * Result Mapper
 *
 * Maps raw database rows to entity instances with proper type conversion
 * and relationship handling.
 *
 * @module execution/result-mapper
 */

import type { DatabaseRow } from '../adapters/base-adapter.js';
import { metadataScanner } from '../metadata/scanner.js';
import { METADATA_KEYS } from '../metadata/keys.js';
import type { ColumnMetadata } from '../metadata/scanner.js';

/**
 * Options for result mapping.
 */
export interface MappingOptions {
  /**
   * Whether to map nested relations.
   */
  includeRelations?: boolean;

  /**
   * Maximum depth for nested relation mapping.
   */
  maxDepth?: number;

  /**
   * Custom column name mapping.
   */
  columnMapping?: Record<string, string>;

  /**
   * Whether to use camelCase for property names.
   */
  camelCase?: boolean;
}

/**
 * Result Mapper
 *
 * Converts raw database rows into typed entity instances.
 */
export class ResultMapper {
  /**
   * Map raw database rows to entity instances.
   *
   * @param rows - Raw database rows
   * @param entityClass - Entity class to map to
   * @param options - Mapping options
   * @returns Array of entity instances
   */
  mapToEntities<T>(
    rows: DatabaseRow[],
    entityClass: new () => unknown,
    options?: MappingOptions
  ): T[] {
    if (rows.length === 0) {
      return [];
    }

    return rows.map((row) =>
      this.mapToEntity<T>(row, entityClass, options)
    );
  }

  /**
   * Map a single raw database row to an entity instance.
   *
   * @param row - Raw database row
   * @param entityClass - Entity class to map to
   * @param options - Mapping options
   * @returns Entity instance
   */
  mapToEntity<T>(
    row: DatabaseRow,
    entityClass: new () => unknown,
    options?: MappingOptions
  ): T {
    const entity = new entityClass() as Record<string, unknown>;

    // Get column metadata for the entity
    const columns = this.getColumnMetadata(entityClass);

    // Map each column
    for (const [propertyKey, columnMeta] of columns.entries()) {
      const columnName = columnMeta.name || propertyKey;
      const dbColumnName = options?.camelCase
        ? this.toSnakeCase(columnName)
        : columnName;

      // Check custom column mapping
      const mappedColumnName =
        options?.columnMapping?.[columnName] || dbColumnName;

      if (mappedColumnName in row) {
        const value = row[mappedColumnName];
        entity[propertyKey] = this.convertValue(
          value,
          columnMeta.type
        );
      }
    }

    return entity as T;
  }

  /**
   * Map database rows to plain objects (no entity instantiation).
   *
   * @param rows - Raw database rows
   * @param options - Mapping options
   * @returns Array of plain objects
   */
  mapToPlainObjects<T = Record<string, unknown>>(
    rows: DatabaseRow[],
    options?: MappingOptions
  ): T[] {
    if (rows.length === 0) {
      return [];
    }

    return rows.map((row) => {
      const mapped: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(row)) {
        const propertyName = options?.camelCase
          ? this.toCamelCase(key)
          : key;
        mapped[propertyName] = value;
      }

      return mapped as T;
    });
  }

  /**
   * Handle column name mapping between database and entity.
   *
   * @param columnName - Database column name
   * @param entityClass - Entity class
   * @returns Property name in entity
   */
  getPropertyName(
    columnName: string,
    entityClass: new () => unknown
  ): string {
    const columns = this.getColumnMetadata(entityClass);

    for (const [propertyKey, columnMeta] of columns.entries()) {
      if (columnMeta.name === columnName) {
        return propertyKey;
      }
    }

    return columnName;
  }

  /**
   * Convert database value to proper TypeScript type.
   *
   * @private
   */
  private convertValue(value: unknown, columnType?: string): unknown {
    if (value === null || value === undefined) {
      return value;
    }

    // Handle type conversions based on column type
    switch (columnType) {
      case 'boolean':
        return this.toBoolean(value);

      case 'number':
      case 'integer':
      case 'int':
      case 'bigint':
      case 'float':
      case 'decimal':
      case 'double':
        return this.toNumber(value);

      case 'date':
      case 'datetime':
      case 'timestamp':
        return this.toDate(value);

      case 'json':
      case 'jsonb':
        return this.toJSON(value);

      case 'string':
      case 'text':
      case 'varchar':
      default:
        return value;
    }
  }

  /**
   * Convert value to boolean.
   *
   * @private
   */
  private toBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number') {
      return value !== 0;
    }

    if (typeof value === 'string') {
      const lower = value.toLowerCase();
      return lower === 'true' || lower === 't' || lower === '1';
    }

    return Boolean(value);
  }

  /**
   * Convert value to number.
   *
   * @private
   */
  private toNumber(value: unknown): number {
    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string') {
      return parseFloat(value);
    }

    if (typeof value === 'bigint') {
      return Number(value);
    }

    return Number(value);
  }

  /**
   * Convert value to Date.
   *
   * @private
   */
  private toDate(value: unknown): Date | null {
    if (value instanceof Date) {
      return value;
    }

    if (typeof value === 'string' || typeof value === 'number') {
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date;
    }

    return null;
  }

  /**
   * Convert value to JSON.
   *
   * @private
   */
  private toJSON(value: unknown): unknown {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }

    return value;
  }

  /**
   * Get column metadata for an entity class.
   *
   * @private
   */
  private getColumnMetadata(
    entityClass: new () => unknown
  ): Map<string, ColumnMetadata> {
    const columns = new Map<string, ColumnMetadata>();

    // Get all property keys
    const proto = entityClass.prototype;
    const propertyKeys = Object.getOwnPropertyNames(proto);

    for (const propertyKey of propertyKeys) {
      const columnMeta = metadataScanner.getMetadata<ColumnMetadata>(
        METADATA_KEYS.COLUMN,
        entityClass,
        propertyKey
      );

      if (columnMeta) {
        columns.set(propertyKey, columnMeta);
      }
    }

    return columns;
  }

  /**
   * Convert snake_case to camelCase.
   *
   * @private
   */
  private toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) =>
      letter.toUpperCase()
    );
  }

  /**
   * Convert camelCase to snake_case.
   *
   * @private
   */
  private toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, (letter) =>
      `_${letter.toLowerCase()}`
    );
  }
}

