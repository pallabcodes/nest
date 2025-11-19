/**
 * MongoDB Schema Decorators
 *
 * Schema definition decorators for MongoDB entities.
 * Reuses existing decorators from @neat-orm/core with MongoDB-specific extensions.
 *
 * @module mongodb/schema
 */

import 'reflect-metadata';

/**
 * MongoDB-specific column types.
 */
export type MongoDBColumnType =
  | 'ObjectId'
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'array'
  | 'object'
  | 'binary'
  | 'decimal128'
  | 'double'
  | 'int32'
  | 'int64'
  | 'timestamp';

/**
 * MongoDB index type.
 */
export type MongoDBIndexType = 1 | -1 | 'text' | '2d' | '2dsphere' | 'hashed';

/**
 * MongoDB index options.
 */
export interface MongoDBIndexOptions {
  /**
   * Index name.
   */
  name?: string;

  /**
   * Unique index.
   */
  unique?: boolean;

  /**
   * Sparse index.
   */
  sparse?: boolean;

  /**
   * Background index creation.
   */
  background?: boolean;

  /**
   * TTL for documents (seconds).
   */
  expireAfterSeconds?: number;

  /**
   * Partial filter expression.
   */
  partialFilterExpression?: Record<string, any>;

  /**
   * Collation for string comparisons.
   */
  collation?: {
    locale: string;
    strength?: number;
    caseLevel?: boolean;
    caseFirst?: string;
    numericOrdering?: boolean;
    alternate?: string;
    maxVariable?: string;
    backwards?: boolean;
  };
}

/**
 * Define a MongoDB index on a field.
 *
 * @param type - Index type
 * @param options - Index options
 * @returns Property decorator
 *
 * @example
 * ```typescript
 * @Entity('users')
 * class User {
 *   @MongoDBIndex(1, { unique: true })
 *   @Column()
 *   email!: string;
 *
 *   @MongoDBIndex('text')
 *   @Column()
 *   description!: string;
 * }
 * ```
 */
export function MongoDBIndex(
  type: MongoDBIndexType = 1,
  options?: MongoDBIndexOptions
): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    const indexes = Reflect.getMetadata('mongodb:indexes', target.constructor) || [];

    indexes.push({
      field: propertyKey,
      type,
      ...options,
    });

    Reflect.defineMetadata('mongodb:indexes', indexes, target.constructor);
  };
}

/**
 * Define a compound index on multiple fields.
 *
 * @param fields - Fields and their index types
 * @param options - Index options
 * @returns Class decorator
 *
 * @example
 * ```typescript
 * @Entity('users')
 * @MongoDBCompoundIndex({ email: 1, createdAt: -1 }, { unique: true })
 * class User {
 *   @Column()
 *   email!: string;
 *
 *   @Column()
 *   createdAt!: Date;
 * }
 * ```
 */
export function MongoDBCompoundIndex(
  fields: Record<string, MongoDBIndexType>,
  options?: MongoDBIndexOptions
): ClassDecorator {
  return (target: Function) => {
    const indexes = Reflect.getMetadata('mongodb:compoundIndexes', target) || [];

    indexes.push({
      fields,
      ...options,
    });

    Reflect.defineMetadata('mongodb:compoundIndexes', indexes, target);
  };
}

/**
 * Define a text index for full-text search.
 *
 * @param fields - Fields to include in text index
 * @param options - Index options
 * @returns Class decorator
 *
 * @example
 * ```typescript
 * @Entity('articles')
 * @MongoDBTextIndex(['title', 'content'])
 * class Article {
 *   @Column()
 *   title!: string;
 *
 *   @Column()
 *   content!: string;
 * }
 * ```
 */
export function MongoDBTextIndex(
  fields: string[],
  options?: MongoDBIndexOptions
): ClassDecorator {
  return (target: Function) => {
    const textIndexes = Reflect.getMetadata('mongodb:textIndexes', target) || [];

    textIndexes.push({
      fields,
      ...options,
    });

    Reflect.defineMetadata('mongodb:textIndexes', textIndexes, target);
  };
}

