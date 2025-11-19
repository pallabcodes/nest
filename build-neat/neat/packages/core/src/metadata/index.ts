/**
 * Neat Framework - Metadata Module Barrel Export
 *
 * This module provides a unified interface to all metadata-related functionality.
 * Includes scanning, key management, and type definitions.
 */

// Core scanner functionality
export { MetadataScanner, createMetadataScanner } from './scanner.js';

// Utility functions
export {
  isInjectable,
  isController,
  getControllerPrefix,
  getModuleProviders,
  getModuleControllers,
  scanForEntities,
  scanForServices,
  scanForControllers,
  scanForSchemas,
  scanForGuards,
  scanForPipes,
  scanForInterceptors,
  scanForExceptionFilters,
} from './scanner.js';

// Metadata keys
export { METADATA_KEYS, isValidMetadataKey, getAllMetadataKeys, getMetadataKeysByCategory } from './keys.js';
export type { MetadataKey } from './keys.js';

// Type definitions
export type {
  ClassMetadataResult,
  MethodMetadataResult,
  PropertyMetadataResult,
  Constructor,
  ControllerMetadata,
  ControllerOptions,
  ModuleMetadata,
  RouteMetadata,
  RouteOptions,
  MiddlewareMetadata,
  GuardMetadata,
  InterceptorMetadata,
  InjectMetadata,
  InjectOptions,
  StrategyMetadata,
  LifecycleHook,
} from './types.js';
