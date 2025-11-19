/**
 * NeatOrm - Transaction Module
 *
 * Provides robust transaction management with automatic commit/rollback,
 * nested transaction support via savepoints, and comprehensive error handling.
 *
 * Exported Components:
 * - TransactionManager: Core transaction management class
 * - TransactionContext: Transaction state and connection holder
 * - Transaction types: Isolation levels, options, results
 *
 * Key Features:
 * - Automatic commit on success
 * - Automatic rollback on error
 * - Nested transactions via savepoints
 * - Configurable isolation levels
 * - Transaction timeouts
 * - Type-safe transaction context
 *
 * Pain Points Solved:
 * ✅ Forgetting to commit/rollback
 * ✅ Manual transaction state management
 * ✅ Complex nested transaction handling
 * ✅ Connection leaks
 * ✅ Confusing transaction API
 */

// Export Transaction Manager
export * from './transaction-manager.js';
export {
  TransactionManager,
  type IsolationLevel,
  type TransactionOptions,
  type TransactionState,
  type TransactionContext,
  type TransactionCallback,
  type TransactionResult,
} from './transaction-manager.js';

