/**
 * Plugin System Module
 *
 * Complete plugin system for extending NeatORM functionality.
 * Provides interfaces, implementations, and utilities for building
 * and managing plugins.
 *
 * @module plugins
 */

// Core interfaces and types
export type {
  Plugin,
  PluginInstance,
  PluginMetadata,
  PluginLifecycle,
  PluginContext,
  PluginLogger,
  PluginRegistry,
  QueryBuilderPlugin,
  DecoratorPlugin,
  CacheProviderPlugin,
  CacheProvider,
  MiddlewarePlugin,
  PluginEvent,
  PluginEventType,
} from './plugin-interface.js';

// Implementations
export { PluginRegistryImpl } from './plugin-registry.js';
export { PluginLoader } from './plugin-loader.js';
export { PluginManager } from './plugin-manager.js';

// Marketplace and Registry
export type {
  PluginInfo,
  PluginInstallOptions,
  PluginMarketplace,
  EnterprisePluginRegistry,
  CompatibilityResult,
  AuditEntry,
  EnterprisePolicies,
  PluginCategory,
} from './marketplace.js';

export {
  MarketplaceImpl,
  EnterpriseRegistryImpl,
  getMarketplace,
  getEnterpriseRegistry,
} from './marketplace.js';

// Development Toolkit
export { PluginToolkit, PluginTestingUtils, PluginCLIUtils, PluginPerformanceUtils } from './toolkit.js';

// Global functions
export {
  getPluginManager,
  setPluginManager,
  initializePlugins,
  destroyPlugins,
} from './plugin-manager.js';

// Re-export for convenience
export type { PluginManagerConfig } from './plugin-manager.js';
