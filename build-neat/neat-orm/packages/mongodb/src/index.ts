/**
 * @neat-orm/mongodb
 *
 * Production-grade MongoDB support for NeatORM.
 * Type-safe queries, advanced features, and enterprise reliability.
 *
 * @module mongodb
 */

// Adapter
export {
  MongoDBAdapter,
  MongoDBConfig,
  MongoDBTransaction,
  MongoDBConnection,
  createMongoAdapter,
  ObjectId,
} from './adapter/index.js';

// Query Builder
export {
  MongoDBQueryBuilder,
  MongoDBQueryOptions,
  PipelineStage,
  createMongoQuery,
} from './query-builder/index.js';

// Repository
export {
  MongoDBRepository,
  MongoDBFindOptions,
} from './repository/index.js';

// Schema Decorators
export {
  MongoDBColumnType,
  MongoDBIndexType,
  MongoDBIndexOptions,
  MongoDBIndex,
  MongoDBCompoundIndex,
  MongoDBTextIndex,
  MongoDBGeospatialIndex,
  MongoDBTTLIndex,
  getMongoDBIndexes,
} from './schema/index.js';

// Transaction
export { withTransaction, transactional } from './transaction/index.js';

// Seeding
export {
  MongoDBSeeder,
  MongoDBFactory,
  createMongoFactory,
  MongoDBSeederRunner,
} from './seeding/index.js';

// Caching
export {
  CachedQueryOptions,
  CachedMongoDBAdapter,
  createMongoCacheKey,
} from './cache/index.js';

