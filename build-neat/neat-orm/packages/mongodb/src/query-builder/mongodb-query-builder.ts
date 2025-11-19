/**
 * MongoDB Query Builder
 *
 * Type-safe query builder for MongoDB with fluent API similar to SQL query builders.
 * Supports all MongoDB query operations with compile-time type checking.
 *
 * @module mongodb/query-builder
 */

import type { Filter, Document, FindOptions, Sort, UpdateFilter, AggregateOptions } from 'mongodb';
import type { QueryResult } from '@neat-orm/core';
import type { MongoDBAdapter, MongoDBConnection } from '../adapter/mongodb-adapter.js';

/**
 * MongoDB query builder options.
 */
export interface MongoDBQueryOptions {
  limit?: number;
  skip?: number;
  sort?: Sort;
  projection?: Record<string, 1 | 0>;
  session?: any;
}

/**
 * MongoDB aggregation pipeline stage.
 */
export type PipelineStage = Document;

/**
 * Type-safe MongoDB query builder.
 *
 * Provides a fluent API for building MongoDB queries with full TypeScript support.
 *
 * @example
 * ```typescript
 * const query = new MongoDBQueryBuilder(adapter, 'users')
 *   .where({ age: { $gt: 18 } })
 *   .sort({ name: 1 })
 *   .limit(10);
 *
 * const users = await query.execute();
 * ```
 */
export class MongoDBQueryBuilder<T extends Document = Document> {
  private collection!: string;
  private filterConditions: Filter<T> = {};
  private sortConditions: Sort = {};
  private limitValue?: number;
  private skipValue?: number;
  private projectionFields?: Record<string, 1 | 0>;
  private updateDoc?: UpdateFilter<T>;
  private insertDocs?: T[];
  private operation: 'find' | 'findOne' | 'insert' | 'update' | 'delete' | 'count' | 'aggregate' = 'find';
  private aggregatePipeline: PipelineStage[] = [];

  constructor(
    private adapter: MongoDBAdapter | MongoDBConnection,
    collection?: string
  ) {
    if (collection) {
      this.collection = collection;
    }
  }

  /**
   * Set the collection to query.
   *
   * @param collection - Collection name
   * @returns this for chaining
   *
   * @example
   * ```typescript
   * query.from('users')
   * ```
   */
  from(collection: string): this {
    this.collection = collection;
    return this;
  }

  /**
   * Add a WHERE condition to the query.
   *
   * @param filter - MongoDB filter object
   * @returns this for chaining
   *
   * @example
   * ```typescript
   * query.where({ age: { $gt: 18 } })
   * query.where({ $and: [{ age: { $gte: 18 } }, { status: 'active' }] })
   * ```
   */
  where(filter: Filter<T>): this {
    this.filterConditions = { ...this.filterConditions, ...filter };
    return this;
  }

  /**
   * Add an AND condition.
   *
   * @param filter - MongoDB filter object
   * @returns this for chaining
   */
  and(filter: Filter<T>): this {
    if (!this.filterConditions.$and) {
      this.filterConditions.$and = [];
    }
    (this.filterConditions.$and as Filter<T>[]).push(filter);
    return this;
  }

  /**
   * Add an OR condition.
   *
   * @param filter - MongoDB filter object
   * @returns this for chaining
   */
  or(filter: Filter<T>): this {
    if (!this.filterConditions.$or) {
      this.filterConditions.$or = [];
    }
    (this.filterConditions.$or as Filter<T>[]).push(filter);
    return this;
  }

  /**
   * Add a sort condition.
   *
   * @param field - Field to sort by
   * @param direction - Sort direction (1 for ascending, -1 for descending)
   * @returns this for chaining
   *
   * @example
   * ```typescript
   * query.sort('name', 1)         // ASC
   * query.sort('createdAt', -1)   // DESC
   * ```
   */
  sort(field: keyof T | string, direction: 1 | -1): this;
  sort(sortObj: Sort): this;
  sort(fieldOrObj: keyof T | string | Sort, direction?: 1 | -1): this {
    if (typeof fieldOrObj === 'object') {
      this.sortConditions = { ...this.sortConditions, ...fieldOrObj };
    } else {
      this.sortConditions[fieldOrObj as string] = direction!;
    }
    return this;
  }

