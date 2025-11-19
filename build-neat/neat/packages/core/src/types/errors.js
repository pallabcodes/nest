/**
 * Neat Framework - Framework Error Types (Type-Safe Error Classification)
 *
 * This module provides discriminated unions for framework-specific errors,
 * ensuring type-safe error handling and classification.
 *
 * Key TypeScript Excellence Features:
 * - Discriminated unions for different error categories
 * - Exhaustive pattern matching for error handling
 * - Type-safe error classification and handling
 * - Compile-time guarantees for error scenarios
 *
 * Runtime Behavior: Zero-overhead error classification with type safety.
 *
 * Pain Points Addressed: Eliminates generic error handling that masks
 * underlying issues in framework operations.
 */
// ========================================
// TYPE GUARDS
// ========================================
/**
 * Type guard for container errors.
 */
export function isContainerError(error) {
    return error.type === 'container';
}
/**
 * Type guard for HTTP errors.
 */
export function isFrameworkHttpError(error) {
    return error.type === 'http';
}
/**
 * Type guard for strategy errors.
 */
export function isStrategyError(error) {
    return error.type === 'strategy';
}
/**
 * Type guard for lifecycle errors.
 */
export function isLifecycleError(error) {
    return error.type === 'lifecycle';
}
// ========================================
// ERROR CONSTRUCTORS
// ========================================
/**
 * Create a dependency not found error.
 */
export function dependencyNotFound(serviceName) {
    return {
        type: 'container',
        code: 'DEPENDENCY_NOT_FOUND',
        message: `Service '${serviceName}' not found in container`,
        serviceName,
    };
}
/**
 * Create a circular dependency error.
 */
export function circularDependency(serviceName) {
    return {
        type: 'container',
        code: 'CIRCULAR_DEPENDENCY',
        message: `Circular dependency detected involving '${serviceName}'`,
        serviceName,
    };
}
/**
 * Create an invalid token error.
 */
export function invalidToken(serviceName) {
    return {
        type: 'container',
        code: 'INVALID_TOKEN',
        message: `Invalid service token '${serviceName}'`,
        serviceName,
    };
}
/**
 * Create a route conflict error.
 */
export function routeConflict(route) {
    return {
        type: 'http',
        code: 'ROUTE_CONFLICT',
        message: `Route '${route}' is already registered`,
        route,
    };
}
/**
 * Create an invalid HTTP method error.
 */
export function invalidMethod(method, route) {
    return {
        type: 'http',
        code: 'INVALID_METHOD',
        message: `Invalid HTTP method '${method}' for route '${route}'`,
        route,
    };
}
/**
 * Create a middleware error.
 */
export function middlewareError(route, error) {
    return {
        type: 'http',
        code: 'MIDDLEWARE_ERROR',
        message: `Middleware error for route '${route}': ${error}`,
        route,
    };
}
/**
 * Create a strategy not found error.
 */
export function strategyNotFound(strategyKey) {
    return {
        type: 'strategy',
        code: 'STRATEGY_NOT_FOUND',
        message: `Strategy '${strategyKey}' not found`,
        strategyKey,
    };
}
/**
 * Create an invalid strategy error.
 */
export function invalidStrategy(strategyKey) {
    return {
        type: 'strategy',
        code: 'INVALID_STRATEGY',
        message: `Invalid strategy implementation for '${strategyKey}'`,
        strategyKey,
    };
}
/**
 * Create a startup failed error.
 */
export function startupFailed(phase, error) {
    return {
        type: 'lifecycle',
        code: 'STARTUP_FAILED',
        message: `Startup failed during '${phase}': ${error}`,
        phase,
    };
}
/**
 * Create a shutdown failed error.
 */
export function shutdownFailed(phase, error) {
    return {
        type: 'lifecycle',
        code: 'SHUTDOWN_FAILED',
        message: `Shutdown failed during '${phase}': ${error}`,
        phase,
    };
}
// ========================================
// ERROR HANDLING UTILITIES
// ========================================
/**
 * Get error category for logging purposes.
 */
export function getErrorCategory(error) {
    return error.type;
}
/**
 * Check if error is recoverable.
 */
export function isRecoverableError(error) {
    switch (error.type) {
        case 'container':
            return error.code !== 'CIRCULAR_DEPENDENCY';
        case 'http':
            return error.code !== 'ROUTE_CONFLICT';
        case 'strategy':
            return error.code === 'STRATEGY_NOT_FOUND';
        case 'lifecycle':
            return error.code !== 'STARTUP_FAILED';
        default:
            const _exhaustiveCheck = error;
            throw new Error(`Unhandled error type: ${_exhaustiveCheck}`);
    }
}
/**
 * Get user-friendly error message.
 */
export function getUserFriendlyMessage(error) {
    switch (error.type) {
        case 'container':
            switch (error.code) {
                case 'DEPENDENCY_NOT_FOUND':
                    return `Service '${error.serviceName}' is not available. Check your module imports.`;
                case 'CIRCULAR_DEPENDENCY':
                    return `Circular dependency detected. Review your service dependencies.`;
                case 'INVALID_TOKEN':
                    return `Invalid service token. Check your service registration.`;
            }
        case 'http':
            switch (error.code) {
                case 'ROUTE_CONFLICT':
                    return `Route '${error.route}' is already in use. Use a different path or method.`;
                case 'INVALID_METHOD':
                    return `Invalid HTTP method for route '${error.route}'.`;
                case 'MIDDLEWARE_ERROR':
                    return `Middleware error occurred. Check your middleware implementations.`;
            }
        case 'strategy':
            switch (error.code) {
                case 'STRATEGY_NOT_FOUND':
                    return `Strategy '${error.strategyKey}' not found. Register it first.`;
                case 'INVALID_STRATEGY':
                    return `Invalid strategy implementation. Check your strategy code.`;
                case 'STRATEGY_CONFLICT':
                    return `Strategy conflict detected. Multiple strategies with same key.`;
            }
        case 'lifecycle':
            switch (error.code) {
                case 'STARTUP_FAILED':
                    return `Application failed to start. Check logs for details.`;
                case 'SHUTDOWN_FAILED':
                    return `Application failed to shut down gracefully.`;
                case 'HOOK_TIMEOUT':
                    return `Lifecycle hook timed out. Check your hook implementations.`;
            }
        default:
            const _exhaustiveCheck = error;
            throw new Error(`Unhandled error type: ${_exhaustiveCheck}`);
    }
}
//# sourceMappingURL=errors.js.map