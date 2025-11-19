/**
 * Neat Framework - HTTP Adapter Types (Framework Agnostic HTTP Layer)
 *
 * This module provides adapter interfaces for different HTTP frameworks,
 * enabling the Neat framework to work with Fastify, Express, or other servers.
 *
 * Key TypeScript Excellence Features:
 * - Generic adapter interfaces with proper abstraction
 * - Type-safe adapter configuration
 * - Framework-agnostic route registration
 * - Compile-time adapter validation
 *
 * Runtime Behavior: Adapters provide a unified interface for different HTTP servers,
 * allowing the framework to be transport-agnostic.
 *
 * Pain Points Addressed: Eliminates tight coupling to specific HTTP frameworks,
 * allowing developers to choose their preferred server implementation.
 */

import type { RouteDefinition } from './route.js';
import type { HttpMiddleware } from './middleware.js';
import type { Port } from './branded.js';
import type { Result } from './results.js';

// ========================================
// HTTP ADAPTER INTERFACE
// ========================================

/**
 * God-moded TypeScript: Generic HTTP adapter interface.
 *
 * Provides a unified interface for different HTTP server implementations.
 * Ensures type safety across different adapter implementations.
 *
 * @template TServer - The underlying server type (Fastify instance, Express app, etc.)
 * @template TRequest - Request type specific to the adapter
 * @template TResponse - Response type specific to the adapter
 */
export interface HttpAdapter<TServer = unknown, TRequest = unknown, TResponse = unknown> {
  readonly name: string;
  readonly version: string;

  /**
   * Initialize the HTTP server with configuration.
   */
  initialize(config: HttpAdapterConfig): Promise<Result<TServer>>;

  /**
   * Register a route with the server.
   */
  registerRoute(server: TServer, route: RouteDefinition, handler: RouteHandler<TRequest, TResponse>): Promise<Result<void>>;

  /**
   * Register middleware with the server.
   */
  registerMiddleware(server: TServer, middleware: HttpMiddleware): Promise<Result<void>>;

  /**
   * Start the HTTP server on specified port.
   */
  start(server: TServer, port: Port): Promise<Result<void>>;

  /**
   * Stop the HTTP server gracefully.
   */
  stop(server: TServer): Promise<Result<void>>;

  /**
   * Get server health status.
   */
  getHealth(server: TServer): Promise<Result<ServerHealth>>;
}

// ========================================
// ADAPTER CONFIGURATION
// ========================================

/**
 * HTTP adapter configuration with type safety.
 */
export interface HttpAdapterConfig {
  readonly port: Port;
  readonly host?: string;
  readonly timeout?: number;
  readonly maxConnections?: number;
  readonly keepAliveTimeout?: number;
  readonly headersTimeout?: number;
  readonly requestTimeout?: number;
  readonly bodyLimit?: number;
  readonly trustProxy?: boolean | string | number;
  readonly disableRequestLogging?: boolean;
  readonly ignoreTrailingSlash?: boolean;
  readonly caseSensitive?: boolean;
  readonly jsonShorthand?: boolean;
  readonly https?: HttpsConfig;
  readonly cors?: CorsConfig;
}

/**
 * HTTPS configuration for secure servers.
 */
export interface HttpsConfig {
  readonly key: string;
  readonly cert: string;
  readonly ca?: string;
  readonly passphrase?: string;
  readonly requestCert?: boolean;
  readonly rejectUnauthorized?: boolean;
}

/**
 * CORS configuration.
 */
export interface CorsConfig {
  readonly origin: boolean | string | readonly string[] | RegExp;
  readonly methods: readonly string[];
  readonly allowedHeaders: readonly string[];
  readonly exposedHeaders: readonly string[];
  readonly credentials: boolean;
  readonly maxAge: number;
}

// ========================================
// SERVER HEALTH
// ========================================

/**
 * Server health status with detailed metrics.
 */
export interface ServerHealth {
  readonly status: 'healthy' | 'unhealthy' | 'starting' | 'stopping';
  readonly uptime: number;
  readonly memoryUsage: MemoryUsage;
  readonly activeConnections: number;
  readonly totalRequests: number;
  readonly errorRate: number;
  readonly responseTime: ResponseTimeMetrics;
}

/**
 * Memory usage information.
 */
export interface MemoryUsage {
  readonly rss: number;
  readonly heapTotal: number;
  readonly heapUsed: number;
  readonly external: number;
  readonly arrayBuffers: number;
}

/**
 * Response time metrics.
 */
