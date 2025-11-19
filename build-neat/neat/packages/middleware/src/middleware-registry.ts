/**
 * Neat Framework - Middleware Registry
 *
 * Unified registry that manages all middleware components:
 * - Guards
 * - Pipes
 * - Interceptors
 * - Exception Filters
 *
 * Provides auto-discovery, registration, and execution coordination.
 */

import { GuardExecutor } from './guards/guard.executor';
import { PipeExecutor } from './pipes/pipe.executor';
import { InterceptorExecutor } from './interceptors/interceptor.executor';
import { ExceptionFilterExecutor } from './exceptions/exception.executor';

import {
  getGuardMetadata,
  getRouteGuardMetadata,
  isPublicRoute
} from './guards/guard.decorators';

import {
  getPipeMetadata,
  getParamPipeMetadata,
  getBodyParamMetadata,
  getQueryParamMetadata,
  getRouteParamMetadata,
  getHeaderParamMetadata
} from './pipes/pipe.decorators';

import {
  getInterceptorMetadata,
  getRouteInterceptorMetadata
} from './interceptors/interceptor.decorators';

import {
  getExceptionFilterMetadata,
  getRouteExceptionFilterMetadata
} from './exceptions/exception.decorators';

/**
 * Middleware registry configuration.
 */
export interface MiddlewareRegistryConfig {
  readonly autoDiscover: boolean;
  readonly scanPaths: string[];
  readonly globalGuards: string[];
  readonly globalInterceptors: string[];
  readonly globalExceptionFilters: string[];
}

/**
 * Unified middleware registry.
 */
export class MiddlewareRegistry {
  private readonly guardExecutor = new GuardExecutor();
  private readonly pipeExecutor = new PipeExecutor();
  private readonly interceptorExecutor = new InterceptorExecutor();
  private readonly exceptionFilterExecutor = new ExceptionFilterExecutor();

  private readonly discoveredComponents = new Set<string>();

  constructor(private readonly config: MiddlewareRegistryConfig = {
    autoDiscover: true,
    scanPaths: ['src/**/*.ts', 'src/**/*.js'],
    globalGuards: [],
    globalInterceptors: [],
    globalExceptionFilters: []
  }) {}

  // ========================================
  // REGISTRATION METHODS
  // ========================================

  /**
   * Register a guard.
   */
  registerGuard(name: string, guard: any): void {
    this.guardExecutor.registerGuard(name, guard);
    const metadata = getGuardMetadata(guard);
    if (metadata) {
      this.exceptionFilterExecutor.registerFilter(name, guard as any, {
        exceptionTypes: undefined,
        priority: metadata.priority
      });
    }
  }

  /**
   * Register a pipe.
   */
  registerPipe(name: string, pipe: any): void {
    this.pipeExecutor.registerPipe(name, pipe);
  }

  /**
   * Register an interceptor.
   */
  registerInterceptor(name: string, interceptor: any): void {
    this.interceptorExecutor.registerInterceptor(name, interceptor);
  }

  /**
   * Register an exception filter.
   */
  registerExceptionFilter(name: string, filter: any): void {
    const metadata = getExceptionFilterMetadata(filter);
    this.exceptionFilterExecutor.registerFilter(name, filter, {
      exceptionTypes: metadata?.exceptionTypes,
      priority: metadata?.priority || 0
    });
  }

  /**
   * Register any middleware component (auto-detects type).
   */
  registerComponent(component: any): void {
    const name = component.name || component.constructor.name;

    if (getGuardMetadata(component)) {
      this.registerGuard(name, component);
    } else if (getPipeMetadata(component)) {
      this.registerPipe(name, component);
    } else if (getInterceptorMetadata(component)) {
      this.registerInterceptor(name, component);
    } else if (getExceptionFilterMetadata(component)) {
      this.registerExceptionFilter(name, component);
    }
  }

  // ========================================
  // AUTO-DISCOVERY
  // ========================================

