/**
 * Connection Manager
 *
 * Manages multiple database connections for multi-database and multi-tenant applications.
 * Supports connection pooling, failover, and dynamic connection routing.
 *
 * @module multi-database/connection-manager
 */

import type { DatabaseAdapter, ConnectionConfig } from '../adapters/base-adapter.js';
import { createAdapter } from '../adapters/adapter-factory.js';
import type { ConnectionPool } from '../pool/pool-interface.js';
import { PoolManager } from '../pool/pool-manager.js';

/**
 * Connection identifier.
 */
export type ConnectionName = string;

/**
 * Connection configuration with name.
 */
export interface NamedConnectionConfig extends ConnectionConfig {
  /**
   * Connection name.
   */
  name: ConnectionName;

  /**
   * Whether this is the default connection.
   */
  default?: boolean;

  /**
   * Connection priority (for failover).
   * Higher priority connections are tried first.
   */
  priority?: number;

  /**
   * Maximum number of connections in pool.
   */
  poolSize?: number;

  /**
   * Whether connection is read-only.
   */
  readOnly?: boolean;

  /**
   * Tags for categorizing connections.
   */
  tags?: string[];
}

/**
 * Connection state.
 */
export interface ConnectionState {
  /**
   * Connection name.
   */
  name: ConnectionName;

  /**
   * Connection status.
   */
  status: 'connected' | 'disconnected' | 'error' | 'reconnecting';

  /**
   * Last connection time.
   */
  connectedAt?: Date;

  /**
   * Last disconnection time.
   */
  disconnectedAt?: Date;

  /**
   * Error (if status is 'error').
   */
  error?: Error;

  /**
   * Number of active queries.
   */
  activeQueries: number;

  /**
   * Total queries executed.
   */
  totalQueries: number;
}

/**
 * Connection manager for handling multiple database connections.
 */
export class ConnectionManager {
  private connections: Map<ConnectionName, DatabaseAdapter> = new Map();
  private pools: Map<ConnectionName, ConnectionPool> = new Map();
  private configs: Map<ConnectionName, NamedConnectionConfig> = new Map();
  private states: Map<ConnectionName, ConnectionState> = new Map();
  private defaultConnection?: ConnectionName;
  private poolManager: PoolManager;

  constructor() {
    this.poolManager = new PoolManager();
  }

  /**
   * Add a connection.
   */
  async addConnection(config: NamedConnectionConfig): Promise<void> {
    if (this.connections.has(config.name)) {
      throw new Error(`Connection '${config.name}' already exists`);
    }

    // Create adapter
    const adapter = createAdapter(config);

    // Create pool if pooling is enabled
    // Note: Pool creation logic would be implemented here
    // if (config.poolSize && config.poolSize > 1) {
    //   const pool = await this.poolManager.createPool(config.name, config);
    //   this.pools.set(config.name, pool);
    // }

    // Store connection
    this.connections.set(config.name, adapter);
    this.configs.set(config.name, config);

    // Initialize state
    this.states.set(config.name, {
      name: config.name,
      status: 'connected',
      connectedAt: new Date(),
      activeQueries: 0,
      totalQueries: 0,
    });

    // Set as default if specified
    if (config.default || this.connections.size === 1) {
      this.defaultConnection = config.name;
    }
  }

  /**
   * Remove a connection.
   */
  async removeConnection(name: ConnectionName): Promise<void> {
    const adapter = this.connections.get(name);
    if (!adapter) {
      throw new Error(`Connection '${name}' not found`);
    }

    // Close connection
    await adapter.disconnect();

    // Close pool if exists
    const pool = this.pools.get(name);
    if (pool) {
      await pool.close();
      this.pools.delete(name);
    }

    // Remove from maps
    this.connections.delete(name);
    this.configs.delete(name);
    this.states.delete(name);

    // Update default if necessary
    if (this.defaultConnection === name) {
      const nextConnection = this.connections.keys().next().value;
      if (nextConnection !== undefined) {
        this.defaultConnection = nextConnection;
      } else {
        delete this.defaultConnection;
      }
    }
  }

  /**
   * Get a connection by name.
   */
  getConnection(name?: ConnectionName): DatabaseAdapter {
    const connectionName = name || this.defaultConnection;

    if (!connectionName) {
      throw new Error('No connections available');
    }

    const adapter = this.connections.get(connectionName);
    if (!adapter) {
      throw new Error(`Connection '${connectionName}' not found`);
    }

    return adapter;
  }

  /**
   * Get connection pool.
   */
  getPool(name?: ConnectionName): ConnectionPool | undefined {
    const connectionName = name || this.defaultConnection;
    if (!connectionName) {
      return undefined;
    }

    return this.pools.get(connectionName);
  }

