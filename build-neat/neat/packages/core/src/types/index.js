/**
 * Neat Framework - Core Types Barrel Export
 *
 * This file re-exports all types from the modular type system.
 * Each module focuses on a specific domain for better maintainability.
 *
 * The type system is organized into focused modules:
 * - branded.ts: Nominal typing with branded types
 * - results.ts: Type-safe error handling with Result types
 * - http-responses.ts: HTTP response discriminated unions
 * - lifecycle.ts: Application lifecycle state management
 * - errors.ts: Framework error classification
 * - route.ts: Route definition and validation types
 * - middleware.ts: Middleware composition and types
 * - adapter.ts: HTTP adapter abstraction layer
 * - handler.ts: Route handler types and utilities
 */
export { isSuccess, isResultError, unwrapResult, unwrapError, ok, err, mapResult, mapError, chainResults, matchResult, tryCatch, tryCatchAsync, combineResults, firstSuccess, } from './results.js';
export { isHttpSuccess, isHttpResponseError, isHttpRedirect, successResponse, errorResponse, redirectResponse, matchHttpResponse, isSuccessfulResponse, getStatusCode, isClientError, isServerError, ok as okResponse, created, badRequest, unauthorized, forbidden, notFound, internalServerError, } from './http-responses.js';
export { VALID_TRANSITIONS, isValidTransition, getUptime, isApplicationRunning, canAcceptRequests, getInitializationProgress, } from './lifecycle.js';
export { isContainerError, isFrameworkHttpError, isStrategyError, isLifecycleError, dependencyNotFound, circularDependency, invalidToken, routeConflict, invalidMethod, middlewareError, strategyNotFound, invalidStrategy, startupFailed, shutdownFailed, getErrorCategory, isRecoverableError, getUserFriendlyMessage, } from './errors.js';
export { isValidRouteDefinition, isValidRoutePath, routesConflict, isSupportedHttpMethod, buildRouteCollection, RouteRegistry, } from './route.js';
export { composeMiddlewares, createMiddleware, createHttpMiddleware, sortMiddlewaresByPriority, validateMiddlewareChain, MiddlewareRegistry, } from './middleware.js';
export { HttpAdapterRegistry, validateAdapterConfig, isAdapterCompatible, } from './adapter.js';
export { createTypedHandler, withErrorHandling, isHandlerCompatible, createHandlerValidator, HandlerRegistry, createMiddlewareEnabledHandler, } from './handler.js';
//# sourceMappingURL=index.js.map