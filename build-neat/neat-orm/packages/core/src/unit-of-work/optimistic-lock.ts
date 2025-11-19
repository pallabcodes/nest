/**
 * Optimistic Locking
 *
 * Implements optimistic locking using version columns to prevent concurrent updates.
 *
 * @module unit-of-work/optimistic-lock
 */

/**
 * Optimistic lock error thrown when a conflict is detected.
 */
export class OptimisticLockError extends Error {
  constructor(
    message: string,
    public readonly entity: unknown,
    public readonly expectedVersion: number,
    public readonly actualVersion: number
  ) {
    super(message);
    this.name = 'OptimisticLockError';
  }
}

/**
 * Version column metadata.
 */
export interface VersionMetadata {
  /**
   * Property name for the version column.
   */
  propertyName: string;

  /**
   * Column name in database.
   */
  columnName: string;

  /**
   * Initial version number.
   */
  initialVersion: number;
}

/**
 * Optimistic Lock Manager
 *
 * Manages version columns for optimistic locking.
 */
export class OptimisticLockManager {
  private versionColumns: Map<string, VersionMetadata> = new Map();

  /**
   * Register a version column for an entity type.
   *
   * @param entityType - Entity class name
   * @param metadata - Version column metadata
   */
  registerVersionColumn(
    entityType: string,
    metadata: VersionMetadata
  ): void {
    this.versionColumns.set(entityType, metadata);
  }

  /**
   * Check if an entity type has optimistic locking enabled.
   *
   * @param entityType - Entity class name
   * @returns True if optimistic locking is enabled
   */
  hasVersionColumn(entityType: string): boolean {
    return this.versionColumns.has(entityType);
  }

  /**
   * Get version column metadata for an entity type.
   *
   * @param entityType - Entity class name
   * @returns Version metadata or undefined
   */
  getVersionMetadata(entityType: string): VersionMetadata | undefined {
    return this.versionColumns.get(entityType);
  }

  /**
   * Get current version from an entity.
   *
   * @param entityType - Entity class name
   * @param entity - Entity instance
   * @returns Current version number
   */
  getVersion(entityType: string, entity: unknown): number {
    const metadata = this.versionColumns.get(entityType);
    if (!metadata) {
      throw new Error(
        `Entity type ${entityType} does not have optimistic locking enabled`
      );
    }

    const entityObj = entity as Record<string, unknown>;
    return (entityObj[metadata.propertyName] as number) || metadata.initialVersion;
  }

  /**
   * Increment version number for an entity.
   *
   * @param entityType - Entity class name
   * @param entity - Entity instance
   */
  incrementVersion(entityType: string, entity: unknown): void {
    const metadata = this.versionColumns.get(entityType);
    if (!metadata) {
      return;
    }

    const entityObj = entity as Record<string, unknown>;
    const currentVersion = this.getVersion(entityType, entity);
    entityObj[metadata.propertyName] = currentVersion + 1;
  }

  /**
   * Verify that entity version matches expected version.
   * Throws OptimisticLockError if versions don't match.
   *
   * @param entityType - Entity class name
   * @param entity - Entity instance
   * @param expectedVersion - Expected version number
   * @param actualVersion - Actual version number from database
   */
  verifyVersion(
    entityType: string,
    entity: unknown,
    expectedVersion: number,
    actualVersion: number
  ): void {
    if (expectedVersion !== actualVersion) {
      throw new OptimisticLockError(
        `Optimistic lock conflict: Entity was modified by another transaction. Expected version ${expectedVersion}, but found ${actualVersion}.`,
        entity,
        expectedVersion,
        actualVersion
      );
    }
  }

  /**
   * Build WHERE clause with version check for UPDATE query.
   *
   * @param entityType - Entity class name
   * @param entity - Entity instance
   * @returns WHERE clause string
   */
  buildVersionWhereClause(
    entityType: string,
    entity: unknown
  ): string | undefined {
    const metadata = this.versionColumns.get(entityType);
    if (!metadata) {
      return undefined;
    }

    const version = this.getVersion(entityType, entity);
    return `${metadata.columnName} = ${version}`;
  }
}

