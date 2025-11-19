/**
 * Query Methods
 *
 * Additional query helper methods for repositories.
 *
 * @module repository/query-methods
 */

import type { BaseRepository } from './base-repository.js';

/**
 * Mixin providing additional query methods.
 */
export class QueryMethods {
  /**
   * Find first entity or throw error if not found.
   */
  static async findFirstOrFail<T>(
    repository: BaseRepository<T>,
    criteria?: Partial<T>
  ): Promise<T> {
    const result = await repository.findOneBy(criteria || {});
    if (!result) {
      throw new Error('Entity not found');
    }
    return result;
  }

  /**
   * Find by ID or throw error if not found.
   */
  static async findByIdOrFail<T>(
    repository: BaseRepository<T>,
    id: unknown
  ): Promise<T> {
    const result = await repository.findById(id);
    if (!result) {
      throw new Error(`Entity with ID ${id} not found`);
    }
    return result;
  }

  /**
   * Find or create an entity.
   */
  static async findOrCreate<T>(
    repository: BaseRepository<T>,
    criteria: Partial<T>,
    defaults?: Partial<T>
  ): Promise<{ entity: T; created: boolean }> {
    let entity = await repository.findOneBy(criteria);
    
    if (entity) {
      return { entity, created: false };
    }

    entity = await repository.create({ ...criteria, ...defaults });
    return { entity, created: true };
  }

  /**
   * Update or create an entity.
   */
  static async updateOrCreate<T>(
    repository: BaseRepository<T>,
    criteria: Partial<T>,
    updates: Partial<T>
  ): Promise<{ entity: T; created: boolean }> {
    let entity = await repository.findOneBy(criteria);
    
    if (entity) {
      const pkColumn = (repository as { getPrimaryKeyColumn(): string }).getPrimaryKeyColumn();
      const id = (entity as Record<string, unknown>)[pkColumn];
      entity = await repository.update(id, updates);
      return { entity, created: false };
    }

    entity = await repository.create({ ...criteria, ...updates });
    return { entity, created: true };
  }
}

