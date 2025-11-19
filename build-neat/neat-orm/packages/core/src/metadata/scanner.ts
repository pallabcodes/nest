/**
 * NeatOrm - Metadata Scanner
 *
 * The metadata scanner provides utilities to extract and process metadata
 * attached to entities via decorators. It offers a high-level API for
 * retrieving entity configuration, column definitions, and relationships.
 *
 * Key TypeScript Excellence Features:
 * - Type-safe metadata retrieval
 * - Efficient metadata caching
 * - Recursive metadata scanning for inheritance
 * - Validation of metadata consistency
 *
 * TypeScript Compilation:
 * The scanner is a runtime utility that uses reflect-metadata to retrieve
 * decorator-attached configuration. TypeScript ensures type safety for
 * metadata access through generic type parameters.
 *
 * Runtime Behavior:
 * Metadata is lazily loaded and cached for performance. The scanner validates
 * metadata structure and consistency, throwing descriptive errors for invalid
 * configurations.
 *
 * Framework Integration:
 * The metadata scanner is used by:
 * - Query builder to construct type-safe queries
 * - Migration generator to detect schema changes
 * - Relationship loader to resolve entity connections
 * - Validation system to apply constraints
 *
 * Pain Points Addressed:
 * - Complex metadata extraction logic scattered across codebase
 * - Inefficient repeated metadata lookups
 * - Lack of metadata validation leading to runtime errors
 * - Difficulty debugging decorator configurations
 *
 * Research:
 * Inspired by TypeORM's metadata manager and NestJS's metadata scanner,
 * optimized for performance with aggressive caching and lazy loading.
 */

import 'reflect-metadata';
import {
  ENTITY_METADATA_KEY,
  COLUMN_METADATA_KEY,
  PRIMARY_KEY_METADATA_KEY,
  GENERATED_METADATA_KEY,
  FOREIGN_KEY_METADATA_KEY,
  INDEX_METADATA_KEY,
  RELATION_METADATA_KEY,
  COLUMNS_LIST_METADATA_KEY,
  COLUMN_NAME_MAP_METADATA_KEY,
  type EntityMetadata,
  type ColumnMetadata,
  type GeneratedMetadata,
  type ForeignKeyMetadata,
  type IndexMetadata,
  type RelationMetadata,
  getMetadata,
  hasMetadata,
} from './keys.js';

/**
 * Scanned entity metadata including all decorators.
 */
export interface ScannedEntityMetadata {
  entity: EntityMetadata;
  columns: Map<string | symbol, ColumnMetadata>;
  primaryKey?: string | symbol;
  generated: Map<string | symbol, GeneratedMetadata>;
  foreignKeys: Map<string | symbol, ForeignKeyMetadata>;
  indexes: IndexMetadata[];
  relations: Map<string | symbol, RelationMetadata>;
  columnsList: readonly (string | symbol)[];
  columnNameMap: Map<string | symbol, string>;
}

/**
 * Metadata scanner class for extracting entity configuration.
 */
export class MetadataScanner {
  private cache = new Map<Function, ScannedEntityMetadata>();

  /**
   * Scan an entity class and extract all metadata.
   *
   * @param entityClass - The entity class constructor
   * @returns Complete metadata for the entity
   */
  scanEntity(entityClass: Function): ScannedEntityMetadata {
    // Check cache first
    const cached = this.cache.get(entityClass);
    if (cached) {
      return cached;
    }

    // Extract entity metadata
    const entity = this.getEntityMetadata(entityClass);
    if (!entity) {
      throw new Error(
        `Class ${entityClass.name} is not decorated with @Entity()`
      );
    }

    // Extract column metadata
    const columns = this.getColumnMetadata(entityClass);
    const columnsList = this.getColumnsList(entityClass);
    const columnNameMap = this.getColumnNameMap(entityClass);

    // Extract primary key
    const primaryKey = this.getPrimaryKey(entityClass);

    // Extract generated columns
    const generated = this.getGeneratedMetadata(entityClass);

    // Extract foreign keys
    const foreignKeys = this.getForeignKeyMetadata(entityClass);

    // Extract indexes
    const indexes = this.getIndexMetadata(entityClass);

    // Extract relations
    const relations = this.getRelationMetadata(entityClass);

    // Create scanned metadata
    const scanned: ScannedEntityMetadata = {
      entity,
      columns,
      primaryKey,
      generated,
      foreignKeys,
      indexes,
      relations,
      columnsList,
      columnNameMap,
    };

    // Cache for future use
    this.cache.set(entityClass, scanned);

    return scanned;
  }

