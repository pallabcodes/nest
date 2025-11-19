/**
 * Read Replica Manager
 *
 * Manages read replicas for horizontal read scaling and load balancing.
 * Supports multiple load balancing strategies and automatic failover.
 *
 * @module multi-database/read-replica-manager
 */

import type { DatabaseAdapter } from '../adapters/base-adapter.js';
import type { ConnectionManager } from './connection-manager.js';

// Node.js timer globals
declare const setInterval: (callback: () => void, delay: number) => any;
declare const clearInterval: (id: any) => void;

/**
 * Load balancing strategy.
 */
export type LoadBalancingStrategy = 
  | 'round-robin'     // Distribute evenly across replicas
  | 'random'          // Random selection
  | 'least-connections' // Choose replica with fewest active connections
  | 'weighted'        // Weighted distribution based on replica weights
  | 'latency-based';  // Choose replica with lowest latency

/**
 * Read replica configuration.
 */
export interface ReadReplicaConfig {
  /**
   * Primary (write) connection name.
   */
  primary: string;

  /**
   * Replica (read-only) connection names.
   */
  replicas: string[];

  /**
   * Load balancing strategy.
   * Default: 'round-robin'
   */
  strategy?: LoadBalancingStrategy;

  /**
   * Weights for weighted strategy.
   * Higher weight means more queries.
   */
  weights?: Record<string, number>;

  /**
   * Whether to fallback to primary if all replicas fail.
   * Default: true
   */
  fallbackToPrimary?: boolean;

  /**
   * Health check interval in milliseconds.
   * Default: 30000 (30 seconds)
   */
  healthCheckInterval?: number;

  /**
   * Maximum retry attempts for failed queries.
   * Default: 3
   */
  maxRetries?: number;

  /**
   * Whether to enable automatic failover.
   * Default: true
   */
  autoFailover?: boolean;
}

/**
 * Replica health status.
 */
export interface ReplicaHealth {
  /**
   * Replica connection name.
   */
  name: string;

  /**
   * Health status.
   */
  healthy: boolean;

  /**
   * Last health check time.
   */
  lastCheck: Date;

  /**
   * Average latency in milliseconds.
   */
  averageLatency: number;

  /**
   * Failed health checks count.
   */
  failedChecks: number;

  /**
   * Active connections count.
   */
  activeConnections: number;
}

/**
 * Read replica manager for load balancing read queries.
 */
export class ReadReplicaManager {
  private config: Required<ReadReplicaConfig>;
  private replicaHealth: Map<string, ReplicaHealth> = new Map();
  private currentIndex: number = 0;
  private healthCheckIntervalId?: ReturnType<typeof setInterval>;

  constructor(
    private connectionManager: ConnectionManager,
    config: ReadReplicaConfig
  ) {
    this.config = {
      primary: config.primary,
      replicas: config.replicas,
      strategy: config.strategy || 'round-robin',
      weights: config.weights || {},
      fallbackToPrimary: config.fallbackToPrimary ?? true,
      healthCheckInterval: config.healthCheckInterval || 30000,
      maxRetries: config.maxRetries || 3,
      autoFailover: config.autoFailover ?? true,
    };

    // Initialize replica health
    for (const replica of this.config.replicas) {
      this.replicaHealth.set(replica, {
        name: replica,
        healthy: true,
        lastCheck: new Date(),
        averageLatency: 0,
        failedChecks: 0,
        activeConnections: 0,
      });
    }
  }

  /**
   * Start health checks.
   */
  start(): void {
    this.healthCheckIntervalId = setInterval(() => {
      this.performHealthChecks();
    }, this.config.healthCheckInterval);

    // Initial health check
    this.performHealthChecks();
  }

  /**
   * Stop health checks.
   */
  stop(): void {
    if (this.healthCheckIntervalId) {
      clearInterval(this.healthCheckIntervalId);
      this.healthCheckIntervalId = undefined;
    }
  }