export interface ResponseTimeMetrics {
  readonly average: number;
  readonly p50: number;
  readonly p95: number;
  readonly p99: number;
}

// ========================================
// ROUTE HANDLER TYPES
// ========================================

/**
 * Generic route handler for adapter-agnostic route processing.
 */
export interface RouteHandler<TRequest, TResponse> {
  handle(request: TRequest, response: TResponse): Promise<void>;
}

/**
 * HTTP-specific route handler with proper typing.
 */
export interface HttpRouteHandler {
  handle(request: HttpRequest, response: HttpResponse): Promise<void> | void;
}

// ========================================
// ADAPTER REGISTRY
// ========================================

/**
 * Registry for managing HTTP adapters.
 */
export class HttpAdapterRegistry {
  private readonly adapters = new Map<string, HttpAdapter>();

  /**
   * Register an adapter.
   */
  register(adapter: HttpAdapter): void {
    if (this.adapters.has(adapter.name)) {
      throw new Error(`Adapter already registered: ${adapter.name}`);
    }
    this.adapters.set(adapter.name, adapter);
  }

  /**
   * Get adapter by name.
   */
  get(name: string): HttpAdapter | undefined {
    return this.adapters.get(name);
  }

  /**
   * Get default adapter (Fastify).
   */
  getDefault(): HttpAdapter | undefined {
    return this.adapters.get('fastify') || this.adapters.get('express');
  }

  /**
   * Get all registered adapters.
   */
  getAll(): readonly HttpAdapter[] {
    return Array.from(this.adapters.values());
  }

  /**
   * Remove adapter by name.
   */
  remove(name: string): boolean {
    return this.adapters.delete(name);
  }

  /**
   * Clear all adapters.
   */
  clear(): void {
    this.adapters.clear();
  }
}

// ========================================
// ADAPTER FACTORIES
// ========================================

/**
 * Factory for creating HTTP adapters.
 */
export interface HttpAdapterFactory<TServer, TRequest, TResponse> {
  readonly supportedFrameworks: readonly string[];
  create(config: HttpAdapterConfig): Promise<Result<HttpAdapter<TServer, TRequest, TResponse>>>;
}

/**
 * Fastify adapter factory.
 */
export interface FastifyAdapterFactory extends HttpAdapterFactory<any, any, any> {
  readonly supportedFrameworks: readonly ['fastify'];
}

/**
 * Express adapter factory.
 */
export interface ExpressAdapterFactory extends HttpAdapterFactory<any, any, any> {
  readonly supportedFrameworks: readonly ['express'];
}

// ========================================
// ADAPTER VALIDATION
// ========================================

/**
 * Validate adapter configuration.
 */
export function validateAdapterConfig(config: HttpAdapterConfig): Result<void> {
  if (config.port < 1 || config.port > 65535) {
    return {
      success: false,
      error: new Error(`Invalid port: ${config.port}. Must be between 1 and 65535.`),
    };
  }

  if (config.timeout && config.timeout < 0) {
    return {
      success: false,
      error: new Error(`Invalid timeout: ${config.timeout}. Must be non-negative.`),
    };
  }

  if (config.maxConnections && config.maxConnections < 1) {
    return {
      success: false,
      error: new Error(`Invalid maxConnections: ${config.maxConnections}. Must be at least 1.`),
    };
  }

  return { success: true, data: undefined };
}

/**
 * Check if adapter is compatible with current environment.
 */
export function isAdapterCompatible(adapter: HttpAdapter, nodeVersion?: string): Result<void> {
  // Basic compatibility checks
  const currentVersion = nodeVersion || process.version;

  // Add framework-specific compatibility checks here
  if (adapter.name === 'fastify' && !currentVersion.startsWith('v14') && !currentVersion.startsWith('v16') && !currentVersion.startsWith('v18') && !currentVersion.startsWith('v20')) {
    return {
      success: false,
      error: new Error(`Fastify adapter requires Node.js 14+. Current version: ${currentVersion}`),
    };
  }

  return { success: true, data: undefined };
}

// Forward declarations for HTTP types - will be imported when handler.ts is created
interface HttpRequest {
  readonly method: string;
  readonly url: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly params: Readonly<Record<string, string>>;
  readonly query: Readonly<Record<string, string>>;
  readonly body?: unknown;
}

interface HttpResponse<T = unknown> {
  readonly status: 'success' | 'error' | 'redirect';
  readonly statusCode: number;
  readonly data?: T;
  readonly error?: string;
}
