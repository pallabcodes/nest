#!/usr/bin/env tsx

/**
 * BASIC CRUD - Complete CRUD Operations Example
 *
 * Builds on simple-start.ts to demonstrate:
 * - Multiple entity types
 * - Relationships (foreign keys)
 * - Complex queries
 * - Error handling
 * - Data validation
 */

import 'reflect-metadata';

// =============================================================================
// REUSABLE COMPONENTS (from simple-start.ts)
// =============================================================================

interface DatabaseResult {
  rows: any[];
  lastInsertRowid?: number;
}

interface DatabaseAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  execute(sql: string, params?: any[]): Promise<DatabaseResult>;
}

class SimpleSQLiteAdapter implements DatabaseAdapter {
  private db: any = null;

  constructor(private config: { database: string }) {}

  async connect(): Promise<void> {
    const sqlite3 = await import('sqlite3');
    const Database = (sqlite3 as any).Database || (sqlite3 as any).default?.Database || (sqlite3 as any).default;
    this.db = new Database(this.config.database);
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
}

interface Entity {
  id: number;
}

class SimpleRepository<T extends Entity> {
  constructor(
    private adapter: DatabaseAdapter,
    private tableName: string
  ) {}

  async create(data: Omit<T, 'id'>): Promise<T> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map(() => '?');

    const sql = `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;
    const result = await this.adapter.execute(sql, values);

    return { ...data, id: result.lastInsertRowid! } as T;
  }

  async findById(id: number): Promise<T | null> {
    const result = await this.adapter.execute(
      `SELECT * FROM ${this.tableName} WHERE id = ?`,
      [id]
    );
    return result.rows[0] || null;
  }

  async find(options: { where?: Partial<T>; limit?: number; orderBy?: string } = {}): Promise<T[]> {
    let sql = `SELECT * FROM ${this.tableName}`;
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

    const result = await this.adapter.execute(sql, params);
    return result.rows;
  }

  async update(id: number, data: Partial<T>): Promise<void> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const setClause = columns.map(col => `${col} = ?`).join(', ');

    const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`;
    await this.adapter.execute(sql, [...values, id]);
  }

  async delete(id: number): Promise<void> {
    await this.adapter.execute(
      `DELETE FROM ${this.tableName} WHERE id = ?`,
      [id]
    );
  }

