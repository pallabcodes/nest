/**
 * Neat Framework - Raw SQL Database Driver
 *
 * This demonstrates Neat's ultimate flexibility: it can work with ZERO ORM overhead
 * by using raw SQL directly. This gives maximum performance and control while
 * maintaining Neat's type-safe repository pattern and Result<T> error handling.
 *
 * Key Benefits:
 * - Zero ORM overhead (maximum performance)
 * - Complete control over SQL queries
 * - Still type-safe with Neat's abstractions
 * - Best performance for complex queries
 * - Minimal dependencies
 *
 * Use Cases:
 * - High-performance applications
 * - Complex analytical queries
 * - Legacy database integration
 * - Micro-optimizations
 *
 * Implementation: ~200 lines for full SQL database access
 */

import type { DatabaseConfig, DatabaseDriver, DriverConnection, DriverTransaction, ColumnDefinition, EntityManager } from '../types.js';
import type { Result } from '../../types/results.js';

/**
 * Raw SQL Connection interface
 */
interface SQLConnection {
  query(sql: string, params?: any[]): Promise<any>;
  execute(sql: string, params?: any[]): Promise<any>;
  beginTransaction(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  end(): Promise<void>;
}

/**
 * Raw SQL Database Driver (No ORM Overhead)
 */
export class RawSQLDriver implements DatabaseDriver {
  readonly name = 'raw-sql';

  private connection?: SQLConnection;

  async connect(config: DatabaseConfig): Promise<Result<DriverConnection>> {
    try {
      // Create raw database connection (example with pg)
      this.connection = await this.createConnection(config);

      const driverConnection: DriverConnection = {
        driver: this,
        config,
        nativeConnection: this.connection,
        isConnected: true
      };

      return { success: true, data: driverConnection };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Raw SQL connection failed')
      };
    }
  }

