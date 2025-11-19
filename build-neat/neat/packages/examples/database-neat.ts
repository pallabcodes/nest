#!/usr/bin/env tsx

/**
 * DATABASE NEAT - Database Integration with ORM-like Features
 *
 * Demonstrates Neat framework's database integration, entity management,
 * repository patterns, and transaction handling.
 */

import 'reflect-metadata';

// =============================================================================
// DATABASE ADAPTER (Simplified)
// =============================================================================

interface DatabaseResult {
  rows: any[];
  lastInsertRowid?: number;
}

interface DatabaseAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  execute(sql: string, params?: any[]): Promise<DatabaseResult>;
  beginTransaction(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

class SimpleSQLiteAdapter implements DatabaseAdapter {
  private db: any = null;
  private transactionActive = false;

  constructor(private config: { database: string }) {}

  async connect(): Promise<void> {
    const sqlite3 = await import('sqlite3');
    this.db = new sqlite3.default.Database(this.config.database);
  }

  async disconnect(): Promise<void> {
    if (this.db) {
      return new Promise((resolve, reject) => {
        this.db.close((err: any) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  }

  async execute(sql: string, params: any[] = []): Promise<DatabaseResult> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }

      if (sql.toLowerCase().trim().startsWith('select')) {
        this.db.all(sql, params, (err: any, rows: any[]) => {
          if (err) reject(err);
          else resolve({ rows: rows || [] });
        });
      } else {
        this.db.run(sql, params, function(this: any, err: any) {
          if (err) reject(err);
          else resolve({
            rows: [],
            lastInsertRowid: this.lastID
          });
        });
      }
    });
  }

  async beginTransaction(): Promise<void> {
    await this.execute('BEGIN TRANSACTION');
    this.transactionActive = true;
  }

  async commit(): Promise<void> {
    await this.execute('COMMIT');
    this.transactionActive = false;
  }

  async rollback(): Promise<void> {
    if (this.transactionActive) {
      await this.execute('ROLLBACK');
      this.transactionActive = false;
    }
  }
}

// =============================================================================
// ENTITY DECORATORS (Manual Implementation)
// =============================================================================

interface EntityMetadata {
  tableName: string;
  columns: Map<string, ColumnMetadata>;
}

interface ColumnMetadata {
  name: string;
  type: string;
  primary?: boolean;
  nullable?: boolean;
  defaultValue?: any;
}

const ENTITIES_METADATA = new Map<string, EntityMetadata>();

function Entity(tableName: string): ClassDecorator {
  return (target: any) => {
    const existingMetadata = ENTITIES_METADATA.get(target.name);
    const metadata: EntityMetadata = {
      tableName,
      columns: existingMetadata?.columns || new Map()
    };
    ENTITIES_METADATA.set(target.name, metadata);
  };
}

function Column(options: { type: string; nullable?: boolean; default?: any } = { type: 'TEXT' }): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) => {
    const propName = propertyKey.toString();
    const entityName = target.constructor.name;
    let metadata = ENTITIES_METADATA.get(entityName);

    if (!metadata) {
      metadata = {
        tableName: entityName.toLowerCase(),
        columns: new Map()
      };
      ENTITIES_METADATA.set(entityName, metadata);
    }

    metadata.columns.set(propName, {
      name: propName,
      type: options.type,
      nullable: options.nullable,
      defaultValue: options.default
    });
  };
}

function PrimaryKey(): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) => {
    const propName = propertyKey.toString();
    const entityName = target.constructor.name;
    const metadata = ENTITIES_METADATA.get(entityName);

    if (metadata) {
      const column = metadata.columns.get(propName);
      if (column) {
        column.primary = true;
        column.nullable = false;
      }
    }
  };
}

// =============================================================================
// REPOSITORY PATTERN
// =============================================================================

interface Entity {
  id: number;
}

class BaseRepository<T extends Entity> {
  constructor(
    protected adapter: DatabaseAdapter,
    protected entityClass: new () => T
  ) {}

