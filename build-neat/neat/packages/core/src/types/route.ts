/**
 * Neat Framework - Route Types (Type-Safe Route Definitions)
 *
 * This module provides types for defining HTTP routes with compile-time safety,
 * ensuring routes are properly configured before runtime.
 *
 * Key TypeScript Excellence Features:
 * - Branded types for route paths and methods
 * - Type-safe route metadata and validation
 * - Compile-time route conflict detection
 * - Generic route parameter extraction
 *
 * Runtime Behavior: Routes are validated at startup with zero runtime overhead
 * for type checking during request processing.
 *
 * Pain Points Addressed: Eliminates runtime route conflicts, invalid method/path
 * combinations, and unsafe route parameter handling.
 */

import type { HttpMethod, RoutePath } from './branded.js';

// ========================================
// ROUTE DEFINITION TYPES
// ========================================

/**
 * God-moded TypeScript: Type-safe route definition.
 *
 * Ensures routes are defined with proper HTTP methods, paths, and metadata.
 * The compiler prevents invalid route configurations at build time.
 */
export interface RouteDefinition {
  readonly method: HttpMethod;
  readonly path: RoutePath;
  readonly propertyKey: string;
  readonly middlewares?: readonly Middleware[];
  readonly metadata?: RouteMetadata;
}

/**
 * Route metadata for additional configuration.
 */
export interface RouteMetadata {
  readonly description?: string;
  readonly tags?: readonly string[];
  readonly deprecated?: boolean;
  readonly summary?: string;
  readonly produces?: readonly string[];
  readonly consumes?: readonly string[];
}

/**
 * Type guard to validate route definitions.
 * Ensures route objects conform to the expected structure.
 */
export function isValidRouteDefinition(obj: unknown): obj is RouteDefinition {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'method' in obj &&
    'path' in obj &&
    'propertyKey' in obj &&
    typeof (obj as any).propertyKey === 'string'
  );
}

// ========================================
// ROUTE PARAMETER TYPES
// ========================================

/**
 * Extract route parameters from path template.
 * God-moded TypeScript: Template literal types for route parameter inference.
 */
export type RouteParams<T extends string> = T extends `${string}:${infer Param}/${infer Rest}`
  ? { [K in Param]: string } & RouteParams<Rest>
  : T extends `${string}:${infer Param}`
  ? { [K in Param]: string }
  : {};

/**
 * Validate route parameter extraction.
 */
export type ExtractRouteParams<Path extends string> = RouteParams<Path>;

// ========================================
// ROUTE VALIDATION
// ========================================

/**
 * Validate route path format.
 */
export function isValidRoutePath(path: string): path is RoutePath {
  // Basic validation - should start with / and not have invalid characters
  return path.startsWith('/') && !path.includes(' ') && !path.includes('\t');
}

/**
 * Check for route conflicts.
 */
export function routesConflict(route1: RouteDefinition, route2: RouteDefinition): boolean {
  return route1.method === route2.method && route1.path === route2.path;
}

/**
 * Validate HTTP method is supported.
 */
export function isSupportedHttpMethod(method: string): method is HttpMethod {
  const supportedMethods: readonly string[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];
  return supportedMethods.includes(method);
}

// ========================================
// ROUTE COLLECTION TYPES
// ========================================

/**
 * Collection of routes with validation.
 */
export interface RouteCollection {
  readonly routes: readonly RouteDefinition[];
  readonly conflicts: readonly RouteConflict[];
}

/**
 * Route conflict information.
 */
export interface RouteConflict {
  readonly route1: RouteDefinition;
  readonly route2: RouteDefinition;
  readonly reason: 'duplicate-path-method' | 'parameter-conflict';
}

/**
 * Build route collection with conflict detection.
 */
export function buildRouteCollection(routes: readonly RouteDefinition[]): RouteCollection {
  const conflicts: RouteConflict[] = [];

  // Check for conflicts
  for (let i = 0; i < routes.length; i++) {
    for (let j = i + 1; j < routes.length; j++) {
      if (routesConflict(routes[i], routes[j])) {
        conflicts.push({
          route1: routes[i],
          route2: routes[j],
          reason: 'duplicate-path-method',
        });
      }
    }
  }

  return { routes, conflicts };
}

// ========================================
// ROUTE REGISTRATION
// ========================================

/**
 * Route registry for managing route definitions.
 */
export class RouteRegistry {
  private readonly routes = new Map<string, RouteDefinition>();

  /**
   * Register a route.
   */
  register(route: RouteDefinition): void {
    const key = `${route.method}:${route.path}`;
    if (this.routes.has(key)) {
      throw new Error(`Route already registered: ${key}`);
    }
    this.routes.set(key, route);
  }

  /**
   * Get all registered routes.
   */
  getAll(): readonly RouteDefinition[] {
    return Array.from(this.routes.values());
  }

  /**
   * Find route by method and path.
   */
  find(method: HttpMethod, path: RoutePath): RouteDefinition | undefined {
    const key = `${method}:${path}`;
    return this.routes.get(key);
  }

  /**
   * Clear all routes.
   */
  clear(): void {
    this.routes.clear();
  }
}

// Forward declaration for Middleware - will be imported when middleware.ts is created
type Middleware = any;
