/**
 * Change Tracker
 *
 * Tracks entity state changes for automatic change detection and persistence.
 * Implements dirty checking to identify modified entities.
 *
 * @module unit-of-work/change-tracker
 */

/**
 * Entity state in the Unit of Work.
 */
export enum EntityState {
  /**
   * Entity is newly created and not yet persisted.
   */
  NEW = 'new',

  /**
   * Entity is loaded from database and unmodified.
   */
  MANAGED = 'managed',

  /**
   * Entity is loaded and has been modified.
   */
  MODIFIED = 'modified',

  /**
   * Entity is marked for deletion.
   */
  DELETED = 'deleted',

  /**
   * Entity is detached from the Unit of Work.
   */
  DETACHED = 'detached',
}

/**
 * Entity change information.
 */
export interface EntityChange {
  /**
   * Entity instance.
   */
  entity: unknown;

  /**
   * Current state.
   */
  state: EntityState;

  /**
   * Original values (for dirty checking).
   */
  originalValues: Record<string, unknown>;

  /**
   * Changed properties.
   */
  changedProperties: Set<string>;
}

/**
 * Change Tracker
 *
 * Tracks changes to entities for automatic persistence.
 */
export class ChangeTracker {
  private changes: Map<string, EntityChange> = new Map();

  /**
   * Generate tracking key for an entity.
   *
   * @param entityType - Entity class name
   * @param id - Entity ID
   * @returns Tracking key
   */
  private getKey(entityType: string, id: unknown): string {
    return `${entityType}:${String(id)}`;
  }

  /**
   * Start tracking a new entity.
   *
   * @param entityType - Entity class name
   * @param id - Entity ID
   * @param entity - Entity instance
   */
  trackNew(entityType: string, id: unknown, entity: unknown): void {
    const key = this.getKey(entityType, id);
    this.changes.set(key, {
      entity,
      state: EntityState.NEW,
      originalValues: {},
      changedProperties: new Set(),
    });
  }

  /**
   * Start tracking an entity loaded from database.
   *
   * @param entityType - Entity class name
   * @param id - Entity ID
   * @param entity - Entity instance
   */
  trackManaged(entityType: string, id: unknown, entity: unknown): void {
    const key = this.getKey(entityType, id);
    const snapshot = this.createSnapshot(entity);

    this.changes.set(key, {
      entity,
      state: EntityState.MANAGED,
      originalValues: snapshot,
      changedProperties: new Set(),
    });
  }

  /**
   * Mark an entity as deleted.
   *
   * @param entityType - Entity class name
   * @param id - Entity ID
   */
  trackDeleted(entityType: string, id: unknown): void {
    const key = this.getKey(entityType, id);
    const change = this.changes.get(key);

    if (change) {
      change.state = EntityState.DELETED;
    }
  }

  /**
   * Detach an entity from tracking.
   *
   * @param entityType - Entity class name
   * @param id - Entity ID
   */
  detach(entityType: string, id: unknown): void {
    const key = this.getKey(entityType, id);
    const change = this.changes.get(key);

    if (change) {
      change.state = EntityState.DETACHED;
    }
  }

  /**
   * Detect changes in a tracked entity.
   *
   * @param entityType - Entity class name
   * @param id - Entity ID
   * @returns True if entity has changes
   */
  detectChanges(entityType: string, id: unknown): boolean {
    const key = this.getKey(entityType, id);
    const change = this.changes.get(key);

    if (!change || change.state !== EntityState.MANAGED) {
      return false;
    }

    const currentValues = this.createSnapshot(change.entity);
    let hasChanges = false;

    for (const [prop, originalValue] of Object.entries(change.originalValues)) {
      if (currentValues[prop] !== originalValue) {
        change.changedProperties.add(prop);
        hasChanges = true;
      }
    }

    if (hasChanges) {
      change.state = EntityState.MODIFIED;
    }

    return hasChanges;
  }

  /**
   * Get entity state.
   *
   * @param entityType - Entity class name
   * @param id - Entity ID
   * @returns Entity state or undefined if not tracked
   */
  getState(entityType: string, id: unknown): EntityState | undefined {
    const key = this.getKey(entityType, id);
    return this.changes.get(key)?.state;
  }

  /**
   * Get changed properties for an entity.
   *
   * @param entityType - Entity class name
   * @param id - Entity ID
   * @returns Set of changed property names
   */
  getChangedProperties(entityType: string, id: unknown): Set<string> {
    const key = this.getKey(entityType, id);
    return this.changes.get(key)?.changedProperties || new Set();
  }

  /**
   * Get all new entities.
   *
   * @returns Array of new entity changes
   */
  getNew(): EntityChange[] {
    return Array.from(this.changes.values()).filter(
      (change) => change.state === EntityState.NEW
    );
  }

  /**
   * Get all modified entities.
   *
   * @returns Array of modified entity changes
   */
  getModified(): EntityChange[] {
    return Array.from(this.changes.values()).filter(
      (change) => change.state === EntityState.MODIFIED
    );
  }

  /**
   * Get all deleted entities.
   *
   * @returns Array of deleted entity changes
   */
  getDeleted(): EntityChange[] {
    return Array.from(this.changes.values()).filter(
      (change) => change.state === EntityState.DELETED
    );
  }

  /**
   * Clear all tracked changes.
   */
  clear(): void {
    this.changes.clear();
  }

  /**
   * Create a snapshot of entity values for dirty checking.
   *
   * @private
   */
  private createSnapshot(entity: unknown): Record<string, unknown> {
    const snapshot: Record<string, unknown> = {};

    if (entity && typeof entity === 'object') {
      for (const [key, value] of Object.entries(entity)) {
        // Simple shallow copy - could be enhanced for deep cloning
        snapshot[key] = value;
      }
    }

    return snapshot;
  }
}

