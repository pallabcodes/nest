/**
 * MongoDB Transaction Helper
 *
 * Utilities for managing MongoDB transactions with automatic commit/rollback.
 *
 * @module mongodb/transaction
 */

import type { ClientSession } from 'mongodb';
import type { MongoDBAdapter, MongoDBTransaction } from '../adapter/mongodb-adapter.js';

/**
 * Execute a function within a MongoDB transaction.
 * Automatically commits on success, rolls back on error.
 *
 * @param adapter - MongoDB adapter
 * @param callback - Function to execute in transaction
 * @returns Result of callback function
 *
 * @example
 * ```typescript
 * await withTransaction(adapter, async (session) => {
 *   await userRepo.create({ name: 'John' });
 *   await postRepo.create({ title: 'Hello World', userId: user._id });
 * });
 * ```
 */
export async function withTransaction<T>(
  adapter: MongoDBAdapter,
  callback: (session: ClientSession) => Promise<T>
): Promise<T> {
  const transaction = await adapter.beginTransaction();

  try {
    const session = transaction.getSession();
    const result = await callback(session);
    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * Execute multiple operations in a single transaction.
 *
 * @param adapter - MongoDB adapter
 * @param operations - Array of operations to execute
 * @returns Array of results
 *
 * @example
 * ```typescript
 * const [user, post] = await transactional(adapter, [
 *   () => userRepo.create({ name: 'John' }),
 *   (user) => postRepo.create({ title: 'Hello', userId: user._id })
 * ]);
 * ```
 */
export async function transactional<T extends any[]>(
  adapter: MongoDBAdapter,
  operations: Array<(...args: any[]) => Promise<any>>
): Promise<T> {
  return withTransaction(adapter, async () => {
    const results: any[] = [];

    for (const operation of operations) {
      const result = await operation(...results);
      results.push(result);
    }

    return results as T;
  });
}

