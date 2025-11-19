/**
 * Plugin Registry Implementation
 *
 * Manages plugin registration, lifecycle, and event handling.
 * Provides the core functionality for the extensible plugin system.
 *
 * @module plugins/plugin-registry
 */

import type {
  Plugin,
  PluginInstance,
  PluginContext,
  PluginRegistry as IPluginRegistry,
  PluginMetadata,
  PluginLifecycle,
  PluginLogger,
  PluginEvent,
  PluginEventType,
} from './plugin-interface.js';
import type { DatabaseAdapter } from '../adapters/base-adapter.js';

/**
 * Default plugin logger implementation.
 */
class DefaultPluginLogger implements PluginLogger {
  constructor(private pluginId: string) {}

  debug(message: string, ...args: unknown[]): void {
    console.debug(`[Plugin:${this.pluginId}] ${message}`, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    console.info(`[Plugin:${this.pluginId}] ${message}`, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    console.warn(`[Plugin:${this.pluginId}] ${message}`, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    console.error(`[Plugin:${this.pluginId}] ${message}`, ...args);
  }
}

/**
 * Plugin context implementation.
 */
class PluginContextImpl implements PluginContext {
  private eventListeners: Map<string, Set<(data?: unknown) => void>> = new Map();

  constructor(
    public adapter: DatabaseAdapter,
    public config: Record<string, unknown>,
    public logger: PluginLogger,
    public plugins: Map<string, PluginInstance>
  ) {}

  emit(event: string, data?: unknown): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          this.logger.error(`Event listener error for ${event}:`, error);
        }
      });
    }
  }

  on(event: string, handler: (data?: unknown) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(handler);
  }

  off(event: string, handler: (data?: unknown) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(handler);
    }
  }
}

/**
 * Plugin instance implementation.
 */
class PluginInstanceImpl implements PluginInstance {
  public readonly context: PluginContext;
  public isActive: boolean = false;

  constructor(
    private plugin: Plugin,
    private registry: PluginRegistryImpl,
    adapter: DatabaseAdapter,
    config: Record<string, unknown>,
    plugins: Map<string, PluginInstance>
  ) {
    this.context = new PluginContextImpl(
      adapter,
      config,
      new DefaultPluginLogger(plugin.metadata.id),
      plugins
    );
  }

  get metadata(): PluginMetadata {
    return this.plugin.metadata;
  }

  get lifecycle(): PluginLifecycle | undefined {
    return this.plugin.lifecycle;
  }

  async activate(): Promise<void> {
    if (this.isActive) {
      return;
    }

    try {
      await this.lifecycle?.onInit?.(this.context);
      this.isActive = true;
      this.context.emit(PluginEventType.PLUGIN_ACTIVATED, {
        pluginId: this.metadata.id,
      });
      this.context.logger.info('Plugin activated');
    } catch (error) {
      this.context.logger.error('Failed to activate plugin:', error);
      throw error;
    }
  }

  async deactivate(): Promise<void> {
    if (!this.isActive) {
      return;
    }

    try {
      await this.lifecycle?.onDestroy?.();
      this.isActive = false;
      this.context.emit(PluginEventType.PLUGIN_DEACTIVATED, {
        pluginId: this.metadata.id,
      });
      this.context.logger.info('Plugin deactivated');
    } catch (error) {
      this.context.logger.error('Failed to deactivate plugin:', error);
      throw error;
    }
  }
}

/**
 * Plugin registry implementation.
 */
export class PluginRegistryImpl implements IPluginRegistry {
  private plugins: Map<string, PluginInstance> = new Map();
  private adapter: DatabaseAdapter | null = null;
  private eventHistory: PluginEvent[] = [];

  /**
   * Set the database adapter for all plugins.
   */
  setAdapter(adapter: DatabaseAdapter): void {
    this.adapter = adapter;

    // Notify existing plugins about adapter connection
    for (const plugin of this.plugins.values()) {
      if (plugin.isActive) {
        plugin.lifecycle?.onAdapterConnect?.(adapter).catch(error => {
          plugin.context.logger.error('Adapter connect hook failed:', error);
        });
      }
    }
  }

