/**
 * MongoDB Seeding
 *
 * Database seeding utilities for MongoDB with factory pattern support.
 *
 * @module mongodb/seeding
 */

import type { Document } from 'mongodb';
import type { MongoDBAdapter } from '../adapter/mongodb-adapter.js';
import type { MongoDBRepository } from '../repository/mongodb-repository.js';

/**
 * Seeder interface for MongoDB.
 */
export interface MongoDBSeeder {
  /**
   * Seeder name.
   */
  name: string;

  /**
   * Execution order (lower runs first).
   */
  order?: number;

  /**
   * Dependencies (other seeders that must run first).
   */
  dependencies?: string[];

  /**
   * Run the seeder.
   *
   * @param adapter - MongoDB adapter
   */
  run(adapter: MongoDBAdapter): Promise<void>;

  /**
   * Rollback the seeder (delete seeded data).
   *
   * @param adapter - MongoDB adapter
   */
  rollback?(adapter: MongoDBAdapter): Promise<void>;
}

/**
 * Factory function for generating test data.
 */
export type MongoDBFactory<T extends Document> = (index?: number) => T | Promise<T>;

/**
 * Create a factory for generating MongoDB documents.
 *
 * @param factory - Factory function
 * @returns Factory helper object
 *
 * @example
 * ```typescript
 * const userFactory = createMongoFactory<User>((index) => ({
 *   name: `User ${index}`,
 *   email: `user${index}@example.com`,
 *   createdAt: new Date()
 * }));
 *
 * const users = await userFactory.makeMany(10);
 * await userRepo.createMany(users);
 * ```
 */
export function createMongoFactory<T extends Document>(
  factory: MongoDBFactory<T>
) {
  return {
    /**
     * Generate a single document.
     */
    async make(): Promise<T> {
      return factory(0);
    },

    /**
     * Generate multiple documents.
     *
     * @param count - Number of documents to generate
     * @returns Array of documents
     */
    async makeMany(count: number): Promise<T[]> {
      const documents: T[] = [];

      for (let i = 0; i < count; i++) {
        const doc = await factory(i);
        documents.push(doc);
      }

      return documents;
    },

    /**
     * Create and insert a single document.
     *
     * @param repository - MongoDB repository
     * @returns Inserted document
     */
    async create(repository: MongoDBRepository<T>): Promise<T> {
      const doc = await this.make();
      return repository.create(doc);
    },

    /**
     * Create and insert multiple documents.
     *
     * @param repository - MongoDB repository
     * @param count - Number of documents to create
     * @returns Array of inserted documents
     */
    async createMany(
      repository: MongoDBRepository<T>,
      count: number
    ): Promise<T[]> {
      const docs = await this.makeMany(count);
      return repository.createMany(docs);
    },
  };
}

/**
 * Seeder runner for MongoDB.
 */
export class MongoDBSeederRunner {
  private executedSeeders = new Set<string>();

  constructor(private readonly adapter: MongoDBAdapter) {}

  /**
   * Run seeders in dependency order.
   *
   * @param seeders - Array of seeders to run
   */
  async run(seeders: MongoDBSeeder[]): Promise<void> {
    // Sort by order and dependencies
    const sortedSeeders = this.sortSeeders(seeders);

    for (const seeder of sortedSeeders) {
      if (!this.executedSeeders.has(seeder.name)) {
        await seeder.run(this.adapter);
        this.executedSeeders.add(seeder.name);
      }
    }
  }

  /**
   * Rollback seeders in reverse order.
   *
   * @param seeders - Array of seeders to rollback
   */
  async rollback(seeders: MongoDBSeeder[]): Promise<void> {
    const sortedSeeders = this.sortSeeders(seeders).reverse();

    for (const seeder of sortedSeeders) {
      if (seeder.rollback) {
        await seeder.rollback(this.adapter);
      }
      this.executedSeeders.delete(seeder.name);
    }
  }

  /**
   * Sort seeders by dependencies and order.
   */
  private sortSeeders(seeders: MongoDBSeeder[]): MongoDBSeeder[] {
    const sorted: MongoDBSeeder[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (seeder: MongoDBSeeder): void => {
      if (visited.has(seeder.name)) {
        return;
      }

      if (visiting.has(seeder.name)) {
        throw new Error(`Circular dependency detected: ${seeder.name}`);
      }

      visiting.add(seeder.name);

      // Visit dependencies first
      if (seeder.dependencies) {
        for (const depName of seeder.dependencies) {
          const dep = seeders.find((s) => s.name === depName);
          if (dep) {
            visit(dep);
          }
        }
      }

      visiting.delete(seeder.name);
      visited.add(seeder.name);
      sorted.push(seeder);
    };

    // Sort by order first
    const orderedSeeders = [...seeders].sort(
      (a, b) => (a.order || 0) - (b.order || 0)
    );

    for (const seeder of orderedSeeders) {
      visit(seeder);
    }

    return sorted;
  }
}

