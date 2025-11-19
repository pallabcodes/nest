/**
 * Repository Module
 *
 * Provides repository pattern implementation for data access.
 *
 * @module repository
 */

// Export base repository
export { BaseRepository } from './base-repository.js';
export type {
  FindOptions,
  WhereExpression,
  WhereCondition,
  OrderByExpression,
} from './base-repository.js';

// Export query methods
export { QueryMethods } from './query-methods.js';

// Export entity manager
export { EntityManager } from './entity-manager.js';

// Export repository decorator
export { Repository } from '../decorators/repository.decorator.js';
export type {
  RepositoryOptions,
  RepositoryMetadata,
} from '../decorators/repository.decorator.js';

