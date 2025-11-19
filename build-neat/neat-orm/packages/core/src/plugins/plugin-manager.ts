/**
 * Plugin Manager
 *
 * High-level API for managing the entire plugin ecosystem.
 * Provides easy-to-use methods for loading, registering, and managing plugins.
 *
 * @module plugins/plugin-manager
 */

import type {
  Plugin,
  PluginInstance,
  PluginRegistry as IPluginRegistry,
  PluginLoader as IPluginLoader,
} from './plugin-interface.js';
import { PluginRegistryImpl } from './plugin-registry.js';
import { PluginLoader } from './plugin-loader.js';
import type { DatabaseAdapter } from '../adapters/base-adapter.js';

/**
 * Plugin manager configuration.
 */
export interface PluginManagerConfig {
  /**
   * Auto-load plugins from directories.
   */
  autoLoadPaths?: string[];

  /**
   * Auto-load plugins from npm packages.
   */
  autoLoadPackages?: string[];

  /**
   * Plugin configurations.
   */
  pluginConfigs?: Record<string, Record<string, unknown>>;

  /**
   * Enable plugin event logging.
   */
  enableEventLogging?: boolean;
}

/**
 * Plugin manager - main entry point for plugin functionality.
 */
export class PluginManager {
  private registry: IPluginRegistry;
  private loader: IPluginLoader;
  private config: PluginManagerConfig;
  private initialized: boolean = false;

  constructor(config: PluginManagerConfig = {}) {
    this.config = {
      autoLoadPaths: [],
      autoLoadPackages: [],
      pluginConfigs: {},
      enableEventLogging: false,
      ...config,
    };

    this.registry = new PluginRegistryImpl();
    this.loader = new PluginLoader();
  }

  /**
   * Initialize the plugin manager with a database adapter.
   */
  async initialize(adapter: DatabaseAdapter): Promise<void> {
    if (this.initialized) {
      throw new Error('Plugin manager is already initialized');
    }

    // Set adapter in registry
    (this.registry as PluginRegistryImpl).setAdapter(adapter);

    // Auto-load plugins
    await this.autoLoadPlugins();

    // Initialize all plugins
    await this.registry.initializeAll();

    this.initialized = true;

    if (this.config.enableEventLogging) {
      console.log('Plugin manager initialized with', this.registry.getAll().length, 'plugins');
    }
  }

  /**
   * Destroy the plugin manager and all plugins.
   */
  async destroy(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    await this.registry.destroyAll();
    (this.loader as PluginLoader).clearCache();

    this.initialized = false;

    if (this.config.enableEventLogging) {
      console.log('Plugin manager destroyed');
    }
  }

  /**
   * Load a plugin from a file path.
   */
  async loadFromPath(path: string, config?: Record<string, unknown>): Promise<PluginInstance> {
    const plugin = await this.loader.loadFromPath(path);
    return this.registry.register(plugin, config || this.config.pluginConfigs?.[plugin.metadata.id]);
  }

  /**
   * Load a plugin from an npm package.
   */
  async loadFromPackage(packageName: string, config?: Record<string, unknown>): Promise<PluginInstance> {
    const plugin = await this.loader.loadFromPackage(packageName);
    return this.registry.register(plugin, config || this.config.pluginConfigs?.[plugin.metadata.id]);
  }

  /**
   * Load plugins from a directory.
   */
  async loadFromDirectory(directory: string): Promise<PluginInstance[]> {
    const plugins = await this.loader.loadFromDirectory(directory);
    const instances: PluginInstance[] = [];

    for (const plugin of plugins) {
      const instance = await this.registry.register(
        plugin,
        this.config.pluginConfigs?.[plugin.metadata.id]
      );
      instances.push(instance);
    }

    return instances;
  }

  /**
   * Load plugins from configuration.
   */
  async loadFromConfig(config: Record<string, unknown>): Promise<PluginInstance[]> {
    const plugins = await this.loader.loadFromConfig(config);
    const instances: PluginInstance[] = [];

    for (const plugin of plugins) {
      const instance = await this.registry.register(
        plugin,
        this.config.pluginConfigs?.[plugin.metadata.id]
      );
      instances.push(instance);
    }

    return instances;
  }

  /**
   * Register a plugin instance directly.
   */
  async registerPlugin(plugin: Plugin, config?: Record<string, unknown>): Promise<PluginInstance> {
    return this.registry.register(plugin, config || this.config.pluginConfigs?.[plugin.metadata.id]);
  }

