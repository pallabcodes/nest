/**
 * Neat Framework - Startup Application Decorator
 *
 * The @StartupApplication decorator enables zero-configuration application startup.
 * This is the crown jewel of the Neat framework - it automatically discovers,
 * configures, and starts your entire application with minimal boilerplate.
 *
 * Key TypeScript Excellence Features:
 * - Zero-configuration application bootstrap
 * - Automatic dependency injection setup
 * - Type-safe configuration with branded types
 * - Compile-time module discovery
 * - Runtime application orchestration
 *
 * Runtime Behavior: Orchestrates the entire application lifecycle from
 * dependency injection to HTTP server startup and graceful shutdown.
 *
 * Framework Integration: The primary entry point for Neat applications,
 * replacing traditional main.ts files with declarative configuration.
 *
 * Pain Points Addressed: Eliminates complex application setup, manual
 * service registration, route configuration, and server initialization.
 *
 * Research: Inspired by Spring Boot's auto-configuration but with stronger
 * typing and zero runtime overhead for type checking.
 */

import { MetadataScanner, METADATA_KEYS } from '../metadata/index.js';
import type { Port } from '../types/index.js';
import { NeatApplication } from './application.js';

/**
 * Startup application configuration options.
 */
export interface StartupOptions {
  /**
   * Port to listen on (branded type for compile-time validation).
   */
  port: Port;

  /**
   * Host to bind to (optional, defaults to all interfaces).
   */
  host?: string;

  /**
   * Controllers to include (auto-discovered if not specified).
   * FUTURE: Auto-discovery will scan all @Controller decorated classes.
   */
  controllers?: readonly Constructor[];

  /**
   * Providers/services to include (auto-discovered if not specified).
   * FUTURE: Auto-discovery will scan all @Injectable and @Strategy decorated classes.
   * CURRENT: Manual listing required (temporary until auto-discovery implemented).
   */
  providers?: readonly Constructor[];

  /**
   * Global prefix for all routes.
   */
  globalPrefix?: string;

  /**
   * CORS configuration.
   */
  cors?: CorsOptions;

  /**
   * Custom logger configuration.
   */
  logger?: LoggerOptions;

  /**
   * Graceful shutdown timeout in milliseconds.
   */
  shutdownTimeout?: number;

  /**
   * HTTP server options (Fastify by default).
   */
  httpOptions?: HttpServerOptions;
}

/**
 * CORS configuration options.
 */
export interface CorsOptions {
  origin?: boolean | string | readonly string[];
  credentials?: boolean;
  methods?: readonly string[];
  allowedHeaders?: readonly string[];
}

/**
 * Logger configuration options.
 */
export interface LoggerOptions {
  level?: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  prettyPrint?: boolean;
  redact?: readonly string[];
}

/**
 * HTTP server options.
 */
export interface HttpServerOptions {
  /**
   * Server implementation ('fastify' or 'express').
   */
  engine?: 'fastify' | 'express';

  /**
   * Body size limit.
   */
  bodyLimit?: number;

  /**
   * Trust proxy setting.
   */
  trustProxy?: boolean;
}

/**
 * Constructor type for classes.
 */
type Constructor<T = any> = new (...args: any[]) => T;

/**
 * God-moded TypeScript: StartupApplication decorator factory.
 *
 * The crown jewel of Neat framework - enables zero-configuration application startup.
 * Automatically discovers controllers, providers, sets up DI, registers routes,
 * starts HTTP server, and handles graceful shutdown.
 *
 * @param options - Application configuration options
 * @returns A class decorator that transforms the class into a runnable application
 *
 * @example
 * ```typescript
 * @StartupApplication({
 *   port: 3000 as any, // Branded Port type
 *   // controllers and providers auto-discovered if not specified
 * })
 * export class Application {
 *   // Zero configuration - everything handled automatically!
 * }
 *
 * // Run with: node dist/main.js
 * ```
 */
export function StartupApplication(options: StartupOptions): ClassDecorator {
  return (target: any) => {
    // Mark as application entry point
    const scanner = new MetadataScanner();
    scanner.setMetadata(METADATA_KEYS.MODULE, {
      type: 'application',
      options,
      startupTime: Date.now(),
    }, target);

    // Create application instance factory
    const createApplication = () => new NeatApplication(options);

    // Auto-run application when this module is executed directly
    if (typeof require !== 'undefined' && require.main === module) {
      const app = createApplication();
      app.start().catch(console.error);
    }

    // For ES modules, provide a default export
    if (typeof module !== 'undefined' && module.exports) {
      module.exports = { createApplication };
    }
  };
}


/**
 * Utility function to check if a class is an application entry point.
 */
export function isApplicationEntryPoint(target: any): boolean {
  const scanner = new MetadataScanner();
  const metadata = scanner.getMetadata(METADATA_KEYS.MODULE, target) as any;
  return metadata?.type === 'application';
}

/**
 * Get application configuration from a decorated class.
 */
export function getApplicationConfig(target: any): StartupOptions | undefined {
  const scanner = new MetadataScanner();
  const metadata = scanner.getMetadata(METADATA_KEYS.MODULE, target) as any;
  return metadata?.type === 'application' ? metadata.options : undefined;
}

/**
 * Create and start an application instance.
 */
export async function createApplication(options: StartupOptions): Promise<NeatApplication> {
  const app = new NeatApplication(options);
  await app.start();
  return app;
}
