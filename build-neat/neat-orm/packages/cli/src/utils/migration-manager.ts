/**
 * Migration Manager
 *
 * Handles migration files, checksums, and execution tracking.
 *
 * @module cli/utils/migration-manager
 */

import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import { DatabaseManager } from './database-manager.js';

export interface MigrationFile {
  name: string;
  path: string;
  checksum: string;
  timestamp: number;
}

export interface MigrationStatus {
  name: string;
  status: 'pending' | 'executed';
  checksum?: string;
  executedAt?: Date;
}

/**
 * Migration Manager
 *
 * Manages migration files and their execution status.
 */
export class MigrationManager {
  constructor(
    private dbManager: DatabaseManager,
    private migrationsDir: string = 'migrations'
  ) {}

  /**
   * Get all migration files
   */
  async getMigrationFiles(): Promise<MigrationFile[]> {
    const migrationsPath = path.resolve(this.migrationsDir);

    if (!(await fs.pathExists(migrationsPath))) {
      return [];
    }

    const files = await fs.readdir(migrationsPath);
    const migrationFiles: MigrationFile[] = [];

    for (const file of files) {
      if (file.endsWith('.js') || file.endsWith('.ts')) {
        const filePath = path.join(migrationsPath, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const checksum = this.calculateChecksum(content);

        // Extract timestamp from filename (format: YYYYMMDDHHMMSS_description.js)
        const timestampMatch = file.match(/^(\d{14})_/);
        const timestamp = timestampMatch ? parseInt(timestampMatch[1], 10) : 0;

        migrationFiles.push({
          name: file.replace(/\.(js|ts)$/, ''),
          path: filePath,
          checksum,
          timestamp,
        });
      }
    }

    // Sort by timestamp
    return migrationFiles.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Get migration status for all migrations
   */
  async getMigrationStatus(): Promise<MigrationStatus[]> {
    const [files, executed] = await Promise.all([
      this.getMigrationFiles(),
      this.dbManager.getExecutedMigrations(),
    ]);

    const executedMap = new Map(executed.map(m => [m.name, m]));

    return files.map(file => {
      const executedInfo = executedMap.get(file.name);

      return {
        name: file.name,
        status: executedInfo ? 'executed' : 'pending',
        checksum: executedInfo?.checksum,
        executedAt: executedInfo ? new Date() : undefined, // TODO: store actual timestamp
      };
    });
  }

  /**
   * Get pending migrations
   */
  async getPendingMigrations(): Promise<MigrationFile[]> {
    const [files, executed] = await Promise.all([
      this.getMigrationFiles(),
      this.dbManager.getExecutedMigrations(),
    ]);

    const executedNames = new Set(executed.map(m => m.name));

    return files.filter(file => !executedNames.has(file.name));
  }

  /**
   * Execute a migration
   */
  async executeMigration(migration: MigrationFile): Promise<void> {
    const migrationModule = await this.loadMigration(migration.path);

    if (migrationModule.up) {
      await migrationModule.up(this.dbManager.getAdapter());
    }

    await this.dbManager.recordMigration(migration.name, migration.checksum);
  }

  /**
   * Rollback a migration
   */
  async rollbackMigration(migration: MigrationFile): Promise<void> {
    const migrationModule = await this.loadMigration(migration.path);

    if (migrationModule.down) {
      await migrationModule.down(this.dbManager.getAdapter());
    }

    await this.dbManager.removeMigration(migration.name);
  }

  /**
   * Create a new migration file
   */
  async createMigration(name: string, template: string = 'basic'): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0].replace('T', '');
    const filename = `${timestamp}_${name}.js`;
    const filepath = path.join(this.migrationsDir, filename);

    // Ensure migrations directory exists
    await fs.ensureDir(this.migrationsDir);

    // Generate migration content
    const content = this.generateMigrationTemplate(name, template);

    await fs.writeFile(filepath, content);

    return filepath;
  }

  /**
   * Load a migration module
   */
  private async loadMigration(filepath: string): Promise<any> {
    try {
      const module = await import(path.resolve(filepath));
      return module.default || module;
    } catch (error) {
      throw new Error(`Failed to load migration ${filepath}: ${error}`);
    }
  }

  /**
   * Calculate checksum for migration content
   */
  private calculateChecksum(content: string): string {
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Generate migration template
   */
  private generateMigrationTemplate(name: string, template: string): string {
    const className = name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');

    return `/**
 * Migration: ${name}
 * Generated at: ${new Date().toISOString()}
 */

export async function up(adapter) {
  // Add migration logic here
  await adapter.execute(\`
    -- Example: Create a users table
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  \`);
}

export async function down(adapter) {
  // Add rollback logic here
  await adapter.execute(\`
    DROP TABLE IF EXISTS users
  \`);
}
`;
  }
}