  /**
   * Get read connection (replica).
   */
  getReadConnection(): DatabaseAdapter {
    const healthyReplicas = this.getHealthyReplicas();

    if (healthyReplicas.length === 0) {
      if (this.config.fallbackToPrimary) {
        return this.connectionManager.getConnection(this.config.primary);
      }
      throw new Error('No healthy read replicas available');
    }

    const replicaName = this.selectReplica(healthyReplicas);
    return this.connectionManager.getConnection(replicaName);
  }

  /**
   * Get write connection (primary).
   */
  getWriteConnection(): DatabaseAdapter {
    return this.connectionManager.getConnection(this.config.primary);
  }

  /**
   * Execute read query with automatic retry and failover.
   */
  async executeRead<T = unknown>(
    queryFn: (adapter: DatabaseAdapter) => Promise<T>
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        const adapter = this.getReadConnection();
        const replicaName = this.getReplicaName();

        // Update active connections
        if (replicaName) {
          const health = this.replicaHealth.get(replicaName);
          if (health) {
            health.activeConnections++;
          }
        }

        try {
          const result = await queryFn(adapter);
          return result;
        } finally {
          // Decrease active connections
          if (replicaName) {
            const health = this.replicaHealth.get(replicaName);
            if (health) {
              health.activeConnections--;
            }
          }
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Mark replica as unhealthy if error is connection-related
        if (this.isConnectionError(error)) {
          const replicaName = this.getCurrentReplicaName();
          if (replicaName) {
            this.markUnhealthy(replicaName);
          }
        }

        // Don't retry if not autoFailover
        if (!this.config.autoFailover) {
          throw error;
        }
      }
    }

