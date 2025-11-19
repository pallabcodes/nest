/**
 * MongoDB Repository
 *
 * Production-grade repository implementation for MongoDB with full type safety.
 * Extends the base repository pattern with MongoDB-specific features.
 *
 * @module mongodb/repository
 */

import type { Document, Filter, UpdateFilter, ObjectId, FindOptions } from 'mongodb';
import type { MongoDBAdapter } from '../adapter/mongodb-adapter.js';
import { MongoDBQueryBuilder } from '../query-builder/mongodb-query-builder.js';

/**
 * Find options for MongoDB repositories.
 */
export interface MongoDBFindOptions {
  /**
   * Filter condition.
   */
  where?: Filter<Document>;

  /**
   * Sort order.
   */
  sort?: Record<string, 1 | -1>;

  /**
   * Maximum number of documents to return.
   */
  limit?: number;

  /**
   * Number of documents to skip.
   */
  skip?: number;

  /**
   * Projection fields.
   */
  select?: Record<string, 1 | 0>;

  /**
   * Include soft-deleted documents.
   */
  withTrashed?: boolean;

  /**
   * Only return soft-deleted documents.
   */
  onlyTrashed?: boolean;
}

/**
 * MongoDB Repository
 *
 * Provides CRUD operations and query methods for MongoDB documents.
 *
 * @example
 * ```typescript
 * @Entity('users')
 * class User {
 *   @Column({ type: 'ObjectId' })
 *   _id!: ObjectId;
 *
 *   @Column()
 *   name!: string;
 * }
 *
 * const repo = new MongoDBRepository(User, adapter);
 * const users = await repo.find({ age: { $gt: 18 } });
 * ```
 */
export class MongoDBRepository<T extends Document = Document> {
  private readonly collectionName: string;
  private readonly softDeleteField?: string;

  constructor(
    private readonly entityClass: new () => T,
    private readonly adapter: MongoDBAdapter
  ) {
    // Get collection name from @Entity decorator
    const metadata = Reflect.getMetadata('entity:name', entityClass);
    if (!metadata) {
      throw new Error(
        `Entity ${entityClass.name} is not decorated with @Entity`
      );
    }
    this.collectionName = metadata;

    // Check for soft delete
    this.softDeleteField = Reflect.getMetadata(
      'entity:softDelete',
      entityClass
    );
  }

  /**
   * Create a new query builder for this repository.
   *
   * @returns MongoDB query builder
   */
  query(): MongoDBQueryBuilder<T> {
    return new MongoDBQueryBuilder<T>(this.adapter, this.collectionName);
  }

  /**
   * Find documents matching the given filter.
   *
   * @param options - Find options
   * @returns Array of documents
   *
   * @example
   * ```typescript
   * const users = await repo.find({
   *   where: { age: { $gt: 18 } },
   *   sort: { name: 1 },
   *   limit: 10
   * });
   * ```
   */
  async find(options?: MongoDBFindOptions): Promise<T[]> {
    const query = this.query();

    // Build filter
    const filter: Filter<Document> = options?.where || {};

    // Add soft delete filter
    if (this.softDeleteField && !options?.withTrashed && !options?.onlyTrashed) {
      filter[this.softDeleteField] = null;
    } else if (this.softDeleteField && options?.onlyTrashed) {
      filter[this.softDeleteField] = { $ne: null };
    }

    query.where(filter);

    // Add sort
    if (options?.sort) {
      query.sort(options.sort);
    }

    // Add limit/skip
    if (options?.limit) {
      query.limit(options.limit);
    }
    if (options?.skip) {
      query.skip(options.skip);
    }

    // Add select
    if (options?.select) {
      query.select(options.select);
    }

    return query.all();
  }

  /**
   * Find a single document by ID.
   *
   * @param id - Document ID
   * @returns Document or null
   *
   * @example
   * ```typescript
   * const user = await repo.findById('507f1f77bcf86cd799439011');
   * ```
   */
  async findById(id: string | ObjectId): Promise<T | null> {
    return this.findOne({ _id: id } as Filter<T>);
  }

  /**
   * Find a single document matching the filter.
   *
   * @param filter - Filter condition
   * @returns Document or null
   *
   * @example
   * ```typescript
   * const user = await repo.findOne({ email: 'john@example.com' });
   * ```
   */
  async findOne(filter: Filter<T>): Promise<T | null> {
    // Add soft delete filter
    if (this.softDeleteField) {
      filter = {
        ...filter,
        [this.softDeleteField]: null,
      } as Filter<T>;
    }

    return this.query().where(filter).first();
  }

  /**
   * Count documents matching the filter.
   *
   * @param filter - Filter condition
   * @returns Number of matching documents
   *
   * @example
   * ```typescript
   * const count = await repo.count({ age: { $gt: 18 } });
   * ```
   */
  async count(filter?: Filter<T>): Promise<number> {
    const finalFilter: Filter<T> = filter || ({} as Filter<T>);

    // Add soft delete filter
    if (this.softDeleteField) {
      finalFilter[this.softDeleteField as keyof T] = null as any;
    }

    const result = await this.query().where(finalFilter).count().execute();
    return result.rows[0]?.count || 0;
  }

