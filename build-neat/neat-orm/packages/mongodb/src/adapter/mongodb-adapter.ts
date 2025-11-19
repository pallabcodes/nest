/**
 * MongoDB Adapter
 *
 * Production-grade MongoDB adapter implementing the DatabaseAdapter interface.
 * Uses native MongoDB driver for optimal performance and full feature support.
 *
 * @module mongodb/adapter
 */

import {
  MongoClient,
  Db,
  Collection,
  ClientSession,
  MongoClientOptions,
  ObjectId,
  Filter,
  Document,
  InsertOneResult,
  UpdateResult,
  DeleteResult,
  BulkWriteResult,
} from 'mongodb';

import type {
  DatabaseAdapter,
  QueryResult,
  DatabaseRow,
  ConnectionConfig,
  Transaction,
  TransactionOptions,
  DatabaseConnection,
} from '@neat-orm/core';

/**
 * MongoDB-specific connection configuration.
 */
export interface MongoDBConfig extends Omit<ConnectionConfig, 'dialect'> {
  /**
   * Database dialect (must be 'mongodb').
   */
  dialect: 'mongodb';

  /**
   * MongoDB connection URL.
   * @example 'mongodb://localhost:27017' or 'mongodb+srv://user:pass@cluster.mongodb.net'
   */
  url: string;

  /**
   * Database name.
   */
  database: string;

  /**
   * MongoDB client options.
   */
  options?: MongoClientOptions;

  /**
   * Connection pool size.
   * @default 10
   */
  poolSize?: number;

  /**
   * Maximum idle time for connections (ms).
   * @default 60000
   */
  maxIdleTimeMS?: number;

  /**
   * Server selection timeout (ms).
   * @default 30000
   */
  serverSelectionTimeoutMS?: number;

  /**
   * Socket timeout (ms).
   * @default 45000
   */
  socketTimeoutMS?: number;
}

/**
 * MongoDB transaction implementation.
 */
export class MongoDBTransaction implements Transaction {
  private committed = false;
  private rolledBack = false;

  constructor(private session: ClientSession) {}

  async commit(): Promise<void> {
    if (this.committed || this.rolledBack) {
      throw new Error('Transaction already completed');
    }

    await this.session.commitTransaction();
    this.committed = true;
    await this.session.endSession();
  }

  async rollback(): Promise<void> {
    if (this.committed || this.rolledBack) {
      throw new Error('Transaction already completed');
    }

    await this.session.abortTransaction();
    this.rolledBack = true;
    await this.session.endSession();
  }

  get isActive(): boolean {
    return !this.committed && !this.rolledBack;
  }

  /**
   * Get the underlying MongoDB session.
   */
  getSession(): ClientSession {
    return this.session;
  }
}

/**
 * MongoDB connection wrapper.
 */
export class MongoDBConnection implements DatabaseConnection {
  constructor(
    private client: MongoClient,
    private db: Db,
    private session?: ClientSession
  ) {}

  async execute<T = DatabaseRow>(
    query: string,
    params?: unknown[]
  ): Promise<QueryResult<T>> {
    // Parse MongoDB query (JSON format)
    const parsed = JSON.parse(query) as {
      collection: string;
      operation: string;
      filter?: Filter<Document>;
      document?: Document;
      documents?: Document[];
      update?: Document;
      options?: any;
    };

    const collection = this.db.collection(parsed.collection);
    const sessionOptions = this.session ? { session: this.session } : {};

    let result: any;
    let affectedRows = 0;

    switch (parsed.operation) {
      case 'find':
        result = await collection
          .find(parsed.filter || {}, sessionOptions)
          .toArray();
        break;

      case 'findOne':
        result = await collection.findOne(
          parsed.filter || {},
          sessionOptions
        );
        result = result ? [result] : [];
        break;

      case 'insertOne':
        const insertResult: InsertOneResult = await collection.insertOne(
          parsed.document!,
          sessionOptions
        );
        affectedRows = insertResult.acknowledged ? 1 : 0;
        result = [{ _id: insertResult.insertedId, ...parsed.document }];
        break;

      case 'insertMany':
        const insertManyResult = await collection.insertMany(
          parsed.documents!,
          sessionOptions
        );
        affectedRows = insertManyResult.insertedCount;
        result = parsed.documents!.map((doc, i) => ({
          ...doc,
          _id: insertManyResult.insertedIds[i],
        }));
        break;

      case 'updateOne':
      case 'updateMany':
        const updateResult: UpdateResult = await collection[parsed.operation](
          parsed.filter!,
          parsed.update!,
          { ...sessionOptions, ...parsed.options }
        );
        affectedRows = updateResult.modifiedCount;
        result = [];
        break;

      case 'deleteOne':
      case 'deleteMany':
        const deleteResult: DeleteResult = await collection[parsed.operation](
          parsed.filter!,
          sessionOptions
        );
        affectedRows = deleteResult.deletedCount;
        result = [];
        break;

      case 'aggregate':
        result = await collection
          .aggregate(parsed.filter as any[], sessionOptions)
          .toArray();
        break;

      case 'count':
      case 'countDocuments':
        const count = await collection.countDocuments(
          parsed.filter || {},
          sessionOptions
        );
        result = [{ count }];
        break;

      default:
        throw new Error(`Unsupported MongoDB operation: ${parsed.operation}`);
    }

    return {
      rows: result as T[],
      rowCount: affectedRows || result.length,
      affectedRows,
    };
  }

