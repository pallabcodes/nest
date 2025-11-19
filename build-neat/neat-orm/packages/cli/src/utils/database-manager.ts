/**
 * Database Manager
 *
 * Handles database connections and operations for CLI commands.
 *
 * @module cli/utils/database-manager
 */

import {
  createAdapter,
  type DatabaseAdapter,
  type ConnectionConfig,
} from '@neat-orm/core';
import type { CLIConfig } from '../framework/cli.js';

/**
 * Database Manager
 *
 * Manages database connections and provides utilities for CLI operations.
 */
export class DatabaseManager {
  private adapter?: DatabaseAdapter;

  /**
   * Connect to the database using CLI configuration
   */
  async connect(cliConfig: CLIConfig): Promise<DatabaseAdapter> {
    const config: ConnectionConfig = {
      dialect: cliConfig.dialect || 'sqlite',
      host: cliConfig.host,
      port: cliConfig.port,
      database: cliConfig.database || 'neat_orm.db',
      user: cliConfig.user,
      password: cliConfig.password,
      connectionString: cliConfig.connectionString,
    };

    this.adapter = createAdapter(config);
    await this.adapter.connect();

    return this.adapter;
  }

  /**
   * Disconnect from the database
   */
  async disconnect(): Promise<void> {
    if (this.adapter) {
      await this.adapter.disconnect();
      this.adapter = undefined;
    }
  }

  /**
   * Get the current database adapter
   */
  getAdapter(): DatabaseAdapter {
    if (!this.adapter) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.adapter;
  }

  /**
   * Test database connection
   */
  async testConnection(cliConfig: CLIConfig): Promise<boolean> {
    try {
      await this.connect(cliConfig);
      const isHealthy = await this.adapter!.testConnection();
      await this.disconnect();
      return isHealthy;
    } catch {
      return false;
    }
  }

  /**
   * Execute a raw SQL query
   */
  async executeQuery(sql: string, params?: unknown[]): Promise<any[]> {
    const result = await this.getAdapter().execute(sql, params);
    return result.rows;
  }

  /**
   * Check if a table exists
   */
  async tableExists(tableName: string): Promise<boolean> {
    try {
      const result = await this.executeQuery(
        `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
        [tableName]
      );
      return result.length > 0;
    } catch {
      // For other databases, try information_schema
      try {
        const result = await this.executeQuery(
          `SELECT table_name FROM information_schema.tables WHERE table_name = ?`,
          [tableName]
        );
        return result.length > 0;
      } catch {
        return false;
      }
    }
  }

  /**
   * Create the migrations table if it doesn't exist
   */
  async ensureMigrationsTable(): Promise<void> {
    const tableExists = await this.tableExists('neat_orm_migrations');

    if (!tableExists) {
      await this.executeQuery(`
        CREATE TABLE neat_orm_migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name VARCHAR(255) NOT NULL,
          executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          checksum VARCHAR(255) NOT NULL
        )
      `);
    }
  }

  /**
   * Get executed migrations
   */
  async getExecutedMigrations(): Promise<Array<{ name: string; checksum: string }>> {
    await this.ensureMigrationsTable();

    const result = await this.executeQuery(
      'SELECT name, checksum FROM neat_orm_migrations ORDER BY id ASC'
    );

    return result.map(row => ({
      name: row.name,
      checksum: row.checksum,
    }));
  }

  /**
   * Record a migration as executed
   */
  async recordMigration(name: string, checksum: string): Promise<void> {
    await this.ensureMigrationsTable();

    await this.executeQuery(
      'INSERT INTO neat_orm_migrations (name, checksum) VALUES (?, ?)',
      [name, checksum]
    );
  }

  /**
   * Remove a migration record
   */
  async removeMigration(name: string): Promise<void> {
    await this.executeQuery(
      'DELETE FROM neat_orm_migrations WHERE name = ?',
      [name]
    );
  }
}
