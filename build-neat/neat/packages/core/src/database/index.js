/**
 * Neat Framework - Database Integration Barrel Export
 *
 * This module provides a unified interface to all database functionality,
 * including connections, entities, repositories, queries, and migrations.
 *
 * Key components:
 * - Database connections and drivers
 * - Entity system with decorators
 * - Repository pattern implementation
 * - Query builders and migrations
 * - Type-safe database operations
 *
 * Database Support: PostgreSQL, MySQL, SQLite with unified API
 * Features: ORM, relationships, transactions, migrations
 *
 * Pain Points Addressed: Type-safe database access, automatic schema
 * management, compile-time query validation, and zero-boilerplate data operations.
 */
// Export entity decorators
export { Entity, Column, PrimaryKey, PrimaryGeneratedColumn, PrimaryGeneratedUuidColumn, CreateDateColumn, UpdateDateColumn, VersionColumn, OneToOne, OneToMany, ManyToOne, ManyToMany, JoinColumn, JoinTable, Index, Unique } from './decorators.js';
// Export database metadata extraction
export { extractEntityMetadata } from './decorators.js';
// Export connection management
export { createDatabaseConnection, createDatabaseConnectionWithDriver, NeatDatabaseConnection } from './connection.js';
// Export drivers
export { SqliteDriver, PostgreSqlDriver, MySqlDriver } from './connection.js';
// Export additional drivers
export { PrismaDriver } from './drivers/prisma-driver.js';
export { RawSQLDriver } from './drivers/raw-sql-driver.js';
export { MongooseDriver } from './drivers/mongoose-driver.js';
// Export auto-discovery modules
export { NeatTypeORMModule, InjectRepository, registerEntity } from './modules/neat-typeorm.module.js';
export { NeatMongooseModule, Schema, Prop, InjectModel, registerSchema } from './modules/neat-mongoose.module.js';
export { BaseRepository, RepositoryFactory, CustomRepository, createRepositoryFactory, getRepository } from './repository.js';
// Export base entity
export { BaseEntity } from './types.js';
// Export entity manager
export { NeatEntityManager, createEntityManager, EntityManagerRegistry, getEntityManagerRegistry, getEntityManager, registerEntityManager } from './entity-manager.js';
// Re-export branded type functions
export { brandTableName, brandColumnName, brandDatabaseUrl, brandMigrationId, brandTransactionId } from './types.js';
//# sourceMappingURL=index.js.map