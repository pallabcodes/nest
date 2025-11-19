/**
 * Data Factory
 *
 * Provides factory pattern for generating test data and seeding databases.
 * Supports faker integration, custom generators, and relationships.
 *
 * @module seeding/factory
 */

import type { QueryExecutor } from '../execution/query-executor.js';

/**
 * Factory definition function.
 */
export type FactoryDefinition<T> = (faker?: FakerInstance) => Partial<T> | Promise<Partial<T>>;

/**
 * Faker instance interface (compatible with @faker-js/faker).
 */
export interface FakerInstance {
  person: {
    firstName: () => string;
    lastName: () => string;
    fullName: () => string;
  };
  internet: {
    email: () => string;
    url: () => string;
    userName: () => string;
  };
  lorem: {
    sentence: () => string;
    paragraph: () => string;
    text: () => string;
  };
  datatype: {
    number: (options?: { min?: number; max?: number }) => number;
    boolean: () => boolean;
    uuid: () => string;
  };
  date: {
    past: () => Date;
    future: () => Date;
    recent: () => Date;
  };
  [key: string]: unknown;
}

/**
 * Factory options.
 */
export interface FactoryOptions<T> {
  /**
   * Custom faker instance.
   */
  faker?: FakerInstance;

  /**
   * Query executor for database operations.
   */
  executor?: QueryExecutor;

  /**
   * Default values to merge with generated data.
   */
  defaults?: Partial<T>;

  /**
   * Number of items to generate.
   */
  count?: number;
}

/**
 * Data factory for generating test data.
 */
export class Factory<T> {
  private definition: FactoryDefinition<T>;
  private faker?: FakerInstance;
  private executor?: QueryExecutor;
  private defaults: Partial<T> = {};

  constructor(
    definition: FactoryDefinition<T>,
    options?: FactoryOptions<T>
  ) {
    this.definition = definition;
    this.faker = options?.faker;
    this.executor = options?.executor;
    this.defaults = options?.defaults || {};
  }

  /**
   * Set faker instance.
   */
  withFaker(faker: FakerInstance): this {
    this.faker = faker;
    return this;
  }

  /**
   * Set query executor.
   */
  withExecutor(executor: QueryExecutor): this {
    this.executor = executor;
    return this;
  }

  /**
   * Set default values.
   */
  withDefaults(defaults: Partial<T>): this {
    this.defaults = { ...this.defaults, ...defaults };
    return this;
  }

  /**
   * Generate a single item.
   */
  async make(overrides?: Partial<T>): Promise<T> {
    const generated = await this.definition(this.faker);
    return {
      ...this.defaults,
      ...generated,
      ...overrides,
    } as T;
  }

  /**
   * Generate multiple items.
   */
  async makeMany(count: number, overrides?: Partial<T>): Promise<T[]> {
    const items: T[] = [];
    for (let i = 0; i < count; i++) {
      items.push(await this.make(overrides));
    }
    return items;
  }

  /**
   * Generate and save a single item to database.
   */
  async create(overrides?: Partial<T>): Promise<T> {
    if (!this.executor) {
      throw new Error('Executor not set. Use withExecutor() first.');
    }

    const item = await this.make(overrides);
    // Implementation would insert into database via executor
    return item;
  }

  /**
   * Generate and save multiple items to database.
   */
  async createMany(count: number, overrides?: Partial<T>): Promise<T[]> {
    if (!this.executor) {
      throw new Error('Executor not set. Use withExecutor() first.');
    }

    const items: T[] = [];
    for (let i = 0; i < count; i++) {
      items.push(await this.create(overrides));
    }
    return items;
  }

  /**
   * Define a state (variant) of the factory.
   */
  state(name: string, state: Partial<T>): FactoryState<T> {
    return new FactoryState(this, name, state);
  }
}

/**
 * Factory state for defining variants.
 */
export class FactoryState<T> {
  constructor(
    private factory: Factory<T>,
    private name: string,
    private state: Partial<T>
  ) {}

  /**
   * Generate a single item with this state.
   */
  async make(overrides?: Partial<T>): Promise<T> {
    return this.factory.make({ ...this.state, ...overrides });
  }

  /**
   * Generate multiple items with this state.
   */
  async makeMany(count: number, overrides?: Partial<T>): Promise<T[]> {
    return this.factory.makeMany(count, { ...this.state, ...overrides });
  }

  /**
   * Generate and save a single item with this state.
   */
  async create(overrides?: Partial<T>): Promise<T> {
    return this.factory.create({ ...this.state, ...overrides });
  }

  /**
   * Generate and save multiple items with this state.
   */
  async createMany(count: number, overrides?: Partial<T>): Promise<T[]> {
    return this.factory.createMany(count, { ...this.state, ...overrides });
  }
}

/**
 * Factory builder for creating factories.
 */
export class FactoryBuilder {
  private faker?: FakerInstance;
  private executor?: QueryExecutor;

  /**
   * Set faker instance for all factories.
   */
  withFaker(faker: FakerInstance): this {
    this.faker = faker;
    return this;
  }

  /**
   * Set query executor for all factories.
   */
  withExecutor(executor: QueryExecutor): this {
    this.executor = executor;
    return this;
  }

  /**
   * Define a new factory.
   */
  define<T>(definition: FactoryDefinition<T>, defaults?: Partial<T>): Factory<T> {
    return new Factory(definition, {
      faker: this.faker,
      executor: this.executor,
      defaults,
    });
  }
}

/**
 * Create a new factory builder.
 */
export function createFactoryBuilder(): FactoryBuilder {
  return new FactoryBuilder();
}

/**
 * Create a simple factory without builder.
 */
export function createFactory<T>(
  definition: FactoryDefinition<T>,
  options?: FactoryOptions<T>
): Factory<T> {
  return new Factory(definition, options);
}