  async count(options: { where?: Partial<T> } = {}): Promise<number> {
    let sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;
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
// ENTITY TYPES
// =============================================================================

interface User {
  id: number;
  name: string;
  email: string;
  age: number;
  active: boolean;
  created_at: string;
}

interface Post {
  id: number;
  title: string;
  content: string;
  user_id: number;
  published: boolean;
  created_at: string;
}

interface Comment {
  id: number;
  content: string;
  user_id: number;
  post_id: number;
  created_at: string;
}

// =============================================================================
// BUSINESS LOGIC SERVICES
// =============================================================================

class UserService {
  constructor(private userRepo: SimpleRepository<User>) {}

  async createUser(userData: Omit<User, 'id' | 'created_at'>): Promise<User> {
    // Basic validation
    if (!userData.email.includes('@')) {
      throw new Error('Invalid email address');
    }
    if (userData.age < 0 || userData.age > 150) {
      throw new Error('Invalid age');
    }

    return this.userRepo.create({
      ...userData,
      created_at: new Date().toISOString(),
    });
  }

  async getUserWithPosts(userId: number): Promise<{ user: User; posts: Post[] } | null> {
    const user = await this.userRepo.findById(userId);
    if (!user) return null;

    // Note: In a real ORM, this would be done with JOINs
    // For this example, we'll just return the user
    return { user, posts: [] };
  }
}

class PostService {
  constructor(
    private postRepo: SimpleRepository<Post>,
    private userRepo: SimpleRepository<User>
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

  async getPostsWithAuthors(limit = 10): Promise<Array<{ post: Post; author: User }>> {
    const posts = await this.postRepo.find({
      where: { published: true },
      orderBy: 'created_at DESC',
      limit
    });

    const result: Array<{ post: Post; author: User }> = [];

    for (const post of posts) {
      const author = await this.userRepo.findById(post.user_id);
      if (author) {
        result.push({ post, author });
      }
    }

    return result;
  }
}

// =============================================================================
// DATABASE SETUP
// =============================================================================

async function setupDatabase(adapter: DatabaseAdapter): Promise<void> {
  // Users table
  await adapter.execute(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      age INTEGER NOT NULL,
      active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Posts table
  await adapter.execute(`
    CREATE TABLE posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      published BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Comments table
  await adapter.execute(`
    CREATE TABLE comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      post_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (post_id) REFERENCES posts(id)
    )
  `);
}

// =============================================================================
// MAIN APPLICATION
// =============================================================================

async function main(): Promise<void> {
  console.log('📚 NeatORM Basic CRUD Example\n');

  try {
    // Setup database
    const adapter = new SimpleSQLiteAdapter({ database: ':memory:' });
    await adapter.connect();
    await setupDatabase(adapter);

    console.log('✅ Database setup complete');

    // Initialize repositories and services
    const userRepo = new SimpleRepository<User>(adapter, 'users');
    const postRepo = new SimpleRepository<Post>(adapter, 'posts');
    const commentRepo = new SimpleRepository<Comment>(adapter, 'comments');

    const userService = new UserService(userRepo);
    const postService = new PostService(postRepo, userRepo);

    console.log('✅ Services initialized');

    // ========================================
    // USER CRUD OPERATIONS
    // ========================================

    console.log('\n👥 User CRUD Operations:');

    // Create users
    const alice = await userService.createUser({
      name: 'Alice Johnson',
      email: 'alice@example.com',
      age: 28,
      active: true,
    });

    const bob = await userService.createUser({
      name: 'Bob Smith',
      email: 'bob@example.com',
      age: 32,
      active: true,
    });

    const charlie = await userService.createUser({
      name: 'Charlie Brown',
      email: 'charlie@example.com',
      age: 25,
      active: false, // Inactive user
    });

    console.log(`✅ Created users: ${alice.name}, ${bob.name}, ${charlie.name}`);

    // Read operations
    const allUsers = await userRepo.find();
    console.log(`✅ Total users: ${allUsers.length}`);

    const activeUsers = await userRepo.find({ where: { active: true } });
    console.log(`✅ Active users: ${activeUsers.length}`);

    const userCount = await userRepo.count();
    console.log(`✅ User count: ${userCount}`);

    // Update user
    await userRepo.update(alice.id, { age: 29 });
    const updatedAlice = await userRepo.findById(alice.id);
    console.log(`✅ Updated Alice age: ${updatedAlice?.age}`);

    // ========================================
    // POST CRUD OPERATIONS
    // ========================================

    console.log('\n📝 Post CRUD Operations:');

    // Create posts
    const post1 = await postService.createPost({
      title: 'Getting Started with NeatORM',
      content: 'NeatORM is a powerful TypeScript ORM...',
      user_id: alice.id,
      published: true,
    });

    const post2 = await postService.createPost({
      title: 'Advanced Database Patterns',
      content: 'Learn about advanced database patterns...',
      user_id: bob.id,
      published: true,
    });

    const draftPost = await postService.createPost({
      title: 'Draft Article',
      content: 'This is a draft...',
      user_id: alice.id,
      published: false,
    });

    console.log(`✅ Created posts: "${post1.title}", "${post2.title}", "${draftPost.title}"`);

    // Query posts with relationships
    const publishedPosts = await postService.getPostsWithAuthors(5);
    console.log(`✅ Found ${publishedPosts.length} published posts with authors`);

    for (const { post, author } of publishedPosts) {
      console.log(`   📄 "${post.title}" by ${author.name}`);
    }

    // Update post
    await postRepo.update(post1.id, {
      title: 'Getting Started with NeatORM - Updated'
    });
    console.log('✅ Updated post title');

    // ========================================
    // COMMENT CRUD OPERATIONS
    // ========================================

    console.log('\n💬 Comment CRUD Operations:');

    // Create comments
    const comment1 = await commentRepo.create({
      content: 'Great article! Very helpful.',
      user_id: bob.id,
      post_id: post1.id,
      created_at: new Date().toISOString(),
    });

    const comment2 = await commentRepo.create({
      content: 'Thanks for sharing this knowledge.',
      user_id: charlie.id,
      post_id: post1.id,
      created_at: new Date().toISOString(),
    });

    console.log(`✅ Created ${await commentRepo.count()} comments`);

    // Query comments for a post
    const postComments = await commentRepo.find({
      where: { post_id: post1.id },
      orderBy: 'created_at DESC'
    });
    console.log(`✅ Post has ${postComments.length} comments`);

    // ========================================
    // COMPLEX QUERIES
    // ========================================

    console.log('\n🔍 Complex Queries:');

    // Get posts by specific user
    const alicePosts = await postRepo.find({
      where: { user_id: alice.id },
      orderBy: 'created_at DESC'
    });
    console.log(`✅ Alice has ${alicePosts.length} posts`);

    // Get recent comments
    const recentComments = await commentRepo.find({
      limit: 3,
      orderBy: 'created_at DESC'
    });
    console.log(`✅ Recent comments: ${recentComments.length}`);

    // Count posts by user
    const alicePostCount = await postRepo.count({ where: { user_id: alice.id } });
    console.log(`✅ Alice post count: ${alicePostCount}`);

    // ========================================
    // ERROR HANDLING
    // ========================================

    console.log('\n🚨 Error Handling:');

    try {
      await userService.createUser({
        name: 'Invalid User',
        email: 'invalid-email',
        age: -5,
        active: true,
      });
    } catch (error) {
      console.log(`✅ Caught validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    try {
      await postService.createPost({
        title: 'Post for non-existent user',
        content: 'This should fail',
        user_id: 99999, // Non-existent user
        published: true,
      });
    } catch (error) {
      console.log(`✅ Caught foreign key error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // ========================================
    // CLEANUP OPERATIONS
    // ========================================

    console.log('\n🧹 Cleanup Operations:');

    // Delete a comment
    await commentRepo.delete(comment2.id);
    console.log('✅ Deleted comment');

    // Delete a post (this should cascade or fail due to foreign key)
    try {
      await postRepo.delete(draftPost.id);
      console.log('✅ Deleted draft post');
    } catch (error) {
      console.log(`⚠️  Could not delete post (foreign key constraint): ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Delete user (should fail due to foreign key constraints)
    try {
      await userRepo.delete(alice.id);
      console.log('✅ Deleted user');
    } catch (error) {
      console.log(`⚠️  Could not delete user (foreign key constraint): ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Final counts
    const finalUserCount = await userRepo.count();
    const finalPostCount = await postRepo.count();
    const finalCommentCount = await commentRepo.count();

    console.log(`\n📊 Final counts:`);
    console.log(`   👥 Users: ${finalUserCount}`);
    console.log(`   📝 Posts: ${finalPostCount}`);
    console.log(`   💬 Comments: ${finalCommentCount}`);

    // Cleanup
    await adapter.disconnect();
    console.log('✅ Database disconnected');

    console.log('\n🎉 Basic CRUD example completed successfully!');
    console.log('✅ Demonstrated: Create, Read, Update, Delete operations');
    console.log('✅ Demonstrated: Relationships, validation, error handling');
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
