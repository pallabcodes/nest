/**
 * Hooks Module
 *
 * Provides entity lifecycle hooks functionality for executing custom logic
 * before and after database operations.
 *
 * @module hooks
 */

// Export hook decorators
export {
  BeforeInsert,
  AfterInsert,
  BeforeUpdate,
  AfterUpdate,
  BeforeDelete,
  AfterDelete,
  BeforeLoad,
  AfterLoad,
  registerHook,
  getEntityHooks,
  hasHooks,
  type HookType,
  type HookFunction,
  type HookContext,
  type HookMetadata,
  type EntityHooks,
} from '../decorators/hooks.decorator.js';

// Export hook executor
export {
  HookExecutor,
  globalHookExecutor,
  executeHooks,
  executeHooksForEntities,
  type HookExecutionResult,
  type HookExecutorConfig,
} from './hook-executor.js';