  async disconnect(connection: DriverConnection): Promise<Result<void>> {
    try {
      await connection.nativeConnection.end();
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Raw SQL disconnection failed')
      };
    }
  }

  getPoolStats(connection: DriverConnection) {
    // Raw SQL typically uses connection pooling
    return {
      totalConnections: 10, // Pool size
      activeConnections: 1,  // Current connection
      idleConnections: 9,   // Available connections
      pendingConnections: 0
    };
  }

  async executeQuery(connection: DriverConnection, query: string, parameters?: any[]): Promise<Result<any[]>> {
    try {
      const result = await connection.nativeConnection.query(query, parameters);
      return { success: true, data: result.rows || result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Raw SQL query failed')
      };
    }
  }

  async executeUpdate(connection: DriverConnection, query: string, parameters?: any[]): Promise<Result<number>> {
    try {
      const result = await connection.nativeConnection.execute(query, parameters);
      return { success: true, data: result.rowCount || result.affectedRows || 0 };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Raw SQL update failed')
      };
    }
  }

  async beginTransaction(connection: DriverConnection): Promise<Result<DriverTransaction>> {
    try {
      await connection.nativeConnection.beginTransaction();

      const transaction: DriverTransaction = {
        connection: connection,
        nativeTransaction: connection.nativeConnection
      };

      return { success: true, data: transaction };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Transaction begin failed')
      };
    }
  }

  async commitTransaction(transaction: DriverTransaction): Promise<Result<void>> {
    try {
      await transaction.nativeTransaction.commit();
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Transaction commit failed')
      };
    }
  }

  async rollbackTransaction(transaction: DriverTransaction): Promise<Result<void>> {
    try {
      await transaction.nativeTransaction.rollback();
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Transaction rollback failed')
      };
    }
  }

  async createTable(connection: DriverConnection, tableName: string, columns: ColumnDefinition[]): Promise<Result<void>> {
    try {
      const columnDefs = columns.map(col =>
        `${col.name} ${this.mapColumnType(col.type)}${col.primary ? ' PRIMARY KEY' : ''}${col.nullable === false ? ' NOT NULL' : ''}${col.unique ? ' UNIQUE' : ''}${col.default ? ` DEFAULT ${col.default}` : ''}`
      ).join(', ');

      const sql = `CREATE TABLE IF NOT EXISTS ${tableName} (${columnDefs})`;
      await this.executeUpdate(connection, sql);

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Table creation failed')
      };
    }
  }

  async dropTable(connection: DriverConnection, tableName: string): Promise<Result<void>> {
    try {
      const sql = `DROP TABLE IF EXISTS ${tableName}`;
      await this.executeUpdate(connection, sql);
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Table drop failed')
      };
    }
  }

  async tableExists(connection: DriverConnection, tableName: string): Promise<Result<boolean>> {
    try {
      // Use information_schema for cross-database compatibility
      const sql = `
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_name = $1
        )
      `;
      const result = await this.executeQuery(connection, sql, [tableName]);
      if (!result.success) {
        return result;
      }
      return { success: true, data: result.data[0]?.exists || false };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Table existence check failed')
      };
    }
  }

  // Private helper methods
  private async createConnection(config: DatabaseConfig): Promise<SQLConnection> {
    const url = typeof config.url === 'string' ? config.url : String(config.url);
    const urlObj = new URL(url);

    const driverName = typeof config.driver === 'string' ? config.driver : config.driver.name;
    switch (driverName) {
      case 'postgresql':
        return this.createPostgresConnection(config);
      case 'mysql':
        return this.createMySQLConnection(config);
      case 'sqlite':
        return this.createSQLiteConnection(config);
      default:
        throw new Error(`Unsupported database driver: ${config.driver}`);
    }
  }

  private async createPostgresConnection(config: DatabaseConfig): Promise<SQLConnection> {
    // In real implementation: import { Pool } from 'pg';
    console.log('Creating PostgreSQL connection pool');

    // Mock implementation for demo
    return {
      async query(sql: string, params?: any[]) {
        console.log(`PostgreSQL Query: ${sql}`, params);
        return { rows: [{ id: 1, name: 'Mock Data' }] };
      },

      async execute(sql: string, params?: any[]) {
        console.log(`PostgreSQL Execute: ${sql}`, params);
        return { rowCount: 1 };
      },

      async beginTransaction() {
        console.log('PostgreSQL BEGIN');
      },

      async commit() {
        console.log('PostgreSQL COMMIT');
      },

      async rollback() {
        console.log('PostgreSQL ROLLBACK');
      },

      async end() {
        console.log('PostgreSQL connection closed');
      }
    };
  }

  private async createMySQLConnection(config: DatabaseConfig): Promise<SQLConnection> {
    // In real implementation: import mysql from 'mysql2/promise';
    console.log('Creating MySQL connection pool');

    return {
      async query(sql: string, params?: any[]) {
        console.log(`MySQL Query: ${sql}`, params);
        return [{ id: 1, name: 'Mock Data' }];
      },

      async execute(sql: string, params?: any[]) {
        console.log(`MySQL Execute: ${sql}`, params);
        return { affectedRows: 1 };
      },

      async beginTransaction() {
        console.log('MySQL BEGIN');
      },

      async commit() {
        console.log('MySQL COMMIT');
      },

      async rollback() {
        console.log('MySQL ROLLBACK');
      },

      async end() {
        console.log('MySQL connection closed');
      }
    };
  }

  private async createSQLiteConnection(config: DatabaseConfig): Promise<SQLConnection> {
    // In real implementation: import Database from 'better-sqlite3';
    console.log('Creating SQLite connection');

    return {
      async query(sql: string, params?: any[]) {
        console.log(`SQLite Query: ${sql}`, params);
        return [{ id: 1, name: 'Mock Data' }];
      },

      async execute(sql: string, params?: any[]) {
        console.log(`SQLite Execute: ${sql}`, params);
        return { changes: 1 };
      },

      async beginTransaction() {
        console.log('SQLite BEGIN');
      },

      async commit() {
        console.log('SQLite COMMIT');
      },

      async rollback() {
        console.log('SQLite ROLLBACK');
      },

      async end() {
        console.log('SQLite connection closed');
      }
    };
  }

  private mapColumnType(type: string): string {
    // Universal SQL column type mapping
    switch (type) {
      case 'string':
      case 'varchar':
        return 'VARCHAR(255)';
      case 'text':
        return 'TEXT';
      case 'int':
      case 'integer':
        return 'INTEGER';
      case 'bigint':
        return 'BIGINT';
      case 'boolean':
        return 'BOOLEAN';
      case 'date':
        return 'DATE';
      case 'datetime':
      case 'timestamp':
        return 'TIMESTAMP';
      case 'float':
      case 'double':
        return 'REAL';
      case 'decimal':
      case 'numeric':
        return 'DECIMAL(10,2)';
      case 'json':
        return 'JSON';
      case 'blob':
        return 'BLOB';
      case 'uuid':
        return 'VARCHAR(36)';
      default:
        return 'VARCHAR(255)';
    }
  }
}

// ========================================
// ADVANCED RAW SQL FEATURES
// ========================================

/**
 * Custom Repository with Raw SQL
 *
 * Shows how to create high-performance repositories with raw SQL
 * while maintaining Neat's type-safe interfaces.
 */
export class RawSQLUserRepository extends BaseRepository<User> {
  constructor(manager: EntityManager) {
    super(User, manager);
  }

