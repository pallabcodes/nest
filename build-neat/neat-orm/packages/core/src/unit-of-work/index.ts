/**
 * Unit of Work Module
 *
 * Implements the Unit of Work pattern for managing entity lifecycle
 * and coordinating database operations.
 *
 * @module unit-of-work
 */

// Export Identity Map
export { IdentityMap } from './identity-map.js';

// Export Change Tracker
export { ChangeTracker, EntityState } from './change-tracker.js';
export type { EntityChange } from './change-tracker.js';

// Export Unit of Work
export { UnitOfWork } from './unit-of-work.js';
export type { UnitOfWorkOptions } from './unit-of-work.js';

// Export Optimistic Lock
export {
  OptimisticLockManager,
  OptimisticLockError,
} from './optimistic-lock.js';
export type { VersionMetadata } from './optimistic-lock.js';

