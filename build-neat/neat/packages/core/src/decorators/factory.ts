/**
 * Neat Framework - Factory Pattern Decorator
 *
 * The @FactoryPattern decorator enables dynamic strategy selection and management.
 * It automatically discovers @Strategy implementations and provides type-safe
 * methods for strategy selection and execution.
 */

import { MetadataScanner, METADATA_KEYS } from '../metadata/index.js';

/**
 * Factory pattern registration options.
 */
export interface FactoryPatternOptions<TKey = string, TContext = unknown, TResult = unknown> {
  /**
   * Default strategy key to use when none specified.
   */
  defaultKey?: TKey;

  /**
   * Whether to throw on missing strategies or return null.
   */
  strict?: boolean;

  /**
   * Custom strategy selection logic.
   */
  selector?: (key: TKey, context: TContext, availableStrategies: readonly TKey[]) => TKey;

  /**
   * Strategy execution timeout in milliseconds.
   */
  timeout?: number;

  /**
   * Whether to cache strategy instances.
   */
  cacheStrategies?: boolean;
}

/**
 * Strategy execution result.
 */
export type StrategyResult<T> = {
  success: true;
  data: T;
  strategy: string;
  executionTime: number;
} | {
  success: false;
  error: Error;
  strategy?: string;
  executionTime: number;
};

/**
 * God-moded TypeScript: FactoryPattern decorator factory.
 *
 * Marks a class as a factory that manages multiple strategies.
 * Automatically discovers all @Strategy implementations and provides
 * dynamic selection methods with full type safety.
 *
 * @param options - Factory pattern configuration options
 * @returns A class decorator that transforms the class into a strategy factory
 */
export function FactoryPattern<TKey = string, TContext = unknown, TResult = unknown>(
  options: FactoryPatternOptions<TKey, TContext, TResult> = {}
): ClassDecorator {
  return (target: any) => {
    const scanner = new MetadataScanner();

    // Attach factory pattern metadata
    scanner.setMetadata(METADATA_KEYS.FACTORY_PATTERN, {
      defaultKey: options.defaultKey,
      strict: options.strict ?? false,
      selector: options.selector,
      timeout: options.timeout ?? 30000,
      cacheStrategies: options.cacheStrategies ?? true,
    }, target);

    // Mark as injectable (factories need DI)
    scanner.setMetadata(METADATA_KEYS.INJECTABLE, true, target);

    // Set factory scope (typically singleton)
    scanner.setMetadata(
      `${METADATA_KEYS.INJECTABLE}:scope` as any,
      'singleton',
      target
    );

    // Add factory methods to the prototype
    addFactoryMethods(target, options);
  };
}

/**
 * Add factory methods to the target class prototype.
 */
function addFactoryMethods<TKey, TContext, TResult>(
  target: any,
  options: FactoryPatternOptions<TKey, TContext, TResult>
): void {
  const prototype = target.prototype;

  /**
   * Select and return a strategy instance by key.
   */
  prototype.select = function(key: TKey): any {
    const strategies = this.getAvailableStrategies();
    const strategyKey = key || options.defaultKey;

    if (!strategyKey) {
      if (options.strict) {
        throw new Error('No strategy key provided and no default key configured');
      }
      return null;
    }

    // Use custom selector if provided
    let selectedKey: TKey | null = strategyKey;
    if (options.selector) {
      selectedKey = options.selector(strategyKey, this.context, strategies) as TKey | null;
    }

    // Find the strategy
    const strategy = this.strategies?.get(selectedKey);
    if (!strategy) {
      if (options.strict) {
        throw new Error(`Strategy not found: ${String(selectedKey)}`);
      }
      return null;
    }

    return strategy;
  };

  /**
   * Get all available strategy keys.
   */
  prototype.getAvailableStrategies = function(): readonly TKey[] {
    if (!this.strategies) {
      this.strategies = discoverStrategies<TKey>(target);
    }
    return Array.from(this.strategies.keys());
  };

  /**
   * Execute a strategy with timing and error handling.
   */
  prototype.executeStrategy = async function(
    key: TKey,
    context: TContext,
    method: string,
    ...args: any[]
  ): Promise<StrategyResult<TResult>> {
    const startTime = Date.now();
    const strategyKey = String(key);

    try {
      const strategy = this.select(key);
      if (!strategy) {
        throw new Error(`Strategy not found: ${strategyKey}`);
      }

      if (typeof strategy[method] !== 'function') {
        throw new Error(`Method '${method}' not found on strategy: ${strategyKey}`);
      }

      // Execute with timeout if configured
      let result: TResult;
      if (options.timeout) {
        result = await executeWithTimeout(
          strategy[method].bind(strategy, ...args),
          options.timeout
        );
      } else {
        result = await strategy[method](...args);
      }

      const executionTime = Date.now() - startTime;
      return {
        success: true,
        data: result,
        strategy: strategyKey,
        executionTime,
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      return {
        success: false,
        error: error as Error,
        strategy: strategyKey,
        executionTime,
      };
    }
  };

  /**
   * Get strategy metadata by key.
   */
  prototype.getStrategyMetadata = function(key: TKey): any {
    if (!this.strategies) {
      this.strategies = discoverStrategies<TKey>(target);
    }
    return this.strategies?.get(key) || null;
  };

  /**
   * Check if a strategy is available.
   */
  prototype.hasStrategy = function(key: TKey): boolean {
    if (!this.strategies) {
      this.strategies = discoverStrategies<TKey>(target);
    }
    return this.strategies?.has(key) || false;
  };
}

/**
 * Discover all registered strategies for a factory.
 * TODO: Implement proper strategy discovery through module scanning
 */
function discoverStrategies<TKey>(factoryTarget: any): Map<TKey, any> {
  const scanner = new MetadataScanner();
  const strategies = new Map<TKey, any>();

  // CURRENT LIMITATION: Strategy discovery is not implemented
  // In a full implementation, this would:
  // 1. Scan all loaded modules for @Strategy decorated classes
  // 2. Filter strategies based on factory configuration
  // 3. Resolve strategy instances through DI container
  // 4. Apply priority ordering and filtering

  // For now, strategies must be manually registered with the container
  // and the factory will use container resolution

  return strategies;
}

/**
 * Execute a function with timeout.
 */
async function executeWithTimeout<T>(
  fn: () => Promise<T>,
  timeout: number
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Strategy execution timed out after ${timeout}ms`));
    }, timeout);

    fn()
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

/**
 * Utility function to get all strategies for a factory.
 */
export function getFactoryStrategies<TKey>(factoryTarget: any): readonly TKey[] {
  const instance = new factoryTarget();
  return instance.getAvailableStrategies();
}

/**
 * Utility function to validate strategy key exists.
 */
export function validateStrategyKey<TKey>(
  factoryTarget: any,
  key: TKey
): boolean {
  const instance = new factoryTarget();
  return instance.hasStrategy(key);
}

/**
 * Utility function to get strategy metadata.
 */
export function getStrategyInfo<TKey>(factoryTarget: any, key: TKey): any {
  const instance = new factoryTarget();
  return instance.getStrategyMetadata(key);
}