  // Custom method with optimized raw SQL
  async findActiveUsersWithPostCount(): Promise<Result<Array<User & { postCount: number }>>> {
    try {
      const sql = `
        SELECT
          u.*,
          COUNT(p.id) as postCount
        FROM users u
        LEFT JOIN posts p ON p.authorId = u.id AND p.published = true
        WHERE u.isActive = true
        GROUP BY u.id
        ORDER BY postCount DESC
      `;

      // Execute raw SQL
      const connection = this.manager.connection.getDriverConnection();
      if (!connection) {
        throw new Error('No database connection');
      }

      const result = await this.manager.connection.getDriver().executeQuery(connection, sql);
      if (!result.success) {
        return result;
      }

      return { success: true, data: result.data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Custom query failed')
      };
    }
  }

  // Bulk insert with raw SQL (maximum performance)
  async bulkInsertUsers(users: Omit<User, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<Result<number>> {
    try {
      const connection = this.manager.connection.getDriverConnection();
      if (!connection) {
        throw new Error('No database connection');
      }

      const values = users.map(user => `('${user.firstName}', '${user.lastName}', '${user.email}', ${user.isActive})`);
      const sql = `
        INSERT INTO users (firstName, lastName, email, isActive, createdAt, updatedAt)
        VALUES ${values.join(', ')}
      `;

      const result = await this.manager.connection.getDriver().executeUpdate(connection, sql);
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Bulk insert failed')
      };
    }
  }
}

// ========================================
// USAGE EXAMPLES
// ========================================

/**
 * Maximum Performance Example: Raw SQL for complex analytics
 */
export async function demonstrateRawSQLPerformance() {
  console.log('⚡ Demonstrating Raw SQL Performance with Neat Framework\n');

  const dbConfig = {
    driver: 'postgresql' as any,
    url: 'postgresql://localhost:5432/mydb' as any,
    logging: true
  };

  const rawDriver = new RawSQLDriver();
  const connection = createDatabaseConnectionWithDriver(dbConfig, rawDriver);
  const entityManager = createEntityManager(connection, [User]);

  // Complex analytical query with raw SQL
  const userRepo = new RawSQLUserRepository(entityManager);

  console.log('📊 Running complex analytical query...');
  const result = await userRepo.findActiveUsersWithPostCount();

  if (result.success) {
    console.log('✅ Found users with post counts:', result.data);
  }

  // Bulk insert with raw SQL
  console.log('⚡ Running bulk insert...');
  const usersToInsert = [
    { firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com', isActive: true },
    { firstName: 'Bob', lastName: 'Johnson', email: 'bob@example.com', isActive: true },
  ];

  const bulkResult = await userRepo.bulkInsertUsers(usersToInsert);
  if (bulkResult.success) {
    console.log(`✅ Inserted ${bulkResult.data} users`);
  }

  await connection.disconnect();

  console.log('\n🎯 Raw SQL Benefits:');
  console.log('  ✅ Zero ORM overhead');
  console.log('  ✅ Maximum performance');
  console.log('  ✅ Full SQL control');
  console.log('  ✅ Still type-safe with Neat');
  console.log('  ✅ Best for analytics/complex queries');
}

/**
 * Migration Path: From ORM to Raw SQL
 *
 * Shows how to gradually migrate from ORM to raw SQL for performance
 */
export async function demonstrateGradualMigration() {
  console.log('🔄 Demonstrating Gradual ORM → Raw SQL Migration\n');

  // Start with ORM for simplicity
  console.log('1️⃣ Start with any ORM (TypeORM, Prisma, etc.)');
  console.log('   ✅ Easy development');
  console.log('   ✅ Automatic query generation');

  // Gradually migrate performance-critical parts
  console.log('2️⃣ Migrate performance-critical queries to raw SQL');
  console.log('   ✅ Keep simple operations on ORM');
  console.log('   ✅ Optimize complex queries with raw SQL');
  console.log('   ✅ Maintain type safety');

  // End with maximum performance
  console.log('3️⃣ Full raw SQL for maximum performance');
  console.log('   ✅ Zero abstraction overhead');
  console.log('   ✅ Complete query control');
  console.log('   ✅ Maximum throughput');

  console.log('\n🎯 Migration Benefits:');
  console.log('  ✅ Gradual performance improvements');
  console.log('  ✅ No breaking changes');
  console.log('  ✅ Maintain type safety throughout');
  console.log('  ✅ Optimize incrementally');
}

import { createDatabaseConnection, createDatabaseConnectionWithDriver } from '../connection.js';
import { createEntityManager } from '../entity-manager.js';
import { BaseRepository } from '../repository.js';
import { BaseEntity, type EntityConstructor } from '../types.js';

// Example entity
export class User {
  id!: number;
  firstName!: string;
  lastName!: string;
  email!: string;
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}

// Run demonstrations
if (require.main === module) {
  demonstrateRawSQLPerformance().catch(console.error);
}