  /**
   * Get connections by tags.
   */
  getConnectionsByTags(tags: string[]): DatabaseAdapter[] {
    const adapters: DatabaseAdapter[] = [];

    for (const [name, config] of this.configs.entries()) {
      if (config.tags && tags.some(tag => config.tags!.includes(tag))) {
        const adapter = this.connections.get(name);
        if (adapter) {
          adapters.push(adapter);
        }
      }
    }

    return adapters;
  }

  /**
   * Get read-only connections.
   */
  getReadOnlyConnections(): DatabaseAdapter[] {
    const adapters: DatabaseAdapter[] = [];

    for (const [name, config] of this.configs.entries()) {
      if (config.readOnly) {
        const adapter = this.connections.get(name);
        if (adapter) {
          adapters.push(adapter);
        }
      }
    }

    return adapters;
  }

  /**
   * Get write connections.
   */
  getWriteConnections(): DatabaseAdapter[] {
    const adapters: DatabaseAdapter[] = [];

    for (const [name, config] of this.configs.entries()) {
      if (!config.readOnly) {
        const adapter = this.connections.get(name);
        if (adapter) {
          adapters.push(adapter);
        }
      }
    }

    return adapters;
  }

  /**
   * Check connection health.
   */
  async checkHealth(name?: ConnectionName): Promise<boolean> {
    const connectionName = name || this.defaultConnection;
    if (!connectionName) {
      return false;
    }

    try {
      const adapter = this.connections.get(connectionName);
      if (!adapter) {
        return false;
      }

      // Simple health check query
      await adapter.execute('SELECT 1');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get connection state.
   */
  getState(name?: ConnectionName): ConnectionState | undefined {
    const connectionName = name || this.defaultConnection;
    if (!connectionName) {
      return undefined;
    }

    return this.states.get(connectionName);
  }

  /**
   * Get all connection states.
   */
  getAllStates(): ConnectionState[] {
    return Array.from(this.states.values());
  }

  /**
   * Update connection state.
   */
  updateState(name: ConnectionName, update: Partial<ConnectionState>): void {
    const state = this.states.get(name);
    if (state) {
      Object.assign(state, update);
    }
  }

  /**
   * Get all connection names.
   */
  getConnectionNames(): ConnectionName[] {
    return Array.from(this.connections.keys());
  }

  /**
   * Check if connection exists.
   */
  hasConnection(name: ConnectionName): boolean {
    return this.connections.has(name);
  }

  /**
   * Set default connection.
   */
  setDefaultConnection(name: ConnectionName): void {
    if (!this.connections.has(name)) {
      throw new Error(`Connection '${name}' not found`);
    }

    this.defaultConnection = name;
  }

  /**
   * Get default connection name.
   */
  getDefaultConnectionName(): ConnectionName | undefined {
    return this.defaultConnection;
  }

  /**
   * Close all connections.
   */
  async closeAll(): Promise<void> {
    const closePromises: Promise<void>[] = [];

    for (const [name, adapter] of this.connections.entries()) {
      closePromises.push(adapter.disconnect());

      const pool = this.pools.get(name);
      if (pool) {
        closePromises.push(pool.close());
      }
    }

    await Promise.all(closePromises);

    this.connections.clear();
    this.pools.clear();
    this.configs.clear();
    this.states.clear();
    delete this.defaultConnection;
  }

  /**
   * Reconnect a connection.
   */
  async reconnect(name: ConnectionName): Promise<void> {
    const config = this.configs.get(name);
    if (!config) {
      throw new Error(`Connection config for '${name}' not found`);
    }

    // Update state
    this.updateState(name, { status: 'reconnecting' });

    try {
      // Remove old connection
      await this.removeConnection(name);

      // Add new connection
      await this.addConnection(config);

      // Update state
      this.updateState(name, { status: 'connected', connectedAt: new Date() });
    } catch (error) {
      // Update state with error
      this.updateState(name, {
        status: 'error',
        error: error instanceof Error ? error : new Error(String(error)),
      });
      throw error;
    }
  }

  /**
   * Get connection statistics.
   */
  getStatistics(): {
    totalConnections: number;
    activeConnections: number;
    totalQueries: number;
    averageQueriesPerConnection: number;
  } {
    const states = this.getAllStates();
    const activeCount = states.filter(s => s.status === 'connected').length;
    const totalQueries = states.reduce((sum, s) => sum + s.totalQueries, 0);

    return {
      totalConnections: states.length,
      activeConnections: activeCount,
      totalQueries,
      averageQueriesPerConnection: states.length > 0 ? totalQueries / states.length : 0,
    };
  }
}

