/**
 * NeatOrm - Migrations Module
 *
 * Database migration system for managing schema changes over time.
 * Provides version control for database schemas with up/down migrations.
 *
 * Exported Components:
 * - MigrationRunner: Executes and tracks migrations
 * - TableBuilder: Schema builder for migrations
 * - Migration types: Context, definitions, records
 *
 * Key Features:
 * - Type-safe migration definitions
 * - Transaction-wrapped migrations
 * - Rollback support
 * - Migration history tracking
 * - Schema builder API
 *
 * Pain Points Solved:
 * ✅ Manual migration management
 * ✅ Migration ordering issues
 * ✅ No rollback support
 * ✅ Type safety in migrations
 * ✅ Migration conflicts in teams
 */

// Export Migration System
export * from './migration.js';
export {
  MigrationRunner,
  TableBuilder,
  migration,
  type MigrationDirection,
  type MigrationContext,
  type ColumnDefinition,
  type Migration,
  type MigrationRecord,
  type MigrationStatus,
  type MigrationRunnerOptions,
} from './migration.js';

