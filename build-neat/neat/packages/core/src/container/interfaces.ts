/**
 * Neat Framework - Container Interfaces
 *
 * Type definitions and interfaces for the dependency injection container.
 * Separated from the main container implementation for better organization.
 */

import type { ServiceToken } from '../types/index.js';

/**
 * Constructor type for dependency injection.
 */
export type Constructor<T = any> = new (...args: any[]) => T;

/**
 * Service registration options.
 */
export interface ServiceOptions<T = any> {
  /**
   * Service scope - determines when new instances are created.
   */
  scope?: 'singleton' | 'transient' | 'request';

  /**
   * Custom token for the service (defaults to constructor).
   */
  token?: ServiceToken | string | symbol | Constructor<T>;

  /**
   * Whether this service should be globally available.
   */
  global?: boolean;

  /**
   * Custom factory function for service creation.
   */
  factory?: (container: Container) => T;
}

/**
 * Service instance wrapper with metadata.
 */
export interface ServiceInstance<T = any> {
  /**
   * The actual service instance (null for lazy initialization).
   */
  instance: T | null;

  /**
   * Service scope.
   */
  scope: 'singleton' | 'transient' | 'request';

  /**
   * Service token.
   */
  token: ServiceToken | string | symbol | Constructor<T>;

  /**
   * Whether the service is global.
   */
  global: boolean;

  /**
   * Dependencies required by this service.
   */
  dependencies: readonly (ServiceToken | string | symbol | Constructor)[];

  /**
   * Custom factory function (optional).
   */
  factory?: (container: Container) => T;

  /**
   * Creation timestamp for lifecycle management.
   */
  createdAt: number;
}

/**
 * Container resolution context for circular dependency detection.
 */
export interface ResolutionContext {
  /**
   * Current service being resolved.
   */
  token: ServiceToken | string | symbol | Constructor;

  /**
   * Resolution path (for circular dependency detection).
   */
  path: readonly (ServiceToken | string | symbol | Constructor)[];

  /**
   * Services currently being resolved.
   */
  resolving: ReadonlySet<ServiceToken | string | symbol | Constructor>;
}

/**
 * Result type for container operations.
 */
export type Result<T> = { success: true; data: T } | { success: false; error: Error };

// Forward declaration for Container to avoid circular imports
export interface Container {
  resolve<T>(
    token: Constructor<T> | ServiceToken | string | symbol,
    context?: ResolutionContext
  ): Result<T>;

  has(token: Constructor | ServiceToken | string | symbol): boolean;
}
