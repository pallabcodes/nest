/**
 * Neat Framework - Exception Filter Decorators
 *
 * Decorators for marking classes as exception filters.
 * Exception filters are auto-discovered and applied based on exception types.
 */

import 'reflect-metadata';
import type { ExceptionFilterMetadata } from './exception.interface';

/**
 * Metadata keys for exception filter reflection.
 */
export const EXCEPTION_FILTER_METADATA = Symbol('NEAT:EXCEPTION_FILTER');
export const EXCEPTION_FILTER_GLOBAL_METADATA = Symbol('NEAT:EXCEPTION_FILTER_GLOBAL');
export const EXCEPTION_FILTER_ROUTE_METADATA = Symbol('NEAT:EXCEPTION_FILTER_ROUTE');

/**
 * Mark a class as an exception filter.
 * Exception filters are auto-discovered and can handle specific exception types.
 */
export function ExceptionFilter(metadata: ExceptionFilterMetadata) {
  return function (target: any) {
    Reflect.defineMetadata(EXCEPTION_FILTER_METADATA, metadata, target);

    // Mark as injectable for dependency injection
    Reflect.defineMetadata(Symbol('NEAT:INJECTABLE'), true, target);
  };
}

/**
 * Mark a class as a global exception filter.
 * Global exception filters handle all uncaught exceptions.
 */
export function GlobalExceptionFilter() {
  return function (target: any) {
    Reflect.defineMetadata(EXCEPTION_FILTER_GLOBAL_METADATA, true, target);

    // Apply exception filter decorator with global settings
    ExceptionFilter({
      name: target.name || 'GlobalExceptionFilter',
      priority: 0,
      global: true
    })(target);
  };
}

/**
 * Apply exception filters to a specific route or controller.
 */
export function UseExceptionFilters(...filters: (any | string)[]) {
  return function (target: any, propertyKey?: string) {
    const metadata = {
      filters,
      target: propertyKey ? 'method' : 'class'
    };

    if (propertyKey) {
      // Method-level exception filter
      Reflect.defineMetadata(EXCEPTION_FILTER_ROUTE_METADATA, metadata, target.constructor, propertyKey);
    } else {
      // Class-level exception filter
      Reflect.defineMetadata(EXCEPTION_FILTER_ROUTE_METADATA, metadata, target);
    }
  };
}

/**
 * Catch specific exception types.
 */
export function Catch(...exceptionTypes: string[]) {
  return function (target: any) {
    ExceptionFilter({
      name: target.name || 'ExceptionFilter',
      priority: 10,
      global: false,
      exceptionTypes
    })(target);
  };
}

/**
 * Get exception filter metadata from a class.
 */
export function getExceptionFilterMetadata(target: any): ExceptionFilterMetadata | undefined {
  return Reflect.getMetadata(EXCEPTION_FILTER_METADATA, target);
}

/**
 * Get route exception filter metadata.
 */
export function getRouteExceptionFilterMetadata(target: any, propertyKey?: string): any {
  if (propertyKey) {
    return Reflect.getMetadata(EXCEPTION_FILTER_ROUTE_METADATA, target.constructor, propertyKey) ||
           Reflect.getMetadata(EXCEPTION_FILTER_ROUTE_METADATA, target);
  }
  return Reflect.getMetadata(EXCEPTION_FILTER_ROUTE_METADATA, target);
}