  async create(data: Omit<T, 'id'>): Promise<T> {
    const entityName = this.entityClass.name;
    const metadata = ENTITIES_METADATA.get(entityName);

    if (!metadata) {
      throw new Error(`Entity metadata not found for ${entityName}`);
    }

    const columns = Array.from(metadata.columns.values()).filter(col => !col.primary);

    if (columns.length === 0) {
      throw new Error(`No columns found for entity ${entityName}`);
    }

    const columnNames = columns.map(col => col.name);
    const placeholders = columns.map(() => '?');
    const values = columns.map(col => (data as any)[col.name] ?? col.defaultValue);

    const sql = `INSERT INTO ${metadata.tableName} (${columnNames.join(', ')}) VALUES (${placeholders.join(', ')})`;
    const result = await this.adapter.execute(sql, values);

    const entity = new this.entityClass();
    Object.assign(entity, data, { id: result.lastInsertRowid });
    return entity;
  }

  async findById(id: number): Promise<T | null> {
    const entityName = this.entityClass.name;
    const metadata = ENTITIES_METADATA.get(entityName);

    if (!metadata) {
      throw new Error(`Entity metadata not found for ${entityName}`);
    }

    const result = await this.adapter.execute(
      `SELECT * FROM ${metadata.tableName} WHERE id = ?`,
      [id]
    );

    if (result.rows.length === 0) return null;

    const entity = new this.entityClass();
    Object.assign(entity, result.rows[0]);
    return entity;
  }

  async find(options: {
    where?: Record<string, any>;
    limit?: number;
    offset?: number;
    orderBy?: string;
  } = {}): Promise<T[]> {
    const entityName = this.entityClass.name;
    const metadata = ENTITIES_METADATA.get(entityName);

    if (!metadata) {
      throw new Error(`Entity metadata not found for ${entityName}`);
    }

    let sql = `SELECT * FROM ${metadata.tableName}`;
    const params: any[] = [];

    if (options.where) {
      const conditions: string[] = [];
      for (const [key, value] of Object.entries(options.where)) {
        conditions.push(`${key} = ?`);
        params.push(value);
      }
      if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(' AND ')}`;
      }
    }

    if (options.orderBy) {
      sql += ` ORDER BY ${options.orderBy}`;
    }

    if (options.limit) {
      sql += ` LIMIT ?`;
      params.push(options.limit);
    }

    if (options.offset) {
      sql += ` OFFSET ?`;
      params.push(options.offset);
    }

    const result = await this.adapter.execute(sql, params);
    return result.rows.map(row => {
      const entity = new this.entityClass();
      Object.assign(entity, row);
      return entity;
    });
  }

  async update(id: number, data: Partial<T>): Promise<void> {
    const entityName = this.entityClass.name;
    const metadata = ENTITIES_METADATA.get(entityName);

    if (!metadata) {
      throw new Error(`Entity metadata not found for ${entityName}`);
    }

    const columns = Object.keys(data);
    const values = Object.values(data);
    const setClause = columns.map(col => `${col} = ?`).join(', ');

    const sql = `UPDATE ${metadata.tableName} SET ${setClause} WHERE id = ?`;
    await this.adapter.execute(sql, [...values, id]);
  }

  async delete(id: number): Promise<void> {
    const entityName = this.entityClass.name;
    const metadata = ENTITIES_METADATA.get(entityName);

    if (!metadata) {
      throw new Error(`Entity metadata not found for ${entityName}`);
    }

    await this.adapter.execute(
      `DELETE FROM ${metadata.tableName} WHERE id = ?`,
      [id]
    );
  }

  async count(options: { where?: Record<string, any> } = {}): Promise<number> {
    const entityName = this.entityClass.name;
    const metadata = ENTITIES_METADATA.get(entityName);

    if (!metadata) {
      throw new Error(`Entity metadata not found for ${entityName}`);
    }

    let sql = `SELECT COUNT(*) as count FROM ${metadata.tableName}`;
    const params: any[] = [];

    if (options.where) {
      const conditions: string[] = [];
      for (const [key, value] of Object.entries(options.where)) {
        conditions.push(`${key} = ?`);
        params.push(value);
      }
      if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(' AND ')}`;
      }
    }

    const result = await this.adapter.execute(sql, params);
    return result.rows[0]?.count || 0;
  }
}

// =============================================================================
// ENTITIES
// =============================================================================

@Entity('users')
class User {
  @PrimaryKey()
  @Column({ type: 'INTEGER' })
  id!: number;

  @Column({ type: 'TEXT' })
  name!: string;

  @Column({ type: 'TEXT' })
  email!: string;

  @Column({ type: 'INTEGER' })
  age!: number;

  @Column({ type: 'TEXT', default: 'active' })
  status!: string;