  /**
   * Insert a new document.
   *
   * @param data - Document data
   * @returns Inserted document
   *
   * @example
   * ```typescript
   * const user = await repo.create({
   *   name: 'John Doe',
   *   email: 'john@example.com'
   * });
   * ```
   */
  async create(data: Partial<T>): Promise<T> {
    const result = await this.query().insertOne(data as T).execute();
    return result.rows[0]!;
  }

  /**
   * Insert multiple documents.
   *
   * @param data - Array of document data
   * @returns Array of inserted documents
   *
   * @example
   * ```typescript
   * const users = await repo.createMany([
   *   { name: 'John', email: 'john@example.com' },
   *   { name: 'Jane', email: 'jane@example.com' }
   * ]);
   * ```
   */
  async createMany(data: Partial<T>[]): Promise<T[]> {
    const result = await this.query().insert(data as T[]).execute();
    return result.rows;
  }

  /**
   * Update a document by ID.
   *
   * @param id - Document ID
   * @param update - Update operations
   * @returns Updated document count
   *
   * @example
   * ```typescript
   * await repo.update('507f1f77bcf86cd799439011', {
   *   $set: { name: 'Jane Doe' }
   * });
   * ```
   */
  async update(
    id: string | ObjectId,
    update: UpdateFilter<T>
  ): Promise<number> {
    const filter = { _id: id } as Filter<T>;

    const result = await this.query()
      .where(filter)
      .update(update)
      .execute();

    return result.affectedRows || 0;
  }

  /**
   * Update many documents matching the filter.
   *
   * @param filter - Filter condition
   * @param update - Update operations
   * @returns Updated document count
   *
   * @example
   * ```typescript
   * await repo.updateMany(
   *   { age: { $lt: 18 } },
   *   { $set: { status: 'minor' } }
   * );
   * ```
   */
  async updateMany(
    filter: Filter<T>,
    update: UpdateFilter<T>
  ): Promise<number> {
    const result = await this.query()
      .where(filter)
      .update(update)
      .execute();

    return result.affectedRows || 0;
  }

  /**
   * Delete a document by ID.
   *
   * @param id - Document ID
   * @returns Deleted document count
   *
   * @example
   * ```typescript
   * await repo.delete('507f1f77bcf86cd799439011');
   * ```
   */
  async delete(id: string | ObjectId): Promise<number> {
    // Soft delete if enabled
    if (this.softDeleteField) {
      return this.softDelete(id);
    }

    const filter = { _id: id } as Filter<T>;
    const result = await this.query().where(filter).delete().execute();
    return result.affectedRows || 0;
  }

  /**
   * Delete many documents matching the filter.
   *
   * @param filter - Filter condition
   * @returns Deleted document count
   *
   * @example
   * ```typescript
   * await repo.deleteMany({ status: 'inactive' });
   * ```
   */
  async deleteMany(filter: Filter<T>): Promise<number> {
    // Soft delete if enabled
    if (this.softDeleteField) {
      return this.softDeleteMany(filter);
    }

    const result = await this.query().where(filter).delete().execute();
    return result.affectedRows || 0;
  }

  /**
   * Soft delete a document by ID.
   *
   * @param id - Document ID
   * @returns Updated document count
   */
  async softDelete(id: string | ObjectId): Promise<number> {
    if (!this.softDeleteField) {
      throw new Error('Soft delete is not enabled for this entity');
    }

    return this.update(id, {
      $set: { [this.softDeleteField]: new Date() },
    } as UpdateFilter<T>);
  }

  /**
   * Soft delete many documents.
   *
   * @param filter - Filter condition
   * @returns Updated document count
   */
  async softDeleteMany(filter: Filter<T>): Promise<number> {
    if (!this.softDeleteField) {
      throw new Error('Soft delete is not enabled for this entity');
    }

    return this.updateMany(filter, {
      $set: { [this.softDeleteField]: new Date() },
    } as UpdateFilter<T>);
  }

  /**
   * Restore a soft-deleted document.
   *
   * @param id - Document ID
   * @returns Updated document count
   */
  async restore(id: string | ObjectId): Promise<number> {
    if (!this.softDeleteField) {
      throw new Error('Soft delete is not enabled for this entity');
    }

    return this.update(id, {
      $set: { [this.softDeleteField]: null },
    } as UpdateFilter<T>);
  }

  /**
   * Permanently delete a document (even if soft delete is enabled).
   *
   * @param id - Document ID
   * @returns Deleted document count
   */
  async forceDelete(id: string | ObjectId): Promise<number> {
    const filter = { _id: id } as Filter<T>;
    const result = await this.query().where(filter).delete().execute();
    return result.affectedRows || 0;
  }

  /**
   * Check if a document exists.
   *
   * @param filter - Filter condition
   * @returns True if document exists
   *
   * @example
   * ```typescript
   * const exists = await repo.exists({ email: 'john@example.com' });
   * ```
   */
  async exists(filter: Filter<T>): Promise<boolean> {
    const count = await this.count(filter);
    return count > 0;
  }

  /**
   * Get the collection name.
   *
   * @returns Collection name
   */
  getCollectionName(): string {
    return this.collectionName;
  }

  /**
   * Get the entity class.
   *
   * @returns Entity class constructor
   */
  getEntityClass(): new () => T {
    return this.entityClass;
  }
}

