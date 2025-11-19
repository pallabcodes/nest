/**
 * Neat Framework - Metadata Types (Type-Safe Metadata Interfaces)
 *
 * This module defines all metadata interfaces used by the framework.
 * Provides comprehensive type safety for metadata structures.
 *
 * Key TypeScript Excellence Features:
 * - Exhaustive interface definitions
 * - Discriminated unions for metadata types
 * - Generic constraints for type safety
 * - Readonly modifiers for immutability
 *
 * Runtime Behavior: These types ensure metadata is properly structured
 * and validated at compile time.
 */

// ========================================
// METADATA RESULT TYPES
// ========================================

/**
 * Class metadata scan result.
 */
export interface ClassMetadataResult {
  readonly injectable?: boolean;
  readonly controller?: ControllerMetadata;
  readonly module?: ModuleMetadata;
  readonly strategies?: readonly string[];
  readonly lifecycle: {
    readonly onInit?: LifecycleHook;
    readonly onDestroy?: LifecycleHook;
  };
}

/**
 * Method metadata scan result.
 */
export interface MethodMetadataResult {
  readonly routes?: readonly RouteMetadata[];
  readonly middlewares?: readonly MiddlewareMetadata[];
  readonly guards?: readonly GuardMetadata[];
  readonly interceptors?: readonly InterceptorMetadata[];
}

/**
 * Property metadata scan result.
 */
export interface PropertyMetadataResult {
  readonly inject?: InjectMetadata;
  readonly strategy?: StrategyMetadata;
}

// ========================================
// METADATA VALUE TYPES
// ========================================

/**
 * Controller metadata.
 */
export interface ControllerMetadata {
  readonly prefix?: string;
  readonly options?: ControllerOptions;
}

/**
 * Controller options.
 */
export interface ControllerOptions {
  readonly scope?: 'singleton' | 'transient' | 'request';
  readonly version?: string;
}

/**
 * Module metadata.
 */
export interface ModuleMetadata {
  readonly imports?: readonly Constructor[];
  readonly providers?: readonly Constructor[];
  readonly controllers?: readonly Constructor[];
  readonly exports?: readonly Constructor[];
}

/**
 * Route metadata.
 */
export interface RouteMetadata {
  readonly method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';
  readonly path: string;
  readonly options?: RouteOptions;
}

/**
 * Route options.
 */
export interface RouteOptions {
  readonly statusCode?: number;
  readonly contentType?: string;
  readonly summary?: string;
  readonly description?: string;
}

/**
 * Middleware metadata.
 */
export interface MiddlewareMetadata {
  readonly name: string;
  readonly priority?: number;
  readonly options?: Record<string, unknown>;
}

/**
 * Guard metadata.
 */
export interface GuardMetadata {
  readonly guard: Constructor;
  readonly options?: Record<string, unknown>;
}

/**
 * Interceptor metadata.
 */
export interface InterceptorMetadata {
  readonly interceptor: Constructor;
  readonly options?: Record<string, unknown>;
}

/**
 * Inject metadata.
 */
export interface InjectMetadata {
  readonly token: string | symbol;
  readonly options?: InjectOptions;
}

/**
 * Inject options.
 */
export interface InjectOptions {
  readonly optional?: boolean;
  readonly lazy?: boolean;
}

/**
 * Strategy metadata.
 */
export interface StrategyMetadata {
  readonly key: string;
  readonly implementation: Constructor;
  readonly options?: Record<string, unknown>;
}

/**
 * Lifecycle hook metadata.
 */
export interface LifecycleHook {
  readonly method: string;
  readonly priority?: number;
}

// ========================================
// UTILITY TYPES
// ========================================

/**
 * Type-safe constructor type.
 */
export type Constructor<T = any> = new (...args: any[]) => T;
