/**
 * Neat Framework - Middleware Package
 *
 * Complete middleware ecosystem including:
 * - Guards (authorization)
 * - Pipes (validation/transformation)
 * - Interceptors (request/response processing)
 * - Exception Filters (error handling)
 *
 * All components support auto-discovery and zero-configuration setup.
 */

// Guards
export type { Guard, GuardResult, GuardContext, GuardMetadata } from './guards/guard.interface';
export { Guard as GuardDecorator } from './guards/guard.decorators';
export { GuardExecutor, createGuardExecutor, createGuardContext } from './guards/guard.executor';
export * from './guards/built-in-guards';

// Pipes
export type { Pipe, PipeResult, PipeMetadata, PipeConfig } from './pipes/pipe.interface';
export { Pipe as PipeDecorator, UsePipes, Body, Query, Param, Headers } from './pipes/pipe.decorators';
export { PipeExecutor, createPipeExecutor } from './pipes/pipe.executor';
export * from './pipes/built-in-pipes';
export * from './pipes/transformation-pipes';

// Interceptors
export type { Interceptor, InterceptorResult, InterceptorContext, CallHandler, InterceptorMetadata } from './interceptors/interceptor.interface';
export { Interceptor as InterceptorDecorator, UseInterceptors } from './interceptors/interceptor.decorators';
export { InterceptorExecutor, createInterceptorExecutor, createInterceptorContext } from './interceptors/interceptor.executor';
export * from './interceptors/built-in-interceptors';

// Exceptions
export type { ExceptionFilter, ExceptionFilterResult, ExceptionFilterContext, ExceptionFilterMetadata } from './exceptions/exception.interface';
export { ExceptionFilter as ExceptionFilterDecorator, Catch, UseExceptionFilters } from './exceptions/exception.decorators';
export { ExceptionFilterExecutor, createExceptionFilterExecutor, createExceptionFilterContext } from './exceptions/exception.executor';
export * from './exceptions/built-in-exceptions';
export * from './exceptions/built-in-filters';

// Execution Context
export type { ExecutionContext } from './interfaces/execution-context.interface';

// Middleware Registry - combines all systems
export { MiddlewareRegistry, createMiddlewareRegistry } from './middleware-registry';