  /**
   * Unregister a plugin.
   */
  async unregisterPlugin(pluginId: string): Promise<void> {
    await this.registry.unregister(pluginId);
  }

  /**
   * Get a plugin instance.
   */
  getPlugin(pluginId: string): PluginInstance | undefined {
    return this.registry.get(pluginId);
  }

  /**
   * Get all registered plugins.
   */
  getAllPlugins(): PluginInstance[] {
    return this.registry.getAll();
  }

  /**
   * Check if a plugin is registered.
   */
  hasPlugin(pluginId: string): boolean {
    return this.registry.has(pluginId);
  }

  /**
   * Get plugin event history.
   */
  getEventHistory(): any[] {
    return (this.registry as PluginRegistryImpl).getEventHistory();
  }

  /**
   * Clear plugin event history.
   */
  clearEventHistory(): void {
    (this.registry as PluginRegistryImpl).clearEventHistory();
  }

  /**
   * Get loaded plugin classes.
   */
  getLoadedPlugins(): Plugin[] {
    return (this.loader as PluginLoader).getLoadedPlugins();
  }

  /**
   * Create a plugin-enabled adapter wrapper.
   */
  createPluginAdapter(originalAdapter: DatabaseAdapter): DatabaseAdapter {
    // Return a proxy that intercepts operations and notifies plugins
    return new Proxy(originalAdapter, {
      get: (target, prop) => {
        const value = (target as any)[prop];

        if (typeof value === 'function') {
          return (...args: any[]) => {
            // Notify plugins before operation
            this.notifyPlugins('beforeOperation', { operation: prop, args });

            try {
              const result = value.apply(target, args);

              // Handle promises
              if (result && typeof result.then === 'function') {
                return result.then((res: any) => {
                  // Notify plugins after successful operation
                  this.notifyPlugins('afterOperation', {
                    operation: prop,
                    args,
                    result: res
                  });
                  return res;
                }).catch((error: any) => {
                  // Notify plugins after failed operation
                  this.notifyPlugins('operationError', {
                    operation: prop,
                    args,
                    error
                  });
                  throw error;
                });
              }

              // Notify plugins after synchronous operation
              this.notifyPlugins('afterOperation', {
                operation: prop,
                args,
                result
              });

              return result;
            } catch (error) {
              // Notify plugins after failed synchronous operation
              this.notifyPlugins('operationError', {
                operation: prop,
                args,
                error
              });
              throw error;
            }
          };
        }

        return value;
      }
    });
  }

  /**
   * Notify all plugins of an event.
   */
  private notifyPlugins(event: string, data: any): void {
    for (const plugin of this.registry.getAll()) {
      if (plugin.isActive) {
        plugin.context.emit(event, data);
      }
    }
  }

  /**
   * Auto-load plugins based on configuration.
   */
  private async autoLoadPlugins(): Promise<void> {
    // Load from paths
    for (const path of this.config.autoLoadPaths || []) {
      try {
        await this.loadFromDirectory(path);
      } catch (error) {
        console.warn(`Failed to auto-load plugins from ${path}:`, error);
      }
    }

    // Load from packages
    for (const packageName of this.config.autoLoadPackages || []) {
      try {
        await this.loadFromPackage(packageName);
      } catch (error) {
        console.warn(`Failed to auto-load plugin package ${packageName}:`, error);
      }
    }
  }
}

/**
 * Global plugin manager instance.
 */
let globalPluginManager: PluginManager | null = null;

/**
 * Get the global plugin manager instance.
 */
export function getPluginManager(): PluginManager {
  if (!globalPluginManager) {
    globalPluginManager = new PluginManager();
  }
  return globalPluginManager;
}

/**
 * Set the global plugin manager instance.
 */
export function setPluginManager(manager: PluginManager): void {
  globalPluginManager = manager;
}

/**
 * Initialize the global plugin manager.
 */
export async function initializePlugins(
  adapter: DatabaseAdapter,
  config?: PluginManagerConfig
): Promise<void> {
  const manager = getPluginManager();

  if (config) {
    // Create new manager with config
    const newManager = new PluginManager(config);
    setPluginManager(newManager);
    await newManager.initialize(adapter);
  } else {
    await manager.initialize(adapter);
  }
}

/**
 * Destroy the global plugin manager.
 */
export async function destroyPlugins(): Promise<void> {
  if (globalPluginManager) {
    await globalPluginManager.destroy();
    globalPluginManager = null;
  }
}
