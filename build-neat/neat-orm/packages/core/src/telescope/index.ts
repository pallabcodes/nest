/**
 * NeatORM Telescope - Monitoring & Debugging System
 *
 * Complete monitoring and debugging solution inspired by Laravel Telescope.
 * Provides comprehensive insights into ORM operations, performance, and behavior.
 *
 * @module telescope
 */

// Core interfaces and types
export type {
  Telescope,
  TelescopeConfig,
  TelescopeEntry,
  TelescopeEntryType,
  QueryEntry,
  TransactionEntry,
  CacheEntry,
  ConnectionEntry,
  EntityEntry,
  PerformanceEntry,
  ExceptionEntry,
  TelescopeStorage,
  TelescopeWatcher,
  TelescopeWatcherConfig,
  TelescopeDashboard,
  DashboardData,
  TelescopeStats,
  WebDashboardConfig,
} from './telescope-interface.js';

// Core implementations
export {
  TelescopeImpl,
  createTelescope,
  getDefaultTelescopeConfig,
} from './telescope-core.js';

// Web dashboard
export { WebDashboard, createWebDashboard } from './web-dashboard.js';
