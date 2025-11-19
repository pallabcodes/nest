/**
 * Database Adapters Module
 *
 * Provides database adapter implementations and factory functions
 * for creating adapters based on configuration.
 *
 * @module adapters
 */

// Export base adapter types and interfaces
export type {
  DatabaseAdapter,
  ConnectionConfig,
  QueryResult,
  Transaction,
  TransactionOptions,
  DatabaseConnection,
  DatabaseRow,
  FieldInfo,
  IsolationLevel,
} from './base-adapter.js';

export { BaseAdapter } from './base-adapter.js';

// Export specific adapter implementations
export { PostgresAdapter } from './postgres-adapter.js';
export { MySQLAdapter } from './mysql-adapter.js';
export { SQLiteAdapter } from './sqlite-adapter.js';
export { SqlServerAdapter } from './sqlserver-adapter.js';

// Export factory functions
export {
  createAdapter,
  parseConnectionString,
  createAdapterFromConnectionString,
  validateConnectionConfig,
  getDefaultPort,
} from './adapter-factory.js';

