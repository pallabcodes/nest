/**
 * DB Command
 *
 * Handles database connection testing and management.
 *
 * @module cli/commands/db
 */

import { Command } from 'commander';
import { cli } from '../framework/cli.js';
import { DatabaseManager } from '../utils/database-manager.js';

/**
 * DB Command
 *
 * Provides database-related CLI commands.
 */
export class DBCommand {
  private dbManager = new DatabaseManager();

  /**
   * Get the commander command instance
   */
  getCommand(): Command {
    const command = new Command('db')
      .description('Manage database connections');

    command
      .command('test')
      .description('Test database connection')
      .action(this.testConnection.bind(this));

    command
      .command('create')
      .description('Create database if it doesn\'t exist')
      .action(this.createDatabase.bind(this));

    command
      .command('drop')
      .description('Drop database')
      .option('--force', 'force drop without confirmation')
      .action(this.dropDatabase.bind(this));

    return command;
  }

  /**
   * Test database connection
   */
  private async testConnection(): Promise<void> {
    const config = cli.getConfig();
    const spinner = cli.startSpinner('Testing database connection...');

    try {
      const isHealthy = await this.dbManager.testConnection(config);

      if (isHealthy) {
        spinner.succeed('Database connection successful');
        cli.info('Connection details:');
        console.log(`  Dialect: ${config.dialect}`);
        console.log(`  Host: ${config.host || 'N/A'}`);
        console.log(`  Database: ${config.database}`);
        console.log(`  User: ${config.user || 'N/A'}`);
      } else {
        spinner.fail('Database connection failed');
        cli.error('Unable to connect to database. Check your configuration.');
      }

    } catch (error) {
      spinner.fail('Connection test failed');
      cli.error('Database connection test failed', error);
    }
  }

  /**
   * Create database if it doesn't exist
   */
  private async createDatabase(): Promise<void> {
    const config = cli.getConfig();

    if (config.dialect === 'sqlite') {
      cli.info('SQLite database will be created automatically on first use');
      return;
    }

    cli.warn('Database creation is not yet implemented for this dialect');
    cli.info('Please create the database manually or use your database admin tools');
  }

  /**
   * Drop database
   */
  private async dropDatabase(options: { force?: boolean }): Promise<void> {
    const config = cli.getConfig();

    if (!options.force) {
      cli.warn('This will permanently delete the database and all its data!');
      cli.warn('Use --force to skip this confirmation');
      return;
    }

    if (config.dialect === 'sqlite') {
      const fs = await import('fs-extra');
      const spinner = cli.startSpinner('Dropping SQLite database...');

      try {
        if (await fs.pathExists(config.database!)) {
          await fs.remove(config.database!);
          spinner.succeed('SQLite database dropped');
        } else {
          spinner.warn('Database file not found');
        }
      } catch (error) {
        spinner.fail('Failed to drop database');
        cli.error('Database drop failed', error);
      }
    } else {
      cli.warn('Database dropping is not yet implemented for this dialect');
      cli.info('Please drop the database manually or use your database admin tools');
    }
  }
}