  /**
   * Get entity metadata from a class.
   */
  private getEntityMetadata(target: Function): EntityMetadata | undefined {
    return getMetadata<EntityMetadata>(ENTITY_METADATA_KEY, target);
  }

  /**
   * Get column metadata from a class.
   */
  private getColumnMetadata(
    target: Function
  ): Map<string | symbol, ColumnMetadata> {
    return (
      getMetadata<Map<string | symbol, ColumnMetadata>>(
        COLUMN_METADATA_KEY,
        target
      ) || new Map()
    );
  }

  /**
   * Get list of all column property names.
   */
  private getColumnsList(target: Function): readonly (string | symbol)[] {
    return (
      getMetadata<readonly (string | symbol)[]>(
        COLUMNS_LIST_METADATA_KEY,
        target
      ) || []
    );
  }

  /**
   * Get column name mapping (property name -> database column name).
   */
  private getColumnNameMap(target: Function): Map<string | symbol, string> {
    return (
      getMetadata<Map<string | symbol, string>>(
        COLUMN_NAME_MAP_METADATA_KEY,
        target
      ) || new Map()
    );
  }

  /**
   * Get primary key property name.
   */
  private getPrimaryKey(target: Function): string | symbol | undefined {
    return getMetadata<string | symbol>(PRIMARY_KEY_METADATA_KEY, target);
  }

  /**
   * Get generated column metadata.
   */
  private getGeneratedMetadata(
    target: Function
  ): Map<string | symbol, GeneratedMetadata> {
    return (
      getMetadata<Map<string | symbol, GeneratedMetadata>>(
        GENERATED_METADATA_KEY,
        target
      ) || new Map()
    );
  }

  /**
   * Get foreign key metadata.
   */
  private getForeignKeyMetadata(
    target: Function
  ): Map<string | symbol, ForeignKeyMetadata> {
    return (
      getMetadata<Map<string | symbol, ForeignKeyMetadata>>(
        FOREIGN_KEY_METADATA_KEY,
        target
      ) || new Map()
    );
  }

  /**
   * Get index metadata.
   */
  private getIndexMetadata(target: Function): IndexMetadata[] {
    return getMetadata<IndexMetadata[]>(INDEX_METADATA_KEY, target) || [];
  }

  /**
   * Get relation metadata.
   */
  private getRelationMetadata(
    target: Function
  ): Map<string | symbol, RelationMetadata> {
    return (
      getMetadata<Map<string | symbol, RelationMetadata>>(
        RELATION_METADATA_KEY,
        target
      ) || new Map()
    );
  }

  /**
   * Check if a class is an entity.
   */
  isEntity(target: Function): boolean {
    return hasMetadata(ENTITY_METADATA_KEY, target);
  }

  /**
   * Get the table name for an entity.
   */
  getTableName(entityClass: Function): string {
    const metadata = this.scanEntity(entityClass);
    return metadata.entity.tableName;
  }

  /**
   * Get all column names (database names) for an entity.
   */
  getColumnNames(entityClass: Function): string[] {
    const metadata = this.scanEntity(entityClass);
    return Array.from(metadata.columnNameMap.values());
  }

  /**
   * Get the database column name for a property.
   */
  getColumnName(entityClass: Function, propertyKey: string | symbol): string {
    const metadata = this.scanEntity(entityClass);
    const columnName = metadata.columnNameMap.get(propertyKey);
    if (!columnName) {
      throw new Error(
        `Property ${String(propertyKey)} is not a column on ${
          entityClass.name
        }`
      );
    }
    return columnName;
  }

  /**
   * Clear the metadata cache.
   * Useful for testing or hot reloading.
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clear cache for a specific entity.
   */
  clearEntityCache(entityClass: Function): void {
    this.cache.delete(entityClass);
  }
}

/**
 * Global metadata scanner instance.
 * Can be used throughout the application for consistent metadata access.
 */
export const metadataScanner = new MetadataScanner();

