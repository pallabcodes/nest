/**
 * Neat Framework - Pipe Decorators
 *
 * Decorators for applying pipes to route parameters and request data.
 * Pipes are auto-discovered and applied based on metadata.
 */

import 'reflect-metadata';
import type { PipeConfig } from './pipe.interface';

/**
 * Metadata keys for pipe reflection.
 */
export const PIPE_METADATA = Symbol('NEAT:PIPE');
export const PARAM_PIPE_METADATA = Symbol('NEAT:PARAM_PIPE');

/**
 * Mark a class as a pipe.
 * Pipes are auto-discovered and can be applied globally or to specific parameters.
 */
export function Pipe(config: PipeConfig) {
  return function (target: any) {
    Reflect.defineMetadata(PIPE_METADATA, config, target);

    // Mark as injectable for dependency injection
    Reflect.defineMetadata(Symbol('NEAT:INJECTABLE'), true, target);
  };
}

/**
 * Global pipe decorator.
 * Global pipes are applied to all parameters unless overridden.
 */
export function GlobalPipe() {
  return function (target: any) {
    Pipe({
      name: target.name || 'GlobalPipe',
      priority: 0,
      global: true
    })(target);
  };
}

/**
 * Apply pipes to method parameters.
 * Can transform and validate parameter values.
 */
export function UsePipes(...pipes: (any | string)[]) {
  return function (target: any, propertyKey: string, parameterIndex: number) {
    const existingPipes = Reflect.getMetadata(PARAM_PIPE_METADATA, target.constructor, propertyKey) || [];
    const paramPipes = [...existingPipes];

    paramPipes[parameterIndex] = pipes;

    Reflect.defineMetadata(PARAM_PIPE_METADATA, paramPipes, target.constructor, propertyKey);
  };
}

/**
 * Transform and validate request body.
 */
export function Body(pipes: (any | string)[] = []) {
  return function (target: any, propertyKey: string, parameterIndex: number) {
    const metadata = {
      type: 'body' as const,
      pipes,
      parameterIndex
    };

    const existing = Reflect.getMetadata(Symbol('NEAT:BODY_PARAM'), target.constructor, propertyKey) || [];
    existing[parameterIndex] = metadata;

    Reflect.defineMetadata(Symbol('NEAT:BODY_PARAM'), existing, target.constructor, propertyKey);
    UsePipes(...pipes)(target, propertyKey, parameterIndex);
  };
}

/**
 * Transform and validate query parameters.
 */
export function Query(param?: string, pipes: (any | string)[] = []) {
  return function (target: any, propertyKey: string, parameterIndex: number) {
    const metadata = {
      type: 'query' as const,
      param,
      pipes,
      parameterIndex
    };

    const existing = Reflect.getMetadata(Symbol('NEAT:QUERY_PARAM'), target.constructor, propertyKey) || [];
    existing[parameterIndex] = metadata;

    Reflect.defineMetadata(Symbol('NEAT:QUERY_PARAM'), existing, target.constructor, propertyKey);
    UsePipes(...pipes)(target, propertyKey, parameterIndex);
  };
}

/**
 * Transform and validate route parameters.
 */
export function Param(param?: string, pipes: (any | string)[] = []) {
  return function (target: any, propertyKey: string, parameterIndex: number) {
    const metadata = {
      type: 'param' as const,
      param,
      pipes,
      parameterIndex
    };

    const existing = Reflect.getMetadata(Symbol('NEAT:PARAM_PARAM'), target.constructor, propertyKey) || [];
    existing[parameterIndex] = metadata;

    Reflect.defineMetadata(Symbol('NEAT:PARAM_PARAM'), existing, target.constructor, propertyKey);
    UsePipes(...pipes)(target, propertyKey, parameterIndex);
  };
}

/**
 * Transform and validate headers.
 */
export function Headers(header?: string, pipes: (any | string)[] = []) {
  return function (target: any, propertyKey: string, parameterIndex: number) {
    const metadata = {
      type: 'header' as const,
      header,
      pipes,
      parameterIndex
    };

    const existing = Reflect.getMetadata(Symbol('NEAT:HEADER_PARAM'), target.constructor, propertyKey) || [];
    existing[parameterIndex] = metadata;

    Reflect.defineMetadata(Symbol('NEAT:HEADER_PARAM'), existing, target.constructor, propertyKey);
    UsePipes(...pipes)(target, propertyKey, parameterIndex);
  };
}

/**
 * Get pipe metadata from a class.
 */
export function getPipeMetadata(target: any): PipeConfig | undefined {
  return Reflect.getMetadata(PIPE_METADATA, target);
}

/**
 * Get parameter pipe metadata for a method.
 */
export function getParamPipeMetadata(target: any, propertyKey: string): any[] {
  return Reflect.getMetadata(PARAM_PIPE_METADATA, target.constructor, propertyKey) || [];
}

/**
 * Get body parameter metadata.
 */
export function getBodyParamMetadata(target: any, propertyKey: string): any[] {
  return Reflect.getMetadata(Symbol('NEAT:BODY_PARAM'), target.constructor, propertyKey) || [];
}

/**
 * Get query parameter metadata.
 */
export function getQueryParamMetadata(target: any, propertyKey: string): any[] {
  return Reflect.getMetadata(Symbol('NEAT:QUERY_PARAM'), target.constructor, propertyKey) || [];
}

/**
 * Get route parameter metadata.
 */
export function getRouteParamMetadata(target: any, propertyKey: string): any[] {
  return Reflect.getMetadata(Symbol('NEAT:PARAM_PARAM'), target.constructor, propertyKey) || [];
}

/**
 * Get header parameter metadata.
 */
export function getHeaderParamMetadata(target: any, propertyKey: string): any[] {
  return Reflect.getMetadata(Symbol('NEAT:HEADER_PARAM'), target.constructor, propertyKey) || [];
}
