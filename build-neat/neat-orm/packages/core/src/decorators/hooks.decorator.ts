/**
 * Entity Lifecycle Hooks
 *
 * Decorators and utilities for entity lifecycle hooks that allow executing
 * custom logic before and after database operations.
 *
 * @module decorators/hooks
 */

import { metadataScanner } from '../metadata/scanner.js';
import { HOOK_METADATA_KEY, HOOKS_METADATA_KEY, getMetadata, setMetadata } from '../metadata/keys.js';

/**
 * Hook types for different lifecycle events.
 */
export type HookType =
  | 'beforeInsert'
  | 'afterInsert'
  | 'beforeUpdate'
  | 'afterUpdate'
  | 'beforeDelete'
  | 'afterDelete'
  | 'beforeLoad'
  | 'afterLoad';

/**
 * Hook function signature.
 */
export type HookFunction<T = any> = (
  entity: T,
  context?: HookContext
) => void | Promise<void>;

/**
 * Hook execution context.
 */
export interface HookContext {
  /**
   * The operation being performed.
   */
  operation?: 'insert' | 'update' | 'delete' | 'load';

  /**
   * The repository performing the operation.
   */
  repository?: any;

  /**
   * Transaction context if available.
   */
  transaction?: any;

  /**
   * Additional context data.
   */
  [key: string]: any;
}

/**
 * Hook metadata stored on entity properties.
 */
export interface HookMetadata {
  /**
   * The hook type.
   */
  type: HookType;

  /**
   * The hook function or method name.
   */
  handler: HookFunction | string;

  /**
   * Hook priority (lower numbers execute first).
   */
  priority: number;

  /**
   * Whether this hook should run only once per operation.
   */
  once?: boolean;
}

/**
 * Collection of hooks for an entity.
 */
export interface EntityHooks {
  beforeInsert: HookMetadata[];
  afterInsert: HookMetadata[];
  beforeUpdate: HookMetadata[];
  afterUpdate: HookMetadata[];
  beforeDelete: HookMetadata[];
  afterDelete: HookMetadata[];
  beforeLoad: HookMetadata[];
  afterLoad: HookMetadata[];
}

/**
 * Base hook decorator factory.
 *
 * @param hookType - The type of hook
 * @param priority - Hook execution priority
 * @returns Property decorator
 */
function createHookDecorator(
  hookType: HookType,
  priority: number = 0
): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    const hookMetadata: HookMetadata = {
      type: hookType,
      handler: propertyKey.toString(),
      priority,
    };

    // Store hook metadata
    const existingHooks = getMetadata<HookMetadata[]>(
      HOOK_METADATA_KEY,
      target.constructor,
      propertyKey
    ) || [];

    existingHooks.push(hookMetadata);
    existingHooks.sort((a: HookMetadata, b: HookMetadata) => a.priority - b.priority);

    setMetadata(
      HOOK_METADATA_KEY,
      existingHooks,
      target.constructor,
      propertyKey
    );

    // Also store in entity-level hooks collection
    const entityHooks = getMetadata<EntityHooks>(
      HOOKS_METADATA_KEY,
      target.constructor
    ) || {
      beforeInsert: [],
      afterInsert: [],
      beforeUpdate: [],
      afterUpdate: [],
      beforeDelete: [],
      afterDelete: [],
      beforeLoad: [],
      afterLoad: [],
    };

    entityHooks[hookType].push(hookMetadata);
    entityHooks[hookType].sort((a: HookMetadata, b: HookMetadata) => a.priority - b.priority);

    setMetadata(
      HOOKS_METADATA_KEY,
      entityHooks,
      target.constructor
    );
  };
}

/**
 * Before Insert Hook
 *
 * Executed before an entity is inserted into the database.
 *
 * @param priority - Hook execution priority (lower = higher priority)
 * @returns Property decorator
 *
 * @example
 * ```typescript
 * @Entity('users')
 * export class User {
 *   @BeforeInsert()
 *   async hashPassword() {
 *     this.password = await hash(this.password);
 *   }
 * }
 * ```
 */
export function BeforeInsert(priority: number = 0): PropertyDecorator {
  return createHookDecorator('beforeInsert', priority);
}

/**
 * After Insert Hook
 *
 * Executed after an entity is successfully inserted into the database.
 *
 * @param priority - Hook execution priority (lower = higher priority)
 * @returns Property decorator
 *
 * @example
 * ```typescript
 * @Entity('users')
 * export class User {
 *   @AfterInsert()
 *   async sendWelcomeEmail() {
 *     await emailService.sendWelcome(this.email);
 *   }
 * }
 * ```
 */
export function AfterInsert(priority: number = 0): PropertyDecorator {
  return createHookDecorator('afterInsert', priority);
}

/**
 * Before Update Hook
 *
 * Executed before an entity is updated in the database.
 *
 * @param priority - Hook execution priority (lower = higher priority)
 * @returns Property decorator
 *
 * @example
 * ```typescript
 * @Entity('users')
 * export class User {
 *   @BeforeUpdate()
 *   async validateEmailChange() {
 *     if (this.email !== this.originalEmail) {
 *       await this.validateEmailUniqueness();
 *     }
 *   }
 * }
 * ```
 */
