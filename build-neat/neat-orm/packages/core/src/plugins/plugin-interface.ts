/**
 * NeatORM Plugin System Interfaces
 *
 * Defines the core interfaces and types for the extensible plugin system.
 * Plugins allow developers to extend NeatORM with custom functionality
 * without modifying the core codebase.
 *
 * @module plugins/plugin-interface
 */

import type { DatabaseAdapter } from '../adapters/base-adapter.js';
import type { QueryResult } from '../adapters/base-adapter.js';

/**
 * Plugin metadata information.
 */
export interface PluginMetadata {
  /**
   * Unique plugin identifier.
   */
  id: string;

  /**
   * Plugin display name.
   */
  name: string;

  /**
   * Plugin version.
   */
  version: string;

  /**
   * Plugin description.
   */
  description?: string;

  /**
   * Plugin author information.
   */
  author?: string;

  /**
   * Plugin homepage URL.
   */
  homepage?: string;

  /**
   * Plugin repository URL.
   */
  repository?: string;

  /**
   * Plugin keywords for discovery.
   */
  keywords?: string[];

  /**
   * Plugin dependencies.
   */
  dependencies?: Record<string, string>;

  /**
   * Minimum NeatORM version required.
   */
  minNeatVersion?: string;

  /**
   * Supported database dialects.
   */
  supportedDialects?: string[];
}

/**
 * Plugin lifecycle hooks.
 */
export interface PluginLifecycle {
  /**
   * Called when the plugin is being initialized.
   * @param context Plugin context with access to ORM internals
   */
  onInit?(context: PluginContext): Promise<void> | void;

  /**
   * Called when the plugin is being destroyed.
   */
  onDestroy?(): Promise<void> | void;

  /**
   * Called when the database adapter connects.
   * @param adapter The database adapter instance
   */
  onAdapterConnect?(adapter: DatabaseAdapter): Promise<void> | void;

  /**
   * Called when the database adapter disconnects.
   * @param adapter The database adapter instance
   */
  onAdapterDisconnect?(adapter: DatabaseAdapter): Promise<void> | void;
}

/**
 * Plugin context providing access to ORM internals.
 */
export interface PluginContext {
  /**
   * The database adapter instance.
   */
  adapter: DatabaseAdapter;

  /**
   * Plugin configuration.
   */
  config: Record<string, unknown>;

  /**
   * Logger instance for plugin logging.
   */
  logger: PluginLogger;

  /**
   * Access to other registered plugins.
   */
  plugins: Map<string, PluginInstance>;

  /**
   * Emit events to other plugins.
   */
  emit(event: string, data?: unknown): void;

  /**
   * Listen for events from other plugins.
   */
  on(event: string, handler: (data?: unknown) => void): void;

  /**
   * Remove event listener.
   */
  off(event: string, handler: (data?: unknown) => void): void;
}

/**
 * Plugin logger interface.
 */
export interface PluginLogger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

/**
 * Base plugin interface that all plugins must implement.
 */
export interface Plugin {
  /**
   * Plugin metadata.
   */
  readonly metadata: PluginMetadata;

  /**
   * Plugin lifecycle methods.
   */
  readonly lifecycle?: PluginLifecycle;
}

/**
 * Plugin instance with runtime context.
 */
export interface PluginInstance extends Plugin {
  /**
   * Runtime context.
   */
  readonly context: PluginContext;

  /**
   * Whether the plugin is currently active.
   */
  readonly isActive: boolean;

  /**
   * Activate the plugin.
   */
  activate(): Promise<void>;

  /**
   * Deactivate the plugin.
   */
  deactivate(): Promise<void>;
}

/**
 * Query builder plugin interface.
 */
export interface QueryBuilderPlugin extends Plugin {
  /**
   * Extend the query builder with custom methods.
   * @param builder The query builder instance to extend
   * @param context Plugin context
   */
  extendQueryBuilder?(builder: any, context: PluginContext): void;

  /**
   * Transform SQL before execution.
   * @param sql Original SQL string
   * @param params Query parameters
   * @param context Plugin context
   * @returns Transformed SQL and parameters
   */
  transformQuery?(
    sql: string,
    params: unknown[],
    context: PluginContext
  ): { sql: string; params: unknown[] };
}

/**
 * Decorator plugin interface.
 */
export interface DecoratorPlugin extends Plugin {
  /**
   * Custom decorators provided by this plugin.
   */
  decorators?: Record<string, PropertyDecorator | MethodDecorator | ClassDecorator>;

  /**
   * Process entity metadata after decorators are applied.
   * @param entityName Entity name
   * @param metadata Entity metadata
   * @param context Plugin context
   */
  processEntityMetadata?(
    entityName: string,
    metadata: Record<string, unknown>,
    context: PluginContext
  ): void;
}

