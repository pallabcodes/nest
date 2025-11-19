/**
 * Neat Framework - Pipe System
 *
 * Pipes transform input data and validate it before it reaches route handlers.
 * They are executed after guards but before the actual handler.
 *
 * Key Features:
 * - Data transformation (string to number, JSON parsing, etc.)
 * - Input validation with detailed error messages
 * - Auto-discovery integration
 * - Type-safe data transformation
 *
 * Usage: Pipes are applied via decorators and auto-discovered by the framework.
 */

/**
 * Pipe execution result.
 * Contains transformed value or validation errors.
 */
export interface PipeResult<T = any> {
  readonly success: boolean;
  readonly value?: T;
  readonly errors?: PipeError[];
}

/**
 * Pipe validation error.
 */
export interface PipeError {
  readonly field: string;
  readonly message: string;
  readonly value: any;
  readonly constraints?: Record<string, string>;
}

/**
 * Pipe interface.
 * Pipes can transform and validate data.
 */
export interface Pipe<TInput = any, TOutput = TInput> {
  transform(value: TInput, metadata: PipeMetadata): Promise<PipeResult<TOutput>>;
}

/**
 * Pipe function signature for functional pipes.
 */
export type PipeFunction<TInput = any, TOutput = TInput> = (
  value: TInput,
  metadata: PipeMetadata
) => Promise<PipeResult<TOutput>>;

/**
 * Pipe metadata for execution context.
 */
export interface PipeMetadata {
  readonly type: 'body' | 'query' | 'param' | 'header' | 'custom';
  readonly metatype?: any;
  readonly data?: any;
  readonly field?: string;
  readonly param?: string;
  readonly target: any;
  readonly propertyKey?: string;
}

/**
 * Pipe configuration for auto-discovery.
 */
export interface PipeConfig {
  readonly name: string;
  readonly priority: number;
  readonly global: boolean;
  readonly types?: ('body' | 'query' | 'param' | 'header' | 'custom')[];
}
