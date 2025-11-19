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

// ========================================
// BRANDED TYPES
// ========================================

export type {
  Brand,
  ServiceToken,
  RoutePath,
  HttpMethod,
  Port,
  UniqueId,
  Timestamp,
  VersionString,
  Email,
  Password,
  Url,
  UUID,
  SemVer,
  LogLevel,
  ConfigKey,
  FeatureFlag,
  EventName,
  CorrelationId,
  TransactionId,
  CacheKey,
  StrategyKey,
  FactoryKey,
} from './branded.js';

// ========================================
// RESULT TYPES
// ========================================

export type { Result } from './results.js';
export {
  isSuccess,
  isResultError,
  unwrapResult,
  unwrapError,
  ok,
  err,
  mapResult,
  mapError,
  chainResults,
  matchResult,
  tryCatch,
  tryCatchAsync,
  combineResults,
  firstSuccess,
} from './results.js';

// ========================================
// HTTP RESPONSE TYPES
// ========================================

export type { HttpResponse } from './http-responses.js';
export {
  isHttpSuccess,
  isHttpResponseError,
  isHttpRedirect,
  successResponse,
  errorResponse,
  redirectResponse,
  matchHttpResponse,
  isSuccessfulResponse,
  getStatusCode,
  isClientError,
  isServerError,
  ok as okResponse,
  created,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  internalServerError,
} from './http-responses.js';

// ========================================
// LIFECYCLE TYPES
// ========================================

export type { ApplicationState, LifecycleResult, LifecycleEvent, StartupHook, ShutdownHook, LifecycleConfig } from './lifecycle.js';
export {
  VALID_TRANSITIONS,
  isValidTransition,
  getUptime,
  isApplicationRunning,
  canAcceptRequests,
  getInitializationProgress,
} from './lifecycle.js';

// ========================================
// FRAMEWORK ERROR TYPES
// ========================================

export type { FrameworkError } from './errors.js';
export {
  isContainerError,
  isFrameworkHttpError,
  isStrategyError,
  isLifecycleError,
  dependencyNotFound,
  circularDependency,
  invalidToken,
  routeConflict,
  invalidMethod,
  middlewareError,
  strategyNotFound,
  invalidStrategy,
  startupFailed,
  shutdownFailed,
  getErrorCategory,
  isRecoverableError,
  getUserFriendlyMessage,
} from './errors.js';

// ========================================
// ROUTE TYPES
// ========================================

export type { RouteDefinition, RouteMetadata, RouteCollection, RouteConflict } from './route.js';
export {
  isValidRouteDefinition,
  isValidRoutePath,
  routesConflict,
  isSupportedHttpMethod,
  buildRouteCollection,
  RouteRegistry,
} from './route.js';

// ========================================
// MIDDLEWARE TYPES
// ========================================

export type { Middleware, HttpMiddleware, MiddlewareChain, AuthMiddleware, LoggingMiddleware, CorsMiddleware, RateLimitMiddleware, ValidationMiddleware } from './middleware.js';
export {
  composeMiddlewares,
  createMiddleware,
  createHttpMiddleware,
  sortMiddlewaresByPriority,
  validateMiddlewareChain,
  MiddlewareRegistry,
} from './middleware.js';

// ========================================
// ADAPTER TYPES
// ========================================

export type {
  HttpAdapter,
  HttpAdapterConfig,
  HttpsConfig,
  CorsConfig,
  ServerHealth,
  MemoryUsage,
  ResponseTimeMetrics,
  HttpRouteHandler,
  HttpAdapterFactory,
  FastifyAdapterFactory,
  ExpressAdapterFactory,
} from './adapter.js';
export {
  HttpAdapterRegistry,
  validateAdapterConfig,
  isAdapterCompatible,
} from './adapter.js';

// ========================================
// HANDLER TYPES
// ========================================

export type {
  HttpRequest,
  TypedRouteHandler,
  RestResourceHandler,
  GraphQLHandler,
  FileUploadHandler,
  StreamingHandler,
  MiddlewareEnabledHandler,
  File,
} from './handler.js';
export {
  createTypedHandler,
  withErrorHandling,
  isHandlerCompatible,
  createHandlerValidator,
  HandlerRegistry,
  createMiddlewareEnabledHandler,
} from './handler.js';

// ========================================
// UTILITY TYPES
// ========================================

export type {
  ExtractBodyType,
  ExtractParamsType,
  ExtractQueryType,
  ExtractReturnType,
} from './handler.js';

export type {
  RouteParams,
  ExtractRouteParams,
} from './route.js';

// ========================================
// MODULE SYSTEM TYPES
// ========================================

/**
 * Dynamic module definition for lazy-loaded modules
 */
export interface DynamicModule {
  readonly module: Function;
  readonly providers?: Provider[];
  readonly exports?: any[];
  readonly imports?: any[];
}

/**
 * Provider definition for dependency injection
 */
export interface Provider {
  readonly provide: string | symbol;
  readonly useFactory?: (...args: any[]) => any;
  readonly useClass?: Function;
  readonly useValue?: any;
  readonly inject?: (string | symbol)[];
}

/**
 * Constructor type for classes
 */
export type Constructor<T = any> = new (...args: any[]) => T;