  /**
   * Limit the number of results.
   *
   * @param limit - Maximum number of documents to return
   * @returns this for chaining
   *
   * @example
   * ```typescript
   * query.limit(10)
   * ```
   */
  limit(limit: number): this {
    this.limitValue = limit;
    return this;
  }

  /**
   * Skip a number of results.
   *
   * @param skip - Number of documents to skip
   * @returns this for chaining
   *
   * @example
   * ```typescript
   * query.skip(20).limit(10)  // Page 3 (20-30)
   * ```
   */
  skip(skip: number): this {
    this.skipValue = skip;
    return this;
  }

  /**
   * Select specific fields (projection).
   *
   * @param fields - Fields to include (1) or exclude (0)
   * @returns this for chaining
   *
   * @example
   * ```typescript
   * query.select({ name: 1, email: 1, _id: 0 })
   * ```
   */
  select(fields: Record<string, 1 | 0>): this {
    this.projectionFields = fields;
    return this;
  }

  /**
   * Set the query to find one document.
   *
   * @returns this for chaining
   */
  findOne(): this {
    this.operation = 'findOne';
    return this;
  }

  /**
   * Set the query to count documents.
   *
   * @returns this for chaining
   */
  count(): this {
    this.operation = 'count';
    return this;
  }

  /**
   * Set the query to insert documents.
   *
   * @param docs - Documents to insert
   * @returns this for chaining
   *
   * @example
   * ```typescript
   * query.from('users').insert([{ name: 'John', email: 'john@example.com' }])
   * ```
   */
  insert(docs: T[]): this {
    this.operation = 'insert';
    this.insertDocs = docs;
    return this;
  }

  /**
   * Set the query to insert one document.
   *
   * @param doc - Document to insert
   * @returns this for chaining
   */
  insertOne(doc: T): this {
    this.operation = 'insert';
    this.insertDocs = [doc];
    return this;
  }

  /**
   * Set the query to update documents.
   *
   * @param update - Update operations
   * @returns this for chaining
   *
   * @example
   * ```typescript
   * query.from('users')
   *   .where({ age: { $lt: 18 } })
   *   .update({ $set: { status: 'minor' } })
   * ```
   */
  update(update: UpdateFilter<T>): this {
    this.operation = 'update';
    this.updateDoc = update;
    return this;
  }

  /**
   * Set the query to delete documents.
   *
   * @returns this for chaining
   *
   * @example
   * ```typescript
   * query.from('users')
   *   .where({ deletedAt: { $lt: new Date('2020-01-01') } })
   *   .delete()
   * ```
   */
  delete(): this {
    this.operation = 'delete';
    return this;
  }

  /**
   * Add an aggregation pipeline.
   *
   * @param pipeline - Array of pipeline stages
   * @returns this for chaining
   *
   * @example
   * ```typescript
   * query.from('orders')
   *   .aggregate([
   *     { $match: { status: 'completed' } },
   *     { $group: { _id: '$userId', total: { $sum: '$amount' } } },
   *     { $sort: { total: -1 } }
   *   ])
   * ```
   */
  aggregate(pipeline: PipelineStage[]): this {
    this.operation = 'aggregate';
    this.aggregatePipeline = pipeline;
    return this;
  }

  /**
   * Add a $match stage to aggregation pipeline.
   *
   * @param filter - Match filter
   * @returns this for chaining
   */
  match(filter: Filter<T>): this {
    if (this.operation !== 'aggregate') {
      this.operation = 'aggregate';
    }
    this.aggregatePipeline.push({ $match: filter });
    return this;
  }

  /**
   * Add a $group stage to aggregation pipeline.
   *
   * @param group - Group specification
   * @returns this for chaining
   */
  group(group: Document): this {
    if (this.operation !== 'aggregate') {
      this.operation = 'aggregate';
    }
    this.aggregatePipeline.push({ $group: group });
    return this;
  }

