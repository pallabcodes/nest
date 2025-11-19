/**
 * Multi-Database Module
 *
 * Provides support for multiple databases, read replicas, and connection management.
 *
 * @module multi-database
 */

export * from './connection-manager.js';
export * from './read-replica-manager.js';

export {
  ConnectionManager,
} from './connection-manager.js';

export type {
  ConnectionName,
  NamedConnectionConfig,
  ConnectionState,
} from './connection-manager.js';

export {
  ReadReplicaManager,
} from './read-replica-manager.js';

export type {
  LoadBalancingStrategy,
  ReadReplicaConfig,
  ReplicaHealth,
} from './read-replica-manager.js';

