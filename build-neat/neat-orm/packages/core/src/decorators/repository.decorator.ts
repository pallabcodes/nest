/**
 * Repository Decorator
 *
 * Marks a class as a custom repository.
 *
 * @module decorators/repository
 */

import { metadataScanner } from '../metadata/scanner.js';

/**
 * Repository metadata key.
 */
const REPOSITORY_KEY = 'neat-orm:repository';

/**
 * Repository decorator options.
 */
export interface RepositoryOptions {
  /**
   * Entity class this repository manages.
   */
  entity: new () => unknown;

  /**
   * Custom repository name.
   */
  name?: string;
}

/**
 * Repository metadata.
 */
export interface RepositoryMetadata {
  entity: new () => unknown;
  name?: string;
}

/**
 * Repository decorator.
 *
 * Marks a class as a custom repository for an entity.
 *
 * @param options - Repository options
 * @returns Class decorator
 *
 * @example
 * ```typescript
 * @Repository({ entity: User })
 * export class UserRepository extends BaseRepository<User> {
 *   async findByEmail(email: string): Promise<User | null> {
 *     return this.findOneBy({ email });
 *   }
 * }
 * ```
 */
export function Repository(options: RepositoryOptions): ClassDecorator {
  return (target: Function) => {
    const metadata: RepositoryMetadata = {
      entity: options.entity,
      name: options.name || target.name,
    };

    metadataScanner.setMetadata(REPOSITORY_KEY, metadata, target);
  };
}