  async beginTransaction(
    options?: TransactionOptions
  ): Promise<MongoDBTransaction> {
    const session = this.client.startSession();

    const transactionOptions: any = {};

    if (options?.isolationLevel) {
      transactionOptions.readConcern = { level: options.isolationLevel };
    }

    if (options?.readOnly) {
      transactionOptions.readPreference = 'secondary';
    }

    session.startTransaction(transactionOptions);

    return new MongoDBTransaction(session);
  }

  /**
   * Get the native MongoDB database instance.
   */
  getDatabase(): Db {
    return this.db;
  }

  /**
   * Get a collection.
   */
  getCollection<T extends Document = Document>(name: string): Collection<T> {
    return this.db.collection<T>(name);
  }

  /**
   * Get the current session (if in transaction).
   */
  getSession(): ClientSession | undefined {
    return this.session;
  }
}

/**
 * MongoDB Adapter
 *
 * Production-grade MongoDB adapter with full feature support:
 * - Connection pooling
 * - Transaction support (MongoDB 4.0+)
 * - Type-safe operations
 * - Query execution
 * - Health checks
 * - Automatic reconnection
 */
export class MongoDBAdapter implements DatabaseAdapter {
  readonly dialect = 'mongodb' as const;

  private client: MongoClient | null = null;
  private db: Db | null = null;
  private connected = false;
  private readonly config: MongoDBConfig;

