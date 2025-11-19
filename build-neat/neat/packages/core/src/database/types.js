/**
 * Neat Framework - Database Types
 *
 * This module defines the core types for database integration in Neat Framework.
 * It provides type-safe abstractions for entities, relationships, queries,
 * and database operations with god-moded TypeScript excellence.
 *
 * Key TypeScript Excellence Features:
 * - Branded types for database identifiers and table names
 * - Generic entity types with proper variance
 * - Type-safe relationship mapping
 * - Conditional types for query building
 * - Template literal types for SQL generation
 *
 * Database Support: PostgreSQL, MySQL, SQLite with unified API
 * ORM Features: Entities, relationships, migrations, queries
 *
 * Pain Points Addressed: Eliminates manual SQL writing, provides
 * compile-time query validation, and enables type-safe data access.
 *
 * Research: Inspired by TypeORM and Prisma but with stronger typing
 * and better integration with dependency injection.
 */
// Branding functions
export const brandTableName = (value) => value;
export const brandColumnName = (value) => value;
export const brandDatabaseUrl = (value) => value;
export const brandMigrationId = (value) => value;
export const brandTransactionId = (value) => value;
// ========================================
// BASE ENTITY
// ========================================
/**
 * Base entity class that all entities should extend.
 */
// Base entity class that entities can extend
export class BaseEntity {
}
//# sourceMappingURL=types.js.map