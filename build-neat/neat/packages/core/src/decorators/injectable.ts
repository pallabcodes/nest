/**
 * Neat Framework - Injectable Decorator
 *
 * The @Injectable decorator marks a class as available for dependency injection.
 * This is the foundational decorator that enables automatic service registration
 * and resolution in the dependency injection container.
 *
 * Key TypeScript Excellence Features:
 * - Generic decorator factory with type safety
 * - Metadata attachment with compile-time guarantees
 * - Type-safe service registration
 * - Integration with metadata scanner
 *
 * Runtime Behavior: Attaches metadata to the class constructor that the
 * dependency injection container uses for automatic service discovery.
 *
 * Framework Integration: Essential for all service classes that need to be
 * injected into controllers, other services, or used in the application.
 *
 * Pain Points Addressed: Eliminates manual service registration boilerplate
 * while maintaining type safety and enabling automatic dependency resolution.
 *
 * Research: Inspired by Angular's @Injectable but with stronger typing and
 * integration with Neat's metadata scanning system.
 */

import { MetadataScanner, METADATA_KEYS } from '../metadata/index.js';

/**
 * Options for the @Injectable decorator.
 */
export interface InjectableOptions {
  /**
   * Custom token for the service. If not provided, uses the class constructor.
   */
  token?: string | symbol;

  /**
   * Service scope - defaults to singleton.
   */
  scope?: 'singleton' | 'transient' | 'request';

  /**
   * Whether the service should be globally available.
   */
  global?: boolean;
}

/**
 * God-moded TypeScript: Injectable decorator factory.
 *
 * Creates a class decorator that marks the target class as injectable.
 * Uses advanced TypeScript generics to ensure type safety while providing
 * flexible configuration options.
 *
 * @param options - Configuration options for the injectable service
 * @returns A class decorator that attaches injectable metadata
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class UserService {
 *   // Service implementation
 * }
 *
 * @Injectable({ scope: 'transient' })
 * export class TransientService {
 *   // Transient service implementation
 * }
 * ```
 */
export function Injectable(options: InjectableOptions = {}): ClassDecorator {
  return (target: any) => {
    // Get the metadata scanner instance
    const scanner = new MetadataScanner();

    // Attach injectable metadata
    scanner.setMetadata(METADATA_KEYS.INJECTABLE, true, target);

    // Attach scope metadata if specified
    if (options.scope) {
      scanner.setMetadata(
        `${METADATA_KEYS.INJECTABLE}:scope` as any,
        options.scope,
        target
      );
    }

    // Attach global metadata if specified
    if (options.global) {
      scanner.setMetadata(
        `${METADATA_KEYS.INJECTABLE}:global` as any,
        options.global,
        target
      );
    }

    // Attach custom token if specified
    if (options.token) {
      scanner.setMetadata(
        `${METADATA_KEYS.INJECTABLE}:token` as any,
        options.token,
        target
      );
    }

    // Freeze the constructor to prevent runtime modifications
    // This is a TypeScript/runtime safety measure
    Object.freeze(target);
  };
}

/**
 * Type-safe injectable decorator with no options.
 * Most common usage pattern - singleton services.
 *
 * @returns A class decorator that marks the class as injectable
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class DatabaseService {
 *   // Singleton database service
 * }
 * ```
 */
export const InjectableSingleton = () => Injectable({ scope: 'singleton' });

/**
 * Type-safe injectable decorator for transient services.
 * Creates a new instance for each injection.
 *
 * @returns A class decorator that marks the class as transient injectable
 *
 * @example
 * ```typescript
 * @InjectableTransient()
 * export class RequestContext {
 *   // New instance per request
 * }
 * ```
 */
export const InjectableTransient = () => Injectable({ scope: 'transient' });

/**
 * Type-safe injectable decorator for request-scoped services.
 * Creates a new instance for each HTTP request.
 *
 * @returns A class decorator that marks the class as request-scoped injectable
 *
 * @example
 * ```typescript
 * @InjectableRequest()
 * export class RequestLogger {
 *   // New instance per HTTP request
 * }
 * ```
 */
export const InjectableRequest = () => Injectable({ scope: 'request' });

/**
 * Type-safe injectable decorator for global services.
 * Available application-wide without explicit imports.
 *
 * @returns A class decorator that marks the class as globally injectable
 *
 * @example
 * ```typescript
 * @InjectableGlobal()
 * export class ConfigService {
 *   // Globally available configuration
 * }
 * ```
 */
export const InjectableGlobal = () => Injectable({ global: true, scope: 'singleton' });

/**
 * Utility function to check if a class is injectable.
 * Uses the metadata scanner to verify injectable status.
 *
 * @param target - The class constructor to check
 * @returns True if the class is marked as injectable
 *
 * @example
 * ```typescript
 * if (isInjectable(MyService)) {
 *   console.log('MyService is injectable');
 * }
 * ```
 */
export function isInjectable(target: any): boolean {
  const scanner = new MetadataScanner();
  return scanner.scanClass(target).injectable === true;
}

/**
 * Get the injection scope of an injectable service.
 *
 * @param target - The class constructor to check
 * @returns The injection scope or undefined if not set
 *
 * @example
 * ```typescript
 * const scope = getInjectableScope(MyService);
 * console.log(`Scope: ${scope}`); // 'singleton', 'transient', or 'request'
 * ```
 */
export function getInjectableScope(target: any): 'singleton' | 'transient' | 'request' | undefined {
  const scanner = new MetadataScanner();
  return scanner.getMetadata(
    `${METADATA_KEYS.INJECTABLE}:scope` as any,
    target
  );
}

/**
 * Get the custom token of an injectable service.
 *
 * @param target - The class constructor to check
 * @returns The custom token or undefined if not set
 *
 * @example
 * ```typescript
 * const token = getInjectableToken(MyService);
 * console.log(`Token: ${token}`);
 * ```
 */
export function getInjectableToken(target: any): string | symbol | undefined {
  const scanner = new MetadataScanner();
  return scanner.getMetadata(
    `${METADATA_KEYS.INJECTABLE}:token` as any,
    target
  );
}

/**
 * Check if an injectable service is globally available.
 *
 * @param target - The class constructor to check
 * @returns True if the service is globally available
 *
 * @example
 * ```typescript
 * if (isInjectableGlobal(MyService)) {
 *   console.log('MyService is globally available');
 * }
 * ```
 */
export function isInjectableGlobal(target: any): boolean {
  const scanner = new MetadataScanner();
  return scanner.getMetadata(
    `${METADATA_KEYS.INJECTABLE}:global` as any,
    target
  ) === true;
}