/**
 * Define a geospatial index.
 *
 * @param field - Field name
 * @param type - Geospatial index type ('2d' or '2dsphere')
 * @param options - Index options
 * @returns Class decorator
 *
 * @example
 * ```typescript
 * @Entity('locations')
 * @MongoDBGeospatialIndex('coordinates', '2dsphere')
 * class Location {
 *   @Column()
 *   coordinates!: { type: 'Point'; coordinates: [number, number] };
 * }
 * ```
 */
export function MongoDBGeospatialIndex(
  field: string,
  type: '2d' | '2dsphere' = '2dsphere',
  options?: MongoDBIndexOptions
): ClassDecorator {
  return (target: Function) => {
    const geoIndexes = Reflect.getMetadata('mongodb:geoIndexes', target) || [];

    geoIndexes.push({
      field,
      type,
      ...options,
    });

    Reflect.defineMetadata('mongodb:geoIndexes', geoIndexes, target);
  };
}

/**
 * Define TTL (Time To Live) index for automatic document expiration.
 *
 * @param field - Date field name
 * @param expireAfterSeconds - Seconds after which documents expire
 * @param options - Index options
 * @returns Class decorator
 *
 * @example
 * ```typescript
 * @Entity('sessions')
 * @MongoDBTTLIndex('expiresAt', 3600)  // Expire 1 hour after expiresAt
 * class Session {
 *   @Column()
 *   expiresAt!: Date;
 * }
 * ```
 */
export function MongoDBTTLIndex(
  field: string,
  expireAfterSeconds: number,
  options?: Omit<MongoDBIndexOptions, 'expireAfterSeconds'>
): ClassDecorator {
  return (target: Function) => {
    const ttlIndexes = Reflect.getMetadata('mongodb:ttlIndexes', target) || [];

    ttlIndexes.push({
      field,
      expireAfterSeconds,
      ...options,
    });

    Reflect.defineMetadata('mongodb:ttlIndexes', ttlIndexes, target);
  };
}

/**
 * Get all MongoDB indexes for an entity.
 *
 * @param target - Entity class
 * @returns Array of index definitions
 */
export function getMongoDBIndexes(target: Function): Array<{
  keys: Record<string, MongoDBIndexType>;
  options?: MongoDBIndexOptions;
}> {
  const indexes: Array<{
    keys: Record<string, MongoDBIndexType>;
    options?: MongoDBIndexOptions;
  }> = [];

  // Field indexes
  const fieldIndexes = Reflect.getMetadata('mongodb:indexes', target) || [];
  for (const index of fieldIndexes) {
    indexes.push({
      keys: { [index.field]: index.type },
      options: {
        name: index.name,
        unique: index.unique,
        sparse: index.sparse,
        background: index.background,
      },
    });
  }

  // Compound indexes
  const compoundIndexes = Reflect.getMetadata('mongodb:compoundIndexes', target) || [];
  for (const index of compoundIndexes) {
    indexes.push({
      keys: index.fields,
      options: {
        name: index.name,
        unique: index.unique,
        sparse: index.sparse,
        background: index.background,
      },
    });
  }

  // Text indexes
  const textIndexes = Reflect.getMetadata('mongodb:textIndexes', target) || [];
  for (const index of textIndexes) {
    const keys: Record<string, MongoDBIndexType> = {};
    for (const field of index.fields) {
      keys[field] = 'text';
    }
    indexes.push({
      keys,
      options: {
        name: index.name,
      },
    });
  }

  // Geospatial indexes
  const geoIndexes = Reflect.getMetadata('mongodb:geoIndexes', target) || [];
  for (const index of geoIndexes) {
    indexes.push({
      keys: { [index.field]: index.type },
      options: {
        name: index.name,
      },
    });
  }

  // TTL indexes
  const ttlIndexes = Reflect.getMetadata('mongodb:ttlIndexes', target) || [];
  for (const index of ttlIndexes) {
    indexes.push({
      keys: { [index.field]: 1 },
      options: {
        name: index.name,
        expireAfterSeconds: index.expireAfterSeconds,
      },
    });
  }

  return indexes;
}