  /**
   * Auto-discover middleware components from the filesystem.
   */
  async autoDiscover(): Promise<void> {
    if (!this.config.autoDiscover) return;

    // Import the scanner from core
    try {
      const { scanner } = await import('@neat/core');

      // Scan for guards
      const guards = await scanner.scanForGuards();
      guards.forEach(([name, guardClass]: [string, any]) => {
        if (!this.discoveredComponents.has(name)) {
          this.registerGuard(name, new guardClass());
          this.discoveredComponents.add(name);
        }
      });

      // Scan for pipes
      const pipes = await scanner.scanForPipes();
      pipes.forEach(([name, pipeClass]: [string, any]) => {
        if (!this.discoveredComponents.has(name)) {
          this.registerPipe(name, new pipeClass());
          this.discoveredComponents.add(name);
        }
      });

      // Scan for interceptors
      const interceptors = await scanner.scanForInterceptors();
      interceptors.forEach(([name, interceptorClass]: [string, any]) => {
        if (!this.discoveredComponents.has(name)) {
          this.registerInterceptor(name, new interceptorClass());
          this.discoveredComponents.add(name);
        }
      });

      // Scan for exception filters
      const filters = await scanner.scanForExceptionFilters();
      filters.forEach(([name, filterClass]: [string, any]) => {
        if (!this.discoveredComponents.has(name)) {
          this.registerExceptionFilter(name, new filterClass());
          this.discoveredComponents.add(name);
        }
      });

    } catch (error) {
      console.warn('Auto-discovery failed, middleware components may need manual registration:', error);
    }
  }

  // ========================================
  // EXECUTION METHODS
  // ========================================

  /**
   * Get guard executor.
   */
  getGuardExecutor(): GuardExecutor {
    return this.guardExecutor;
  }

  /**
   * Get pipe executor.
   */
  getPipeExecutor(): PipeExecutor {
    return this.pipeExecutor;
  }

  /**
   * Get interceptor executor.
   */
  getInterceptorExecutor(): InterceptorExecutor {
    return this.interceptorExecutor;
  }

  /**
   * Get exception filter executor.
   */
  getExceptionFilterExecutor(): ExceptionFilterExecutor {
    return this.exceptionFilterExecutor;
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * Get all registered component names.
   */
  getRegisteredComponents(): {
    guards: string[];
    pipes: string[];
    interceptors: string[];
    exceptionFilters: string[];
  } {
    return {
      guards: this.guardExecutor.getRegisteredGuards(),
      pipes: this.pipeExecutor.getRegisteredPipes(),
      interceptors: this.interceptorExecutor.getRegisteredInterceptors(),
      exceptionFilters: this.exceptionFilterExecutor.getRegisteredFilters()
    };
  }

  /**
   * Clear all registered components.
   */
  clear(): void {
    this.guardExecutor.clearGuards();
    this.pipeExecutor.clearPipes();
    this.interceptorExecutor.clearInterceptors();
    this.exceptionFilterExecutor.clearFilters();
    this.discoveredComponents.clear();
  }

  /**
   * Get middleware components for a specific route.
   */
  getMiddlewareForRoute(
    controller: any,
    methodName: string
  ): {
    guards: string[];
    pipes: any[][];
    interceptors: string[];
    exceptionFilters: string[];
  } {
    // Get guards
    const guardMetadata = getRouteGuardMetadata(controller, methodName);
    const guards = guardMetadata?.guards || this.config.globalGuards;

    // Get pipes
    const pipeMetadata = getParamPipeMetadata(controller, methodName);
    const pipes = pipeMetadata || [];

    // Get interceptors
    const interceptorMetadata = getRouteInterceptorMetadata(controller, methodName);
    const interceptors = interceptorMetadata?.interceptors || this.config.globalInterceptors;

    // Get exception filters
    const filterMetadata = getRouteExceptionFilterMetadata(controller, methodName);
    const exceptionFilters = filterMetadata?.filters || this.config.globalExceptionFilters;

    return {
      guards: Array.isArray(guards) ? guards : [guards].filter(Boolean),
      pipes,
      interceptors: Array.isArray(interceptors) ? interceptors : [interceptors].filter(Boolean),
      exceptionFilters: Array.isArray(exceptionFilters) ? exceptionFilters : [exceptionFilters].filter(Boolean)
    };
  }
}

/**
 * Create a middleware registry instance.
 */
export function createMiddlewareRegistry(config?: Partial<MiddlewareRegistryConfig>): MiddlewareRegistry {
  return new MiddlewareRegistry({
    autoDiscover: true,
    scanPaths: ['src/**/*.ts', 'src/**/*.js'],
    globalGuards: [],
    globalInterceptors: [],
    globalExceptionFilters: [],
    ...config
  });
}