    throw lastError || new Error('Read query failed after all retries');
  }

  /**
   * Execute write query on primary.
   */
  async executeWrite<T = unknown>(
    queryFn: (adapter: DatabaseAdapter) => Promise<T>
  ): Promise<T> {
    const adapter = this.getWriteConnection();
    return queryFn(adapter);
  }

  /**
   * Get healthy replicas.
   */
  private getHealthyReplicas(): string[] {
    return Array.from(this.replicaHealth.entries())
      .filter(([_, health]) => health.healthy)
      .map(([name]) => name);
  }

  /**
   * Select replica based on strategy.
   *
   * @private
   */
  private selectReplica(healthyReplicas: string[]): string {
    switch (this.config.strategy) {
      case 'round-robin':
        return this.roundRobin(healthyReplicas);

      case 'random':
        return this.random(healthyReplicas);

      case 'least-connections':
        return this.leastConnections(healthyReplicas);

      case 'weighted':
        return this.weighted(healthyReplicas);

      case 'latency-based':
        return this.latencyBased(healthyReplicas);

      default:
        return this.roundRobin(healthyReplicas);
    }
  }

  /**
   * Round-robin selection.
   *
   * @private
   */
  private roundRobin(replicas: string[]): string {
    const replica = replicas[this.currentIndex % replicas.length]!;
    this.currentIndex++;
    return replica;
  }

  /**
   * Random selection.
   *
   * @private
   */
  private random(replicas: string[]): string {
    const index = Math.floor(Math.random() * replicas.length);
    return replicas[index]!;
  }

  /**
   * Least connections selection.
   *
   * @private
   */
  private leastConnections(replicas: string[]): string {
    let minConnections = Infinity;
    let selectedReplica = replicas[0]!;

    for (const replica of replicas) {
      const health = this.replicaHealth.get(replica);
      if (health && health.activeConnections < minConnections) {
        minConnections = health.activeConnections;
        selectedReplica = replica;
      }
    }

    return selectedReplica;
  }

  /**
   * Weighted selection.
   *
   * @private
   */
  private weighted(replicas: string[]): string {
    const weights = replicas.map(r => this.config.weights[r] || 1);
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < replicas.length; i++) {
      random -= weights[i]!;
      if (random <= 0) {
        return replicas[i]!;
      }
    }

    return replicas[replicas.length - 1]!;
  }

  /**
   * Latency-based selection.
   *
   * @private
   */
  private latencyBased(replicas: string[]): string {
    let minLatency = Infinity;
    let selectedReplica = replicas[0]!;

    for (const replica of replicas) {
      const health = this.replicaHealth.get(replica);
      if (health && health.averageLatency < minLatency) {
        minLatency = health.averageLatency;
        selectedReplica = replica;
      }
    }

    return selectedReplica;
  }

  /**
   * Perform health checks on all replicas.
   *
   * @private
   */
  private async performHealthChecks(): Promise<void> {
    const promises = this.config.replicas.map(replica =>
      this.checkReplicaHealth(replica)
    );

    await Promise.allSettled(promises);
  }

  /**
   * Check health of a single replica.
   *
   * @private
   */
  private async checkReplicaHealth(replicaName: string): Promise<void> {
    const health = this.replicaHealth.get(replicaName);
    if (!health) return;

    try {
      const startTime = Date.now();
      const adapter = this.connectionManager.getConnection(replicaName);
      
      // Simple health check query
      await adapter.execute('SELECT 1');
      
      const latency = Date.now() - startTime;

      // Update health
      health.healthy = true;
      health.lastCheck = new Date();
      health.averageLatency = (health.averageLatency * 0.8) + (latency * 0.2); // EMA
      health.failedChecks = 0;
    } catch (error) {
      health.failedChecks++;
      health.lastCheck = new Date();

      // Mark unhealthy after 3 consecutive failures
      if (health.failedChecks >= 3) {
        health.healthy = false;
      }
    }
  }

  /**
   * Mark replica as unhealthy.
   *
   * @private
   */
  private markUnhealthy(replicaName: string): void {
    const health = this.replicaHealth.get(replicaName);
    if (health) {
      health.healthy = false;
      health.failedChecks++;
    }
  }

  /**
   * Check if error is connection-related.
   *
   * @private
   */
  private isConnectionError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;

    const connectionErrors = [
      'ECONNREFUSED',
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'connection',
      'timeout',
    ];

    const message = error.message.toLowerCase();
    return connectionErrors.some(keyword => message.includes(keyword));
  }

  /**
   * Get replica name from adapter.
   *
   * @private
   */
  private getReplicaName(): string | undefined {
    // This would need to be implemented based on adapter structure
    return undefined;
  }

  /**
   * Get current replica name.
   *
   * @private
   */
  private getCurrentReplicaName(): string | undefined {
    return this.config.replicas[this.currentIndex % this.config.replicas.length];
  }

  /**
   * Get replica health status.
   */
  getReplicaHealth(replicaName?: string): ReplicaHealth | ReplicaHealth[] {
    if (replicaName) {
      const health = this.replicaHealth.get(replicaName);
      if (!health) {
        throw new Error(`Replica '${replicaName}' not found`);
      }
      return health;
    }

    return Array.from(this.replicaHealth.values());
  }

  /**
   * Get load balancing statistics.
   */
  getStatistics(): {
    totalReplicas: number;
    healthyReplicas: number;
    unhealthyReplicas: number;
    averageLatency: number;
    totalActiveConnections: number;
  } {
    const replicas = Array.from(this.replicaHealth.values());
    const healthy = replicas.filter(r => r.healthy).length;
    const totalLatency = replicas.reduce((sum, r) => sum + r.averageLatency, 0);
    const totalConnections = replicas.reduce((sum, r) => sum + r.activeConnections, 0);

    return {
      totalReplicas: replicas.length,
      healthyReplicas: healthy,
      unhealthyReplicas: replicas.length - healthy,
      averageLatency: replicas.length > 0 ? totalLatency / replicas.length : 0,
      totalActiveConnections: totalConnections,
    };
  }
}