  /**
   * Add a $project stage to aggregation pipeline.
   *
   * @param projection - Projection specification
   * @returns this for chaining
   */
  project(projection: Document): this {
    if (this.operation !== 'aggregate') {
      this.operation = 'aggregate';
    }
    this.aggregatePipeline.push({ $project: projection });
    return this;
  }

  /**
   * Add a $lookup stage (JOIN) to aggregation pipeline.
   *
   * @param options - Lookup options
   * @returns this for chaining
   */
  lookup(options: {
    from: string;
    localField: string;
    foreignField: string;
    as: string;
  }): this {
    if (this.operation !== 'aggregate') {
      this.operation = 'aggregate';
    }
    this.aggregatePipeline.push({ $lookup: options });
    return this;
  }

  /**
   * Build the MongoDB query as JSON.
   *
   * @returns Query as JSON string
   */
  toJSON(): string {
    const query: any = {
      collection: this.collection,
      operation: this.operation,
    };

    switch (this.operation) {
      case 'find':
      case 'findOne':
        query.filter = this.filterConditions;
        if (Object.keys(this.sortConditions).length > 0) {
          query.options = query.options || {};
          query.options.sort = this.sortConditions;
        }
        if (this.limitValue) {
          query.options = query.options || {};
          query.options.limit = this.limitValue;
        }
        if (this.skipValue) {
          query.options = query.options || {};
          query.options.skip = this.skipValue;
        }
        if (this.projectionFields) {
          query.options = query.options || {};
          query.options.projection = this.projectionFields;
        }
        break;

      case 'insert':
        if (this.insertDocs && this.insertDocs.length === 1) {
          query.operation = 'insertOne';
          query.document = this.insertDocs[0];
        } else {
          query.operation = 'insertMany';
          query.documents = this.insertDocs;
        }
        break;

      case 'update':
        query.operation = 'updateMany';
        query.filter = this.filterConditions;
        query.update = this.updateDoc;
        break;

      case 'delete':
        query.operation = 'deleteMany';
        query.filter = this.filterConditions;
        break;

      case 'count':
        query.operation = 'countDocuments';
        query.filter = this.filterConditions;
        break;

      case 'aggregate':
        query.operation = 'aggregate';
        query.filter = this.aggregatePipeline;
        break;
    }

    return JSON.stringify(query);
  }

  /**
   * Execute the query.
   *
   * @returns Query result with typed rows
   *
   * @example
   * ```typescript
   * const users = await query.from('users').where({ age: { $gt: 18 } }).execute();
   * ```
   */
  async execute(): Promise<QueryResult<T>> {
    if (!this.collection) {
      throw new Error('Collection name is required');
    }

    const query = this.toJSON();
    return this.adapter.execute<T>(query);
  }

  /**
   * Execute the query and return the first result.
   *
   * @returns First result or null
   */
  async first(): Promise<T | null> {
    this.findOne();
    const result = await this.execute();
    return result.rows.length > 0 ? result.rows[0]! : null;
  }

  /**
   * Execute the query and return all results.
   *
   * @returns Array of results
   */
  async all(): Promise<T[]> {
    const result = await this.execute();
    return result.rows;
  }
}

/**
 * Create a new MongoDB query builder.
 *
 * @param adapter - MongoDB adapter or connection
 * @param collection - Optional collection name
 * @returns MongoDB query builder instance
 *
 * @example
 * ```typescript
 * const query = createMongoQuery(adapter, 'users')
 *   .where({ age: { $gt: 18 } })
 *   .sort({ name: 1 })
 *   .limit(10);
 * ```
 */
export function createMongoQuery<T extends Document = Document>(
  adapter: MongoDBAdapter | MongoDBConnection,
  collection?: string
): MongoDBQueryBuilder<T> {
  return new MongoDBQueryBuilder<T>(adapter, collection);
}