  async register(
    plugin: Plugin,
    config: Record<string, unknown> = {}
  ): Promise<PluginInstance> {
    if (!this.adapter) {
      throw new Error('Database adapter must be set before registering plugins');
    }

    if (this.plugins.has(plugin.metadata.id)) {
      throw new Error(`Plugin ${plugin.metadata.id} is already registered`);
    }

    // Validate plugin compatibility
    this.validatePlugin(plugin);

    const instance = new PluginInstanceImpl(
      plugin,
      this,
      this.adapter,
      config,
      this.plugins
    );

    this.plugins.set(plugin.metadata.id, instance);

    // Emit registration event
    this.emitEvent({
      type: PluginEventType.PLUGIN_REGISTERED,
      pluginId: plugin.metadata.id,
      data: { metadata: plugin.metadata },
      timestamp: new Date(),
    });

    instance.context.logger.info('Plugin registered');

    return instance;
  }

  async unregister(pluginId: string): Promise<void> {
    const instance = this.plugins.get(pluginId);
    if (!instance) {
      throw new Error(`Plugin ${pluginId} is not registered`);
    }

    // Deactivate if active
    if (instance.isActive) {
      await instance.deactivate();
    }

    this.plugins.delete(pluginId);

    // Emit unregistration event
    this.emitEvent({
      type: PluginEventType.PLUGIN_UNREGISTERED,
      pluginId,
      timestamp: new Date(),
    });

    instance.context.logger.info('Plugin unregistered');
  }

  get(pluginId: string): PluginInstance | undefined {
    return this.plugins.get(pluginId);
  }

  getAll(): PluginInstance[] {
    return Array.from(this.plugins.values());
  }

  has(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }

  async initializeAll(): Promise<void> {
    const promises = Array.from(this.plugins.values()).map(async plugin => {
      if (!plugin.isActive) {
        await plugin.activate();
      }
    });

    await Promise.all(promises);
  }

  async destroyAll(): Promise<void> {
    const promises = Array.from(this.plugins.values()).map(async plugin => {
      if (plugin.isActive) {
        await plugin.deactivate();
      }
    });

    await Promise.all(promises);
    this.plugins.clear();
  }

  /**
   * Get plugin event history.
   */
  getEventHistory(): PluginEvent[] {
    return [...this.eventHistory];
  }

  /**
   * Clear event history.
   */
  clearEventHistory(): void {
    this.eventHistory.length = 0;
  }

  /**
   * Emit an event to all plugins.
   */
  private emitEvent(event: PluginEvent): void {
    this.eventHistory.push(event);

    // Emit to all plugin contexts
    for (const plugin of this.plugins.values()) {
      plugin.context.emit(event.type, event.data);
    }
  }

  /**
   * Validate plugin compatibility.
   */
  private validatePlugin(plugin: Plugin): void {
    const { supportedDialects } = plugin.metadata;

    if (supportedDialects && this.adapter) {
      const currentDialect = this.adapter.getConfig().dialect;
      if (!supportedDialects.includes(currentDialect)) {
        throw new Error(
          `Plugin ${plugin.metadata.id} does not support database dialect ${currentDialect}`
        );
      }
    }
  }

  /**
   * Handle adapter connection event.
   */
  async onAdapterConnect(adapter: DatabaseAdapter): Promise<void> {
    this.adapter = adapter;

    const promises = Array.from(this.plugins.values()).map(async plugin => {
      if (plugin.isActive) {
        await plugin.lifecycle?.onAdapterConnect?.(adapter);
      }
    });

    await Promise.all(promises);
  }

  /**
   * Handle adapter disconnection event.
   */
  async onAdapterDisconnect(adapter: DatabaseAdapter): Promise<void> {
    const promises = Array.from(this.plugins.values()).map(async plugin => {
      if (plugin.isActive) {
        await plugin.lifecycle?.onAdapterDisconnect?.(adapter);
      }
    });

    await Promise.all(promises);
  }
}
