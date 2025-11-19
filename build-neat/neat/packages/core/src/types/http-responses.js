/**
 * Neat Framework - HTTP Response Types (Web Response Type Safety)
 *
 * This module provides discriminated unions for HTTP responses,
 * ensuring type-safe handling of different response types.
 *
 * Key TypeScript Excellence Features:
 * - Discriminated unions for HTTP status codes
 * - Exhaustive pattern matching for responses
 * - Type-safe response handling
 * - Compile-time guarantees for HTTP operations
 *
 * Runtime Behavior: Zero-overhead type safety for HTTP response handling.
 *
 * Pain Points Addressed: Eliminates unsafe response handling that plagues
 * web frameworks without proper typing.
 */
// ========================================
// TYPE GUARDS
// ========================================
/**
 * Type guard for successful HTTP responses.
 */
export function isHttpSuccess(response) {
    return response.status === 'success';
}
/**
 * Type guard for error HTTP responses.
 */
export function isHttpResponseError(response) {
    return response.status === 'error';
}
/**
 * Type guard for redirect HTTP responses.
 */
export function isHttpRedirect(response) {
    return response.status === 'redirect';
}
// ========================================
// RESPONSE CONSTRUCTORS
// ========================================
/**
 * Create a successful HTTP response.
 */
export function successResponse(data, statusCode = 200) {
    return { status: 'success', data, statusCode };
}
/**
 * Create an error HTTP response.
 */
export function errorResponse(error, statusCode = 500) {
    return { status: 'error', error, statusCode };
}
/**
 * Create a redirect HTTP response.
 */
export function redirectResponse(location, statusCode = 302) {
    return { status: 'redirect', location, statusCode };
}
// ========================================
// PATTERN MATCHING
// ========================================
/**
 * Exhaustive HTTP response handler.
 */
export function matchHttpResponse(response, onSuccess, onError, onRedirect) {
    switch (response.status) {
        case 'success':
            return onSuccess(response.data, response.statusCode);
        case 'error':
            return onError(response.error, response.statusCode);
        case 'redirect':
            return onRedirect(response.location, response.statusCode);
        default:
            // TypeScript will error here if we miss a case
            const _exhaustiveCheck = response;
            throw new Error(`Unhandled response status: ${_exhaustiveCheck}`);
    }
}
// ========================================
// RESPONSE UTILITIES
// ========================================
/**
 * Check if response indicates success.
 */
export function isSuccessfulResponse(response) {
    return response.status === 'success';
}
/**
 * Get status code from any response type.
 */
export function getStatusCode(response) {
    return response.statusCode;
}
/**
 * Check if response is a client error (4xx).
 */
export function isClientError(response) {
    return response.statusCode >= 400 && response.statusCode < 500;
}
/**
 * Check if response is a server error (5xx).
 */
export function isServerError(response) {
    return response.statusCode >= 500;
}
// ========================================
// COMMON RESPONSE HELPERS
// ========================================
/**
 * Create a 200 OK response.
 */
export function ok(data) {
    return successResponse(data, 200);
}
/**
 * Create a 201 Created response.
 */
export function created(data) {
    return successResponse(data, 201);
}
/**
 * Create a 400 Bad Request response.
 */
export function badRequest(error) {
    return errorResponse(error, 400);
}
/**
 * Create a 401 Unauthorized response.
 */
export function unauthorized(error = 'Unauthorized') {
    return errorResponse(error, 401);
}
/**
 * Create a 403 Forbidden response.
 */
export function forbidden(error = 'Forbidden') {
    return errorResponse(error, 403);
}
/**
 * Create a 404 Not Found response.
 */
export function notFound(error = 'Not Found') {
    return errorResponse(error, 404);
}
/**
 * Create a 500 Internal Server Error response.
 */
export function internalServerError(error = 'Internal Server Error') {
    return errorResponse(error, 500);
}
//# sourceMappingURL=http-responses.js.map