  constructor(config: MongoDBConfig) {
    this.config = {
      poolSize: 10,
      maxIdleTimeMS: 60000,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      ...config,
    };

    this.validateConfig();
  }

  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    try {
      const options: MongoClientOptions = {
        maxPoolSize: this.config.poolSize,
        maxIdleTimeMS: this.config.maxIdleTimeMS,
        serverSelectionTimeoutMS: this.config.serverSelectionTimeoutMS,
        socketTimeoutMS: this.config.socketTimeoutMS,
        ...this.config.options,
      };

      this.client = new MongoClient(this.config.url, options);
      await this.client.connect();

      this.db = this.client.db(this.config.database);
      this.connected = true;
    } catch (error) {
      this.connected = false;
      throw new Error(
        `Failed to connect to MongoDB: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async disconnect(): Promise<void> {
    if (!this.connected || !this.client) {
      return;
    }

    try {
      await this.client.close();
      this.client = null;
      this.db = null;
      this.connected = false;
    } catch (error) {
      throw new Error(
        `Failed to disconnect from MongoDB: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  isConnected(): boolean {
    return this.connected && this.client !== null;
  }

  async execute<T = DatabaseRow>(
    sql: string,
    params?: unknown[]
  ): Promise<QueryResult<T>> {
    if (!this.connected || !this.client || !this.db) {
      throw new Error('Not connected to MongoDB');
    }

    const connection = new MongoDBConnection(this.client, this.db);
    return connection.execute<T>(sql, params);
  }

  async beginTransaction(
    options?: TransactionOptions
  ): Promise<MongoDBTransaction> {
    if (!this.connected || !this.client) {
      throw new Error('Not connected to MongoDB');
    }

    const session = this.client.startSession();

    const transactionOptions: any = {};

    if (options?.isolationLevel) {
      transactionOptions.readConcern = { level: options.isolationLevel };
    }

    if (options?.readOnly) {
      transactionOptions.readPreference = 'secondary';
    }

    session.startTransaction(transactionOptions);

    return new MongoDBTransaction(session);
  }

  async getConnection(): Promise<MongoDBConnection> {
    if (!this.connected || !this.client || !this.db) {
      throw new Error('Not connected to MongoDB');
    }

    return new MongoDBConnection(this.client, this.db);
  }

  escapeIdentifier(identifier: string): string {
    // MongoDB doesn't require identifier escaping like SQL
    // But we validate for safety
    if (identifier.includes('$') || identifier.includes('.')) {
      throw new Error(`Invalid MongoDB identifier: ${identifier}`);
    }
    return identifier;
  }

  escapeValue(value: unknown): string {
    // MongoDB uses BSON, not SQL strings
    // Convert to JSON for query representation
    return JSON.stringify(value);
  }

  getConfig(): MongoDBConfig {
    return { ...this.config };
  }

  async testConnection(): Promise<boolean> {
    try {
      if (!this.connected || !this.db) {
        return false;
      }

      // Ping the database
      await this.db.admin().ping();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the native MongoDB client.
   */
  getClient(): MongoClient {
    if (!this.client) {
      throw new Error('Not connected to MongoDB');
    }
    return this.client;
  }

  /**
   * Get the native MongoDB database instance.
   */
  getDatabase(): Db {
    if (!this.db) {
      throw new Error('Not connected to MongoDB');
    }
    return this.db;
  }

  /**
   * Get a collection from the database.
   */
  getCollection<T extends Document = Document>(name: string): Collection<T> {
    return this.getDatabase().collection<T>(name);
  }

  /**
   * Create indexes for a collection.
   */
  async createIndexes(
    collectionName: string,
    indexes: Array<{
      keys: Record<string, 1 | -1 | 'text' | '2d' | '2dsphere'>;
      options?: {
        name?: string;
        unique?: boolean;
        sparse?: boolean;
        background?: boolean;
        expireAfterSeconds?: number;
        partialFilterExpression?: Filter<Document>;
      };
    }>
  ): Promise<string[]> {
    const collection = this.getCollection(collectionName);

    const indexSpecs = indexes.map((index) => ({
      key: index.keys,
      ...index.options,
    }));

    return collection.createIndexes(indexSpecs);
  }

  /**
   * Drop a collection.
   */
  async dropCollection(collectionName: string): Promise<boolean> {
    try {
      await this.getCollection(collectionName).drop();
      return true;
    } catch (error: any) {
      if (error.code === 26) {
        // NamespaceNotFound
        return false;
      }
      throw error;
    }
  }

  /**
   * List all collections in the database.
   */
  async listCollections(): Promise<string[]> {
    const collections = await this.getDatabase()
      .listCollections()
      .toArray();
    return collections.map((col) => col.name);
  }

  /**
   * Validate the connection configuration.
   */
  private validateConfig(): void {
    if (!this.config.url) {
      throw new Error('MongoDB URL is required');
    }

    if (!this.config.database) {
      throw new Error('Database name is required');
    }

    if (this.config.poolSize && this.config.poolSize < 1) {
      throw new Error('Pool size must be at least 1');
    }
  }
}

/**
 * Create a MongoDB adapter with the provided configuration.
 *
 * @param config - MongoDB connection configuration
 * @returns MongoDB adapter instance
 *
 * @example
 * ```typescript
 * const adapter = createMongoAdapter({
 *   url: 'mongodb://localhost:27017',
 *   database: 'mydb',
 *   poolSize: 20
 * });
 *
 * await adapter.connect();
 * ```
 */
export function createMongoAdapter(config: Omit<MongoDBConfig, 'dialect'>): MongoDBAdapter {
  return new MongoDBAdapter({
    ...config,
    dialect: 'mongodb',
  });
}

/**
 * Export ObjectId for convenience.
 */
export { ObjectId };

