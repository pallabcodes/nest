/**
 * Connection Pool Module
 *
 * Provides connection pooling for efficient database resource management.
 *
 * @module pool
 */

// Export pool interface and types
export type {
  ConnectionPool,
  PoolConfig,
  PoolStats,
  PoolHealth,
} from './pool-interface.js';

// Export pool implementations
export { PostgresConnectionPool } from './postgres-pool.js';
export { MySQLConnectionPool } from './mysql-pool.js';
export { SQLiteConnectionPool } from './sqlite-pool.js';
export { SqlServerConnectionPool } from './sqlserver-pool.js';

// Export pool manager
export { PoolManager } from './pool-manager.js';
export type {
  PoolManagerConfig,
  AggregatedPoolMetrics,
} from './pool-manager.js';

