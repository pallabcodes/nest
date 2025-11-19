/**
 * Neat Framework - @Strategy Decorator
 *
 * The @Strategy decorator marks a class as a strategy implementation with a unique key.
 * This enables automatic discovery and registration for use with factory patterns.
 *
 * Key TypeScript Excellence Features:
 * - Generic strategy registration with compile-time key validation
 * - Automatic dependency injection integration
 * - Metadata-driven strategy discovery
 * - Type-safe strategy configuration
 *
 * Runtime Behavior: Attaches strategy metadata that enables automatic registration
 * and discovery by factory patterns at runtime.
 *
 * Framework Integration: Works seamlessly with @FactoryPattern decorator and
 * dependency injection container for polymorphic behavior.
 *
 * Pain Points Addressed: Eliminates manual strategy registration and provides
 * type-safe configuration for strategy implementations.
 */

import { MetadataScanner, METADATA_KEYS } from '../metadata/index.js';

/**
 * Strategy registration options.
 */
export interface StrategyOptions<TKey = string> {
  /**
   * Unique key for this strategy.
   */
  key: TKey;

  /**
   * Optional priority for strategy selection (higher = preferred).
   */
  priority?: number;

  /**
   * Whether this strategy is enabled by default.
   */
  enabled?: boolean;

  /**
   * Strategy-specific configuration.
   */
  config?: Record<string, unknown>;
}

/**
 * God-moded TypeScript: Strategy decorator factory.
 *
 * Marks a class as a strategy implementation and registers it with a unique key.
 * Enables automatic discovery and dynamic selection by factory patterns.
 *
 * @param options - Strategy registration options
 * @returns A class decorator that marks the class as a strategy
 *
 * @example
 * ```typescript
 * @Strategy({ key: 'credit_card', priority: 10 })
 * export class CreditCardPaymentStrategy implements PaymentStrategy {
 *   async process(payment: PaymentData): Promise<PaymentResult> {
 *     // Credit card payment logic
 *     return { success: true, amount: payment.amount };
 *   }
 * }
 *
 * @Strategy({ key: 'paypal', priority: 5 })
 * export class PayPalPaymentStrategy implements PaymentStrategy {
 *   async process(payment: PaymentData): Promise<PaymentResult> {
 *     // PayPal payment logic
 *     return { success: true, amount: payment.amount };
 *   }
 * }
 * ```
 */
export function Strategy<TKey = string>(
  options: StrategyOptions<TKey>
): ClassDecorator {
  return (target: any) => {
    const scanner = new MetadataScanner();

    // Attach strategy metadata
    scanner.setMetadata(METADATA_KEYS.STRATEGY_KEY, {
      key: options.key,
      priority: options.priority ?? 0,
      enabled: options.enabled ?? true,
      config: options.config,
    }, target);

    // Mark as injectable (strategies need DI)
    scanner.setMetadata(METADATA_KEYS.INJECTABLE, true, target);

    // Set strategy scope (typically singleton for reuse)
    scanner.setMetadata(
      `${METADATA_KEYS.INJECTABLE}:scope` as any,
      'singleton',
      target
    );

    Object.freeze(target);
  };
}

/**
 * Utility function to get strategy key from a strategy class.
 */
export function getStrategyKey(target: any): string | undefined {
  const scanner = new MetadataScanner();
  const metadata = scanner.getMetadata(METADATA_KEYS.STRATEGY_KEY, target) as any;
  return metadata?.key;
}

/**
 * Utility function to get strategy metadata.
 */
export function getStrategyMetadata(target: any): any {
  const scanner = new MetadataScanner();
  return scanner.getMetadata(METADATA_KEYS.STRATEGY_KEY, target);
}

/**
 * Utility function to check if a class is a strategy.
 */
export function isStrategy(target: any): boolean {
  const scanner = new MetadataScanner();
  const metadata = scanner.getMetadata(METADATA_KEYS.STRATEGY_KEY, target);
  return metadata !== undefined;
}
