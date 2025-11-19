/**
 * Neat Framework - Interceptor Decorators
 *
 * Decorators for marking classes and methods as interceptors.
 * Interceptors are auto-discovered and applied based on metadata.
 */

import 'reflect-metadata';
import type { InterceptorMetadata } from './interceptor.interface';

/**
 * Metadata keys for interceptor reflection.
 */
export const INTERCEPTOR_METADATA = Symbol('NEAT:INTERCEPTOR');
export const INTERCEPTOR_GLOBAL_METADATA = Symbol('NEAT:INTERCEPTOR_GLOBAL');
export const INTERCEPTOR_ROUTE_METADATA = Symbol('NEAT:INTERCEPTOR_ROUTE');

/**
 * Mark a class as an interceptor.
 * Interceptors are auto-discovered and can be applied globally or to specific routes.
 */
export function Interceptor(metadata: InterceptorMetadata) {
  return function (target: any) {
    Reflect.defineMetadata(INTERCEPTOR_METADATA, metadata, target);

    // Mark as injectable for dependency injection
    Reflect.defineMetadata(Symbol('NEAT:INJECTABLE'), true, target);
  };
}

/**
 * Mark a class as a global interceptor.
 * Global interceptors are applied to all routes unless explicitly excluded.
 */
export function GlobalInterceptor() {
  return function (target: any) {
    Reflect.defineMetadata(INTERCEPTOR_GLOBAL_METADATA, true, target);

    // Apply interceptor decorator with global settings
    Interceptor({
      name: target.name || 'GlobalInterceptor',
      priority: 0,
      global: true
    })(target);
  };
}

/**
 * Apply interceptors to a specific route or controller.
 * Can be used on controllers or individual route methods.
 */
export function UseInterceptors(...interceptors: (any | string)[]) {
  return function (target: any, propertyKey?: string) {
    const metadata = {
      interceptors,
      target: propertyKey ? 'method' : 'class'
    };

    if (propertyKey) {
      // Method-level interceptor
      Reflect.defineMetadata(INTERCEPTOR_ROUTE_METADATA, metadata, target.constructor, propertyKey);
    } else {
      // Class-level interceptor
      Reflect.defineMetadata(INTERCEPTOR_ROUTE_METADATA, metadata, target);
    }
  };
}

/**
 * Get interceptor metadata from a class.
 */
export function getInterceptorMetadata(target: any): InterceptorMetadata | undefined {
  return Reflect.getMetadata(INTERCEPTOR_METADATA, target);
}

/**
 * Get route interceptor metadata.
 */
export function getRouteInterceptorMetadata(target: any, propertyKey?: string): any {
  if (propertyKey) {
    return Reflect.getMetadata(INTERCEPTOR_ROUTE_METADATA, target.constructor, propertyKey) ||
           Reflect.getMetadata(INTERCEPTOR_ROUTE_METADATA, target);
  }
  return Reflect.getMetadata(INTERCEPTOR_ROUTE_METADATA, target);
}