  @Column({ type: 'TEXT' })
  created_at!: string;
}

@Entity('posts')
class Post {
  @PrimaryKey()
  @Column({ type: 'INTEGER' })
  id!: number;

  @Column({ type: 'TEXT' })
  title!: string;

  @Column({ type: 'TEXT' })
  content!: string;

  @Column({ type: 'INTEGER' })
  user_id!: number;

  @Column({ type: 'TEXT', default: 'draft' })
  status!: string;

  @Column({ type: 'INTEGER', default: 0 })
  views?: number;

  @Column({ type: 'TEXT' })
  created_at!: string;
}

// =============================================================================
// SERVICES
// =============================================================================

class UserService {
  constructor(private userRepo: BaseRepository<User>) {}

  async createUser(userData: Omit<User, 'id' | 'created_at'>): Promise<User> {
    // Validation
    if (!userData.name || !userData.email) {
      throw new Error('Name and email are required');
    }

    if (!userData.email.includes('@')) {
      throw new Error('Invalid email format');
    }

    return this.userRepo.create({
      ...userData,
      created_at: new Date().toISOString(),
    });
  }

  async getUserWithPosts(userId: number): Promise<{ user: User; posts: Post[] } | null> {
    const user = await this.userRepo.findById(userId);
    if (!user) return null;

    // In a real ORM, this would be done with JOINs
    return { user, posts: [] };
  }
}

class PostService {
  constructor(
    private postRepo: BaseRepository<Post>,
    private userRepo: BaseRepository<User>
  ) {}

  async createPost(postData: Omit<Post, 'id' | 'created_at'>): Promise<Post> {
    // Validate that user exists
    const user = await this.userRepo.findById(postData.user_id);
    if (!user) {
      throw new Error('User not found');
    }

    return this.postRepo.create({
      ...postData,
      created_at: new Date().toISOString(),
    });
  }

  async publishPost(postId: number): Promise<void> {
    await this.postRepo.update(postId, { status: 'published' });
  }

  async incrementViews(postId: number): Promise<void> {
    const post = await this.postRepo.findById(postId);
    if (post) {
      await this.postRepo.update(postId, { views: (post.views || 0) + 1 });
    }
  }
}

// =============================================================================
// DATABASE SCHEMA CREATION
// =============================================================================

async function createSchema(adapter: DatabaseAdapter): Promise<void> {
  // Users table
  await adapter.execute(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      age INTEGER NOT NULL,
      status TEXT DEFAULT 'active',
      created_at TEXT NOT NULL
    )
  `);

  // Posts table
  await adapter.execute(`
    CREATE TABLE posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      status TEXT DEFAULT 'draft',
      views INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
}

// =============================================================================
// TRANSACTION MANAGER
// =============================================================================

class TransactionManager {
  constructor(private adapter: DatabaseAdapter) {}

  async executeInTransaction<T>(operation: () => Promise<T>): Promise<T> {
    await this.adapter.beginTransaction();

    try {
      const result = await operation();
      await this.adapter.commit();
      return result;
    } catch (error) {
      await this.adapter.rollback();
      throw error;
    }
  }
}

// =============================================================================
// MAIN APPLICATION
// =============================================================================

