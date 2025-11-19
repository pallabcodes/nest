/**
 * Identity Map
 *
 * Tracks loaded entities by their IDs to ensure a single instance per entity.
 * Prevents duplicate loading and maintains entity identity.
 *
 * @module unit-of-work/identity-map
 */

/**
 * Identity key combining entity type and ID.
 */
type IdentityKey = string;

/**
 * Identity Map
 *
 * Maintains a registry of all entities loaded in the current Unit of Work.
 */
export class IdentityMap {
  private entities: Map<IdentityKey, unknown> = new Map();

  /**
   * Generate identity key for an entity.
   *
   * @param entityType - Entity class name or type
   * @param id - Entity ID
   * @returns Identity key
   */
  private getKey(entityType: string, id: unknown): IdentityKey {
    return `${entityType}:${String(id)}`;
  }

  /**
   * Check if an entity exists in the identity map.
   *
   * @param entityType - Entity class name
   * @param id - Entity ID
   * @returns True if entity exists
   */
  has(entityType: string, id: unknown): boolean {
    const key = this.getKey(entityType, id);
    return this.entities.has(key);
  }

  /**
   * Get an entity from the identity map.
   *
   * @param entityType - Entity class name
   * @param id - Entity ID
   * @returns Entity instance or undefined
   */
  get<T>(entityType: string, id: unknown): T | undefined {
    const key = this.getKey(entityType, id);
    return this.entities.get(key) as T | undefined;
  }

  /**
   * Add an entity to the identity map.
   *
   * @param entityType - Entity class name
   * @param id - Entity ID
   * @param entity - Entity instance
   */
  set<T>(entityType: string, id: unknown, entity: T): void {
    const key = this.getKey(entityType, id);
    this.entities.set(key, entity);
  }

  /**
   * Remove an entity from the identity map.
   *
   * @param entityType - Entity class name
   * @param id - Entity ID
   * @returns True if entity was removed
   */
  delete(entityType: string, id: unknown): boolean {
    const key = this.getKey(entityType, id);
    return this.entities.delete(key);
  }

  /**
   * Get all entities of a specific type.
   *
   * @param entityType - Entity class name
   * @returns Array of entities
   */
  getAllOfType<T>(entityType: string): T[] {
    const prefix = `${entityType}:`;
    const result: T[] = [];

    for (const [key, entity] of this.entities.entries()) {
      if (key.startsWith(prefix)) {
        result.push(entity as T);
      }
    }

    return result;
  }

  /**
   * Clear all entities from the identity map.
   */
  clear(): void {
    this.entities.clear();
  }

  /**
   * Get the total number of entities in the identity map.
   */
  size(): number {
    return this.entities.size;
  }

  /**
   * Check if the identity map is empty.
   */
  isEmpty(): boolean {
    return this.entities.size === 0;
  }
}

