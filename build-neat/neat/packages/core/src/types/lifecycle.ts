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
// APPLICATION LIFECYCLE STATES
// ========================================

/**
 * Application lifecycle states with discriminated unions.
 * Ensures all possible application states are handled exhaustively.
 */
export type ApplicationState =
  | { readonly status: 'initializing'; readonly progress: number }
  | { readonly status: 'ready'; readonly startupTime: number }
  | { readonly status: 'running'; readonly uptime: number }
  | { readonly status: 'shutting-down'; readonly reason?: string }
  | { readonly status: 'shutdown'; readonly exitCode: number };

// ========================================
// TYPE GUARDS
// ========================================

/**
 * Type guard for initializing state.
 */
export function isInitializing(state: ApplicationState): state is { readonly status: 'initializing'; readonly progress: number } {
  return state.status === 'initializing';
}

/**
 * Type guard for ready state.
 */
export function isReady(state: ApplicationState): state is { readonly status: 'ready'; readonly startupTime: number } {
  return state.status === 'ready';
}

/**
 * Type guard for running state.
 */
export function isRunning(state: ApplicationState): state is { readonly status: 'running'; readonly uptime: number } {
  return state.status === 'running';
}

/**
 * Type guard for shutting down state.
 */
export function isShuttingDown(state: ApplicationState): state is { readonly status: 'shutting-down'; readonly reason?: string } {
  return state.status === 'shutting-down';
}

/**
 * Type guard for shutdown state.
 */
export function isShutdown(state: ApplicationState): state is { readonly status: 'shutdown'; readonly exitCode: number } {
  return state.status === 'shutdown';
}

// ========================================
// LIFECYCLE RESULT TYPES
// ========================================

/**
 * Result of lifecycle operations (startup, shutdown, etc.)
 */
export type LifecycleResult<T = void> =
  | { readonly success: true; readonly data: T; readonly duration: number }
  | { readonly success: false; readonly error: Error; readonly phase: string };

// ========================================
// LIFECYCLE EVENT TYPES
// ========================================

/**
 * Lifecycle events that can be emitted during application lifecycle.
 */
export type LifecycleEvent =
  | { readonly type: 'startup-started'; readonly timestamp: number }
  | { readonly type: 'module-discovered'; readonly moduleName: string; readonly timestamp: number }
  | { readonly type: 'dependency-injected'; readonly serviceName: string; readonly timestamp: number }
  | { readonly type: 'routes-registered'; readonly routeCount: number; readonly timestamp: number }
  | { readonly type: 'startup-completed'; readonly duration: number; readonly timestamp: number }
  | { readonly type: 'shutdown-started'; readonly reason?: string; readonly timestamp: number }
  | { readonly type: 'shutdown-completed'; readonly exitCode: number; readonly timestamp: number };

// ========================================
// STATE TRANSITIONS
// ========================================

/**
 * Valid state transitions for the application lifecycle.
 */
export const VALID_TRANSITIONS = {
  initializing: ['ready', 'shutdown'] as const,
  ready: ['running', 'shutdown'] as const,
  running: ['shutting-down'] as const,
  'shutting-down': ['shutdown'] as const,
  shutdown: [] as const,
} as const;

/**
 * Check if a state transition is valid.
 */
export function isValidTransition(from: ApplicationState['status'], to: ApplicationState['status']): boolean {
  const validTo = VALID_TRANSITIONS[from];
  return (validTo as readonly ApplicationState['status'][]).includes(to);
}

// ========================================
// LIFECYCLE UTILITIES
// ========================================

/**
 * Get current uptime from running state.
 */
export function getUptime(state: ApplicationState): number | null {
  if (isRunning(state)) {
    return state.uptime;
  }
  return null;
}

/**
 * Check if application is in a running state.
 */
export function isApplicationRunning(state: ApplicationState): boolean {
  return state.status === 'running' || state.status === 'ready';
}

/**
 * Check if application can accept requests.
 */
export function canAcceptRequests(state: ApplicationState): boolean {
  return state.status === 'running';
}

/**
 * Get initialization progress if available.
 */
export function getInitializationProgress(state: ApplicationState): number | null {
  if (isInitializing(state)) {
    return state.progress;
  }
  return null;
}

// ========================================
// LIFECYCLE HOOKS
// ========================================

/**
 * Hook called during application startup.
 */
export interface StartupHook {
  readonly name: string;
  readonly order: number;
  execute(): Promise<void> | void;
}

/**
 * Hook called during application shutdown.
 */
export interface ShutdownHook {
  readonly name: string;
  readonly order: number;
  execute(): Promise<void> | void;
}

/**
 * Lifecycle manager configuration.
 */
export interface LifecycleConfig {
  readonly startupTimeout: number;
  readonly shutdownTimeout: number;
  readonly startupHooks: readonly StartupHook[];
  readonly shutdownHooks: readonly ShutdownHook[];
}