export function BeforeUpdate(priority: number = 0): PropertyDecorator {
  return createHookDecorator('beforeUpdate', priority);
}

/**
 * After Update Hook
 *
 * Executed after an entity is successfully updated in the database.
 *
 * @param priority - Hook execution priority (lower = higher priority)
 * @returns Property decorator
 *
 * @example
 * ```typescript
 * @Entity('users')
 * export class User {
 *   @AfterUpdate()
 *   async logProfileUpdate() {
 *     await auditService.log('profile_updated', { userId: this.id });
 *   }
 * }
 * ```
 */
export function AfterUpdate(priority: number = 0): PropertyDecorator {
  return createHookDecorator('afterUpdate', priority);
}

/**
 * Before Delete Hook
 *
 * Executed before an entity is deleted from the database.
 *
 * @param priority - Hook execution priority (lower = higher priority)
 * @returns Property decorator
 *
 * @example
 * ```typescript
 * @Entity('users')
 * export class User {
 *   @BeforeDelete()
 *   async cleanupUserData() {
 *     await fileService.deleteUserFiles(this.id);
 *     await notificationService.cancelSubscriptions(this.id);
 *   }
 * }
 * ```
 */
export function BeforeDelete(priority: number = 0): PropertyDecorator {
  return createHookDecorator('beforeDelete', priority);
}

/**
 * After Delete Hook
 *
 * Executed after an entity is successfully deleted from the database.
 *
 * @param priority - Hook execution priority (lower = higher priority)
 * @returns Property decorator
 *
 * @example
 * ```typescript
 * @Entity('users')
 * export class User {
 *   @AfterDelete()
 *   async sendGoodbyeEmail() {
 *     await emailService.sendGoodbye(this.email);
 *   }
 * }
 * ```
 */
export function AfterDelete(priority: number = 0): PropertyDecorator {
  return createHookDecorator('afterDelete', priority);
}

/**
 * Before Load Hook
 *
 * Executed before an entity is loaded from the database.
 *
 * @param priority - Hook execution priority (lower = higher priority)
 * @returns Property decorator
 *
 * @example
 * ```typescript
 * @Entity('users')
 * export class User {
 *   @BeforeLoad()
 *   prepareForLoad() {
 *     // Prepare entity for loading
 *   }
 * }
 * ```
 */
export function BeforeLoad(priority: number = 0): PropertyDecorator {
  return createHookDecorator('beforeLoad', priority);
}

/**
 * After Load Hook
 *
 * Executed after an entity is loaded from the database.
 *
 * @param priority - Hook execution priority (lower = higher priority)
 * @returns Property decorator
 *
 * @example
 * ```typescript
 * @Entity('users')
 * export class User {
 *   @AfterLoad()
 *   formatDisplayData() {
 *     this.displayName = `${this.firstName} ${this.lastName}`;
 *   }
 * }
 * ```
 */
export function AfterLoad(priority: number = 0): PropertyDecorator {
  return createHookDecorator('afterLoad', priority);
}

/**
 * Register a hook function directly (alternative to decorators).
 *
 * @param entityClass - The entity class
 * @param hookType - Type of hook
 * @param handler - Hook function or method name
 * @param priority - Hook priority
 *
 * @example
 * ```typescript
 * registerHook(User, 'beforeInsert', async (user) => {
 *   user.createdAt = new Date();
 * });
 * ```
 */
export function registerHook<T>(
  entityClass: new () => T,
  hookType: HookType,
  handler: HookFunction<T> | string,
  priority: number = 0
): void {
  const hookMetadata: HookMetadata = {
    type: hookType,
    handler,
    priority,
  };

  // Get existing entity hooks
  const entityHooks = getMetadata<EntityHooks>(
    HOOKS_METADATA_KEY,
    entityClass
  ) || {
    beforeInsert: [],
    afterInsert: [],
    beforeUpdate: [],
    afterUpdate: [],
    beforeDelete: [],
    afterDelete: [],
    beforeLoad: [],
    afterLoad: [],
  };

  entityHooks[hookType].push(hookMetadata);
  entityHooks[hookType].sort((a: HookMetadata, b: HookMetadata) => a.priority - b.priority);

  setMetadata(
    HOOKS_METADATA_KEY,
    entityHooks,
    entityClass
  );
}

/**
 * Get all hooks for an entity class.
 *
 * @param entityClass - The entity class
 * @returns Entity hooks collection
 */
export function getEntityHooks(entityClass: new () => unknown): EntityHooks {
  return getMetadata<EntityHooks>(
    HOOKS_METADATA_KEY,
    entityClass
  ) || {
    beforeInsert: [],
    afterInsert: [],
    beforeUpdate: [],
    afterUpdate: [],
    beforeDelete: [],
    afterDelete: [],
    beforeLoad: [],
    afterLoad: [],
  };
}

/**
 * Check if an entity class has hooks of a specific type.
 *
 * @param entityClass - The entity class
 * @param hookType - Type of hook to check
 * @returns True if hooks exist
 */
export function hasHooks(
  entityClass: new () => unknown,
  hookType?: HookType
): boolean {
  const hooks = getEntityHooks(entityClass);

  if (hookType) {
    return hooks[hookType].length > 0;
  }

  return Object.values(hooks).some(hookArray => hookArray.length > 0);
}
