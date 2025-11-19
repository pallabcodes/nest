/**
 * Seed Manager
 *
 * Handles database seeding operations.
 *
 * @module cli/utils/seed-manager
 */

import fs from 'fs-extra';
import path from 'path';
import { DatabaseManager } from './database-manager.js';

export interface SeedFile {
  name: string;
  path: string;
}

/**
 * Seed Manager
 *
 * Manages seed files and their execution.
 */
export class SeedManager {
  constructor(
    private dbManager: DatabaseManager,
    private seedsDir: string = 'seeds'
  ) {}

  /**
   * Get all seed files
   */
  async getSeeds(): Promise<SeedFile[]> {
    const seedsPath = path.resolve(this.seedsDir);

    if (!(await fs.pathExists(seedsPath))) {
      return [];
    }

    const files = await fs.readdir(seedsPath);
    const seedFiles: SeedFile[] = [];

    for (const file of files) {
      if (file.endsWith('.js') || file.endsWith('.ts')) {
        const filePath = path.join(seedsPath, file);
        seedFiles.push({
          name: file.replace(/\.(js|ts)$/, ''),
          path: filePath,
        });
      }
    }

    return seedFiles.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Get specific seed file
   */
  async getSeed(name: string): Promise<SeedFile | null> {
    const seeds = await this.getSeeds();
    return seeds.find(seed => seed.name === name) || null;
  }

  /**
   * Run a seed
   */
  async runSeed(seed: SeedFile): Promise<void> {
    const seedModule = await this.loadSeed(seed.path);

    if (seedModule.run) {
      await seedModule.run(this.dbManager.getAdapter());
    }
  }

  /**
   * Create a new seed file
   */
  async createSeed(name: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0].replace('T', '');
    const filename = `${timestamp}_${name}.js`;
    const filepath = path.join(this.seedsDir, filename);

    // Ensure seeds directory exists
    await fs.ensureDir(this.seedsDir);

    // Generate seed content
    const content = `/**
 * Seed: ${name}
 * Generated at: ${new Date().toISOString()}
 */

export async function run(adapter) {
  // Add seed data here
  await adapter.execute(\`
    INSERT INTO users (email, name) VALUES
    ('admin@example.com', 'Admin User'),
    ('user@example.com', 'Regular User')
  \`);
}
`;

    await fs.writeFile(filepath, content);

    return filepath;
  }

  /**
   * Load a seed module
   */
  private async loadSeed(filepath: string): Promise<any> {
    try {
      const module = await import(path.resolve(filepath));
      return module.default || module;
    } catch (error) {
      throw new Error(`Failed to load seed ${filepath}: ${error}`);
    }
  }
}