async function main(): Promise<void> {
  console.log('🗄️  Neat Framework Database Integration Example\n');

  try {
    // Setup database
    const adapter = new SimpleSQLiteAdapter({ database: ':memory:' });
    await adapter.connect();
    await createSchema(adapter);

    console.log('✅ Database schema created');

    // Create repositories
    const userRepo = new BaseRepository(adapter, User);
    const postRepo = new BaseRepository(adapter, Post);

    // Create services
    const userService = new UserService(userRepo);
    const postService = new PostService(postRepo, userRepo);

    // Create transaction manager
    const txManager = new TransactionManager(adapter);

    console.log('✅ Services initialized');

    // ========================================
    // BASIC CRUD OPERATIONS
    // ========================================

    console.log('\n👥 User CRUD Operations:');

    // Create users
    const alice = await userService.createUser({
      name: 'Alice Johnson',
      email: 'alice@example.com',
      age: 28,
      status: 'active',
    });

    const bob = await userService.createUser({
      name: 'Bob Smith',
      email: 'bob@example.com',
      age: 32,
      status: 'active',
    });

    console.log(`✅ Created users: ${alice.name} (ID: ${alice.id}), ${bob.name} (ID: ${bob.id})`);

    // Read operations
    const allUsers = await userRepo.find();
    console.log(`✅ Total users: ${allUsers.length}`);

    const activeUsers = await userRepo.find({ where: { status: 'active' } });
    console.log(`✅ Active users: ${activeUsers.length}`);

    // Update user
    await userRepo.update(alice.id, { age: 29 });
    const updatedAlice = await userRepo.findById(alice.id);
    console.log(`✅ Updated Alice age: ${updatedAlice?.age}`);

    // ========================================
    // POST OPERATIONS
    // ========================================

    console.log('\n📝 Post Operations:');

    // Create posts
    const post1 = await postService.createPost({
      title: 'Getting Started with Neat',
      content: 'Neat is a powerful framework...',
      user_id: alice.id,
      status: 'draft',
    });

    const post2 = await postService.createPost({
      title: 'Advanced Patterns',
      content: 'Learn about advanced Neat patterns...',
      user_id: bob.id,
      status: 'draft',
    });

    console.log(`✅ Created posts: "${post1.title}", "${post2.title}"`);

    // Publish a post
    await postService.publishPost(post1.id);
    console.log('✅ Published first post');

    // Increment views
    await postService.incrementViews(post1.id);
    await postService.incrementViews(post1.id);
    console.log('✅ Incremented post views');

    // Query posts
    const publishedPosts = await postRepo.find({
      where: { status: 'published' },
      orderBy: 'created_at DESC'
    });
    console.log(`✅ Found ${publishedPosts.length} published posts`);

    // ========================================
    // TRANSACTION DEMO
    // ========================================

    console.log('\n🔄 Transaction Demonstration:');

    try {
      await txManager.executeInTransaction(async () => {
        console.log('   📦 Starting transaction...');

        // Create a user
        const txUser = await userService.createUser({
          name: 'Transaction User',
          email: 'tx@example.com',
          age: 25,
          status: 'active',
        });

        // Create a post for that user
        const txPost = await postService.createPost({
          title: 'Transaction Post',
          content: 'This post was created in a transaction',
          user_id: txUser.id,
          status: 'published',
        });

        console.log(`   ✅ Created user ${txUser.name} and post "${txPost.title}" in transaction`);

        // Everything succeeds - transaction commits
      });

      console.log('✅ Transaction committed successfully');

    } catch (error) {
      console.log(`❌ Transaction rolled back: ${error instanceof Error ? error.message : 'Error'}`);
    }

    // ========================================
    // ERROR HANDLING DEMO
    // ========================================

    console.log('\n🚨 Error Handling:');

    // Try to create user with invalid email
    try {
      await userService.createUser({
        name: 'Invalid User',
        email: 'invalid-email',
        age: 25,
        status: 'active',
      });
    } catch (error) {
      console.log(`✅ Caught validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Try to create post for non-existent user
    try {
      await postService.createPost({
        title: 'Orphan Post',
        content: 'This should fail',
        user_id: 99999,
        status: 'draft',
      });
    } catch (error) {
      console.log(`✅ Caught foreign key error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // ========================================
    // STATISTICS
    // ========================================

    console.log('\n📊 Final Statistics:');

    const finalUserCount = await userRepo.count();
    const finalPostCount = await postRepo.count();
    const publishedPostCount = await postRepo.count({ where: { status: 'published' } });
    const totalViews = (await postRepo.find()).reduce((sum, post) => sum + (post.views || 0), 0);

    console.log(`   👥 Total users: ${finalUserCount}`);
    console.log(`   📝 Total posts: ${finalPostCount}`);
    console.log(`   📖 Published posts: ${publishedPostCount}`);
    console.log(`   👁️  Total post views: ${totalViews}`);

    // Cleanup
    await adapter.disconnect();
    console.log('✅ Database disconnected');

    console.log('\n🎉 Database integration example completed successfully!');
    console.log('✅ Demonstrated: Entity decorators and metadata');
    console.log('✅ Demonstrated: Repository pattern');
    console.log('✅ Demonstrated: CRUD operations');
    console.log('✅ Demonstrated: Transaction management');
    console.log('✅ Demonstrated: Validation and error handling');
    console.log('✅ Demonstrated: Complex queries and aggregations');

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// =============================================================================
// RUN THE EXAMPLE
// =============================================================================

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
