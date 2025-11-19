/**
 * Neat Framework - Lifecycle Types (Application State Management)
 *
 * This module provides discriminated unions for application lifecycle states,
 * ensuring type-safe state transitions and event handling.
 *
 * Key TypeScript Excellence Features:
 * - Discriminated unions for application states
 * - Exhaustive pattern matching for state transitions
 * - Type-safe lifecycle event handling
 * - Compile-time guarantees for state management
 *
 * Runtime Behavior: Zero-overhead state management with type safety.
 *
 * Pain Points Addressed: Eliminates unsafe state management that can
 * lead to application crashes or inconsistent states.
 */
// ========================================
// TYPE GUARDS
// ========================================
/**
 * Type guard for initializing state.
 */
export function isInitializing(state) {
    return state.status === 'initializing';
}
/**
 * Type guard for ready state.
 */
export function isReady(state) {
    return state.status === 'ready';
}
/**
 * Type guard for running state.
 */
export function isRunning(state) {
    return state.status === 'running';
}
/**
 * Type guard for shutting down state.
 */
export function isShuttingDown(state) {
    return state.status === 'shutting-down';
}
/**
 * Type guard for shutdown state.
 */
export function isShutdown(state) {
    return state.status === 'shutdown';
}
// ========================================
// STATE TRANSITIONS
// ========================================
/**
 * Valid state transitions for the application lifecycle.
 */
export const VALID_TRANSITIONS = {
    initializing: ['ready', 'shutdown'],
    ready: ['running', 'shutdown'],
    running: ['shutting-down'],
    'shutting-down': ['shutdown'],
    shutdown: [],
};
/**
 * Check if a state transition is valid.
 */
export function isValidTransition(from, to) {
    const validTo = VALID_TRANSITIONS[from];
    return validTo.includes(to);
}
// ========================================
// LIFECYCLE UTILITIES
// ========================================
/**
 * Get current uptime from running state.
 */
export function getUptime(state) {
    if (isRunning(state)) {
        return state.uptime;
    }
    return null;
}
/**
 * Check if application is in a running state.
 */
export function isApplicationRunning(state) {
    return state.status === 'running' || state.status === 'ready';
}
/**
 * Check if application can accept requests.
 */
export function canAcceptRequests(state) {
    return state.status === 'running';
}
/**
 * Get initialization progress if available.
 */
export function getInitializationProgress(state) {
    if (isInitializing(state)) {
        return state.progress;
    }
    return null;
}
//# sourceMappingURL=lifecycle.js.map