/**
 * Hook Executor
 *
 * Executes entity lifecycle hooks in the correct order with proper error handling.
 * Supports both synchronous and asynchronous hooks with transaction integration.
 *
 * @module hooks/hook-executor
 */

import {
  HookType,
  HookFunction,
  HookContext,
  HookMetadata,
  EntityHooks,
  getEntityHooks,
  hasHooks,
} from '../decorators/hooks.decorator.js';

/**
 * Hook execution result.
 */
export interface HookExecutionResult {
  /**
   * Whether the hook execution was successful.
   */
  success: boolean;

  /**
   * Execution time in milliseconds.
   */
  executionTime: number;

  /**
   * Error if execution failed.
   */
  error?: Error;

  /**
   * Hook that was executed.
   */
  hook: HookMetadata;

  /**
   * Hook type that was executed.
   */
  hookType: HookType;
}

/**
 * Hook executor configuration.
 */
export interface HookExecutorConfig {
  /**
   * Whether to continue executing hooks if one fails.
   */
  continueOnError?: boolean;

  /**
   * Timeout for hook execution in milliseconds.
   */
  timeout?: number;

  /**
   * Whether to log hook execution.
   */
  logging?: boolean;

  /**
   * Custom logger function.
   */
  logger?: (message: string, ...args: any[]) => void;
}

/**
 * Hook Executor
 *
 * Manages the execution of entity lifecycle hooks with proper error handling,
 * transaction support, and performance monitoring.
 */
export class HookExecutor {
  private config: Required<HookExecutorConfig>;

  constructor(config: HookExecutorConfig = {}) {
    this.config = {
      continueOnError: false,
      timeout: 30000, // 30 seconds
      logging: false,
      logger: console.log,
      ...config,
    };
  }

  /**
   * Execute hooks of a specific type for an entity.
   *
   * @param hookType - Type of hooks to execute
   * @param entity - Entity instance
   * @param context - Hook execution context
   * @returns Array of hook execution results
   */
  async executeHooks<T>(
    hookType: HookType,
    entity: T,
    context: HookContext = {}
  ): Promise<HookExecutionResult[]> {
    const entityClass = entity.constructor as new () => T;
    const hooks = getEntityHooks(entityClass);

    if (!hooks[hookType] || hooks[hookType].length === 0) {
      return [];
    }

    const results: HookExecutionResult[] = [];
    const fullContext = { ...context, operation: this.getOperationFromHookType(hookType) };

    for (const hook of hooks[hookType]) {
      const result = await this.executeSingleHook(hook, entity, fullContext, hookType);
      results.push(result);

      if (!result.success && !this.config.continueOnError) {
        break;
      }
    }

    return results;
  }

  /**
   * Execute a single hook with timeout and error handling.
   *
   * @private
   */
  private async executeSingleHook<T>(
    hook: HookMetadata,
    entity: T,
    context: HookContext,
    hookType: HookType
  ): Promise<HookExecutionResult> {
    const startTime = Date.now();

    try {
      if (this.config.logging) {
        this.config.logger(`Executing ${hookType} hook: ${hook.handler}`, {
          entity: entity.constructor.name,
          priority: hook.priority,
        });
      }

      // Get the hook function
      const hookFunction = this.getHookFunction(hook, entity);

      if (!hookFunction) {
        throw new Error(`Hook function ${hook.handler} not found`);
      }

      // Execute with timeout
      const executionPromise = hookFunction(entity, context);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Hook execution timeout: ${this.config.timeout}ms`)), this.config.timeout);
      });

      await Promise.race([executionPromise, timeoutPromise]);

      const executionTime = Date.now() - startTime;

      if (this.config.logging) {
        this.config.logger(`Hook ${hookType}:${hook.handler} completed in ${executionTime}ms`);
      }

      return {
        success: true,
        executionTime,
        hook,
        hookType,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const hookError = error instanceof Error ? error : new Error(String(error));

      if (this.config.logging) {
        this.config.logger(`Hook ${hookType}:${hook.handler} failed in ${executionTime}ms`, hookError);
      }

      return {
        success: false,
        executionTime,
        error: hookError,
        hook,
        hookType,
      };
    }
  }

  /**
   * Get the hook function from the entity or metadata.
   *
   * @private
   */
  private getHookFunction<T>(hook: HookMetadata, entity: T): HookFunction<T> | null {
    // If handler is a function, use it directly
    if (typeof hook.handler === 'function') {
      return hook.handler;
    }

    // If handler is a string, get the method from the entity
    if (typeof hook.handler === 'string') {
      const method = (entity as any)[hook.handler];
      if (typeof method === 'function') {
        return method.bind(entity);
      }
    }

    return null;
  }

  /**
   * Map hook type to operation type.
   *
   * @private
   */
  private getOperationFromHookType(hookType: HookType): 'insert' | 'update' | 'delete' | 'load' {
    switch (hookType) {
      case 'beforeInsert':
      case 'afterInsert':
        return 'insert';
      case 'beforeUpdate':
      case 'afterUpdate':
        return 'update';
      case 'beforeDelete':
      case 'afterDelete':
        return 'delete';
      case 'beforeLoad':
      case 'afterLoad':
        return 'load';
      default:
        return 'load';
    }
  }

  /**
   * Execute hooks for multiple entities.
   *
   * @param hookType - Type of hooks to execute
   * @param entities - Array of entities
   * @param context - Hook execution context
   * @returns Array of hook execution result arrays
   */
  async executeHooksForEntities<T>(
    hookType: HookType,
    entities: T[],
    context: HookContext = {}
  ): Promise<HookExecutionResult[][]> {
    const results: HookExecutionResult[][] = [];

    for (const entity of entities) {
      const entityResults = await this.executeHooks(hookType, entity, context);
      results.push(entityResults);
    }

    return results;
  }

  /**
   * Check if an entity class has hooks of a specific type.
   *
   * @param entityClass - The entity class
   * @param hookType - Optional specific hook type
   * @returns True if hooks exist
   */
  hasHooks(entityClass: new () => unknown, hookType?: HookType): boolean {
    return hasHooks(entityClass, hookType);
  }

  /**
   * Get execution statistics for recent hook executions.
   *
   * @returns Hook execution statistics
   */
  getExecutionStats(): {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
    totalExecutionTime: number;
  } {
    // This would track execution stats in a real implementation
    return {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
      totalExecutionTime: 0,
    };
  }

  /**
   * Update executor configuration.
   *
   * @param config - New configuration
   */
  updateConfig(config: Partial<HookExecutorConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * Global hook executor instance.
 */
export const globalHookExecutor = new HookExecutor({
  logging: typeof process !== 'undefined' && process.env?.NODE_ENV === 'development',
  continueOnError: false,
  timeout: 30000,
});

/**
 * Execute hooks using the global executor.
 *
 * @param hookType - Type of hooks to execute
 * @param entity - Entity instance
 * @param context - Hook execution context
 * @returns Hook execution results
 */
export async function executeHooks<T>(
  hookType: HookType,
  entity: T,
  context: HookContext = {}
): Promise<HookExecutionResult[]> {
  return globalHookExecutor.executeHooks(hookType, entity, context);
}

/**
 * Execute hooks for multiple entities using the global executor.
 *
 * @param hookType - Type of hooks to execute
 * @param entities - Array of entities
 * @param context - Hook execution context
 * @returns Array of hook execution result arrays
 */
export async function executeHooksForEntities<T>(
  hookType: HookType,
  entities: T[],
  context: HookContext = {}
): Promise<HookExecutionResult[][]> {
  return globalHookExecutor.executeHooksForEntities(hookType, entities, context);
}
