/**
 * Neat Framework - Controller Decorator
 *
 * The @Controller decorator marks a class as an HTTP controller and defines
 * a base path for all routes within that controller.
 *
 * Key TypeScript Excellence Features:
 * - Class decorator with type-safe configuration
 * - Automatic injectable registration for controllers
 * - Compile-time path validation
 * - Integration with metadata scanner
 *
 * Runtime Behavior: Attaches metadata that enables automatic route registration
 * and controller instantiation in the HTTP layer.
 *
 * Framework Integration: Essential for organizing HTTP endpoints into logical
 * groups with shared base paths and middleware.
 */

import { MetadataScanner, METADATA_KEYS } from '../metadata/index.js';

/**
 * Options for the @Controller decorator.
 */
export interface ControllerOptions {
  /**
   * Base path prefix for all routes in this controller.
   */
  prefix?: string;

  /**
   * Controller scope - typically 'singleton' for controllers.
   */
  scope?: 'singleton' | 'request';

  /**
   * Controller version for API versioning.
   */
  version?: string;

  /**
   * Controller tags for documentation grouping.
   */
  tags?: readonly string[];
}

/**
 * God-moded TypeScript: Controller decorator factory.
 *
 * Marks a class as an HTTP controller and defines a base path for all routes.
 * Controllers are automatically registered as injectable services.
 *
 * @param prefixOrOptions - Base path prefix or configuration options
 * @returns A class decorator that marks the class as a controller
 *
 * @example
 * ```typescript
 * @Controller('/users')
 * export class UserController {
 *   // Routes will be available under /users/*
 * }
 *
 * @Controller({
 *   prefix: '/api/v1/users',
 *   version: '1',
 *   tags: ['users']
 * })
 * export class UserV1Controller {
 *   // Routes with full configuration
 * }
 * ```
 */
export function Controller(
  prefixOrOptions?: string | ControllerOptions
): ClassDecorator {
  return (target: any) => {
    const scanner = new MetadataScanner();

    // Normalize options
    const options: ControllerOptions = typeof prefixOrOptions === 'string'
      ? { prefix: prefixOrOptions }
      : prefixOrOptions || {};

    // Attach controller metadata
    scanner.setMetadata(METADATA_KEYS.CONTROLLER, {
      prefix: options.prefix || '',
      scope: options.scope || 'singleton',
      version: options.version,
      tags: options.tags,
    }, target);

    // Mark as injectable (controllers need dependency injection)
    scanner.setMetadata(METADATA_KEYS.INJECTABLE, true, target);

    // Set controller scope (typically singleton)
    const scope = options.scope || 'singleton';
    scanner.setMetadata(
      `${METADATA_KEYS.INJECTABLE}:scope` as any,
      scope,
      target
    );
  };
}

/**
 * Utility function to check if a class is a controller.
 *
 * @param target - The class constructor to check
 * @returns True if the class is marked as a controller
 *
 * @example
 * ```typescript
 * if (isController(MyController)) {
 *   console.log('MyController is a controller');
 * }
 * ```
 */
export function isController(target: any): boolean {
  const scanner = new MetadataScanner();
  return scanner.scanClass(target).controller !== undefined;
}

/**
 * Get the controller configuration for a class.
 *
 * @param target - The class constructor to check
 * @returns The controller configuration or undefined
 *
 * @example
 * ```typescript
 * const config = getControllerConfig(MyController);
 * console.log(`Prefix: ${config?.prefix}`);
 * ```
 */
export function getControllerConfig(target: any): ControllerOptions | undefined {
  const scanner = new MetadataScanner();
  return scanner.scanClass(target).controller;
}

/**
 * Get the controller prefix for a class.
 *
 * @param target - The class constructor to check
 * @returns The controller prefix or empty string
 *
 * @example
 * ```typescript
 * const prefix = getControllerPrefix(MyController);
 * console.log(`Routes start with: ${prefix}`);
 * ```
 */
export function getControllerPrefix(target: any): string {
  const config = getControllerConfig(target);
  return config?.prefix || '';
}