/**
 * Cache provider plugin interface.
 */
export interface CacheProviderPlugin extends Plugin {
  /**
   * Create a cache provider instance.
   * @param config Cache configuration
   * @param context Plugin context
   * @returns Cache provider instance
   */
  createCacheProvider(
    config: Record<string, unknown>,
    context: PluginContext
  ): CacheProvider;
}

/**
 * Cache provider interface for plugins.
 */
export interface CacheProvider {
  /**
   * Get a value from cache.
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Set a value in cache.
   */
  set<T>(key: string, value: T, ttl?: number): Promise<void>;

  /**
   * Delete a value from cache.
   */
  delete(key: string): Promise<boolean>;

  /**
   * Clear all cache entries.
   */
  clear(): Promise<void>;

  /**
   * Get cache statistics.
   */
  getStats?(): Promise<Record<string, unknown>>;
}

/**
 * Middleware plugin interface.
 */
export interface MiddlewarePlugin extends Plugin {
  /**
   * Query execution middleware.
   */
  queryMiddleware?: {
    /**
     * Called before query execution.
     */
    beforeExecute?: (
      sql: string,
      params: unknown[],
      context: PluginContext
    ) => Promise<{ sql: string; params: unknown[] } | void>;

    /**
     * Called after query execution.
     */
    afterExecute?: (
      sql: string,
      params: unknown[],
      result: QueryResult,
      context: PluginContext
    ) => Promise<QueryResult | void>;
  };

  /**
   * Transaction middleware.
   */
  transactionMiddleware?: {
    /**
     * Called before transaction begins.
     */
    beforeBegin?: (options: unknown, context: PluginContext) => Promise<void>;

    /**
     * Called after transaction begins.
     */
    afterBegin?: (transaction: unknown, context: PluginContext) => Promise<void>;

    /**
     * Called before transaction commit.
     */
    beforeCommit?: (transaction: unknown, context: PluginContext) => Promise<void>;

    /**
     * Called before transaction rollback.
     */
    beforeRollback?: (transaction: unknown, context: PluginContext) => Promise<void>;
  };
}

/**
 * Plugin registry for managing plugin instances.
 */
export interface PluginRegistry {
  /**
   * Register a plugin.
   */
  register(plugin: Plugin, config?: Record<string, unknown>): Promise<PluginInstance>;

  /**
   * Unregister a plugin.
   */
  unregister(pluginId: string): Promise<void>;

  /**
   * Get a registered plugin instance.
   */
  get(pluginId: string): PluginInstance | undefined;

  /**
   * Get all registered plugins.
   */
  getAll(): PluginInstance[];

  /**
   * Check if a plugin is registered.
   */
  has(pluginId: string): boolean;

  /**
   * Initialize all registered plugins.
   */
  initializeAll(): Promise<void>;

  /**
   * Destroy all registered plugins.
   */
  destroyAll(): Promise<void>;
}

/**
 * Plugin loader for discovering and loading plugins.
 */
export interface PluginLoader {
  /**
   * Load a plugin from a file path.
   */
  loadFromPath(path: string): Promise<Plugin>;

  /**
   * Load a plugin from an npm package.
   */
  loadFromPackage(packageName: string): Promise<Plugin>;

  /**
   * Load plugins from a directory.
   */
  loadFromDirectory(directory: string): Promise<Plugin[]>;

  /**
   * Load plugins from configuration.
   */
  loadFromConfig(config: Record<string, unknown>): Promise<Plugin[]>;
}

/**
 * Plugin event types.
 */
export enum PluginEventType {
  PLUGIN_REGISTERED = 'plugin:registered',
  PLUGIN_UNREGISTERED = 'plugin:unregistered',
  PLUGIN_ACTIVATED = 'plugin:activated',
  PLUGIN_DEACTIVATED = 'plugin:deactivated',
  QUERY_EXECUTED = 'query:executed',
  TRANSACTION_STARTED = 'transaction:started',
  TRANSACTION_COMMITTED = 'transaction:committed',
  TRANSACTION_ROLLED_BACK = 'transaction:rolled_back',
  CACHE_HIT = 'cache:hit',
  CACHE_MISS = 'cache:miss',
  ENTITY_CREATED = 'entity:created',
  ENTITY_UPDATED = 'entity:updated',
  ENTITY_DELETED = 'entity:deleted',
}

/**
 * Plugin event data.
 */
export interface PluginEvent {
  type: PluginEventType;
  pluginId: string;
  data?: unknown;
  timestamp: Date;
}
