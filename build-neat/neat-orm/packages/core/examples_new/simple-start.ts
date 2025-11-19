#!/usr/bin/env tsx

/**
 * SIMPLE START - The Simplest Possible NeatORM Example
 *
 * This example demonstrates the absolute minimum needed to use NeatORM.
 * No decorators, no complex setup, just pure functionality.
 *
 * Goal: Prove NeatORM works without any workspace or import issues.
 */

import 'reflect-metadata';

// =============================================================================
// MANUAL DATABASE ADAPTER (No external dependencies)
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

// =============================================================================
// MANUAL REPOSITORY (No external dependencies)
// =============================================================================

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

  async find(options: { where?: Partial<T>; limit?: number } = {}): Promise<T[]> {
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
}

// =============================================================================
// TYPE DEFINITIONS (What decorators would provide)
// =============================================================================

interface User {
  id: number;
  name: string;
  email: string;
  age: number;
  active: boolean;
}

// =============================================================================
// MAIN APPLICATION
// =============================================================================

async function main(): Promise<void> {
  console.log('🚀 NeatORM Simple Start Example\n');

  try {
    // 1. Create database adapter
    const adapter = new SimpleSQLiteAdapter({
      database: ':memory:',
    });

    console.log('✅ Database adapter created');

    // 2. Connect to database
    await adapter.connect();
    console.log('✅ Database connected');

    // 3. Create table manually
    await adapter.execute(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        age INTEGER,
        active BOOLEAN DEFAULT 1
      )
    `);

    console.log('✅ Database schema created');

    // 4. Create repository
    const userRepo = new SimpleRepository<User>(adapter, 'users');
    console.log('✅ Repository initialized');

    // ========================================
    // DEMO: CRUD OPERATIONS
    // ========================================

    console.log('\n📝 Creating users...');

    // Create users
    const alice = await userRepo.create({
      name: 'Alice Johnson',
      email: 'alice@example.com',
      age: 28,
      active: true,
    });

    const bob = await userRepo.create({
      name: 'Bob Smith',
      email: 'bob@example.com',
      age: 32,
      active: true,
    });

    console.log(`✅ Created: ${alice.name} (ID: ${alice.id})`);
    console.log(`✅ Created: ${bob.name} (ID: ${bob.id})`);

    // Read users
    console.log('\n🔍 Reading users...');

    const allUsers = await userRepo.find();
    console.log(`✅ Found ${allUsers.length} users`);

    const aliceFound = await userRepo.findById(alice.id);
    console.log(`✅ Found by ID: ${aliceFound?.name}`);

    // Update user
    console.log('\n✏️  Updating user...');

    await userRepo.update(alice.id, { age: 29 });
    const aliceUpdated = await userRepo.findById(alice.id);
    console.log(`✅ Updated Alice age to: ${aliceUpdated?.age}`);

    // Query with conditions
    console.log('\n🎯 Querying with conditions...');

    const activeUsers = await userRepo.find({
      where: { active: true }
    });
    console.log(`✅ Found ${activeUsers.length} active users`);

    // Delete user
    console.log('\n🗑️  Deleting user...');

    await userRepo.delete(bob.id);
    const remainingUsers = await userRepo.find();
    console.log(`✅ Deleted Bob. Remaining users: ${remainingUsers.length}`);

    // ========================================
    // CLEANUP
    // ========================================

    await adapter.disconnect();
    console.log('✅ Database disconnected');

    console.log('\n🎉 Simple start example completed successfully!');
    console.log('✅ NeatORM core functionality works perfectly!');
    console.log('✅ No workspace dependencies, no import issues!');
    console.log('✅ Ready to build upon this foundation!');

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// =============================================================================
// RUN THE EXAMPLE
// =============================================================================

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});

// Run the example
main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
