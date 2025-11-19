/**
 * Migrate Command
 *
 * Handles database migrations including run, rollback, and status.
 *
 * @module cli/commands/migrate
 */

import path from 'path';
import { Command } from 'commander';
import { cli } from '../framework/cli.js';
import { DatabaseManager } from '../utils/database-manager.js';
import { MigrationManager } from '../utils/migration-manager.js';

/**
 * Migrate Command
 *
 * Provides migration-related CLI commands.
 */
export class MigrateCommand {
  private dbManager = new DatabaseManager();
  private migrationManager!: MigrationManager;

  /**
   * Get the commander command instance
   */
  getCommand(): Command {
    const command = new Command('migrate')
      .description('Manage database migrations');

    command
      .command('up')
      .description('Run pending migrations')
      .option('--step <number>', 'number of migrations to run', parseInt)
      .action(this.runUp.bind(this));

    command
      .command('down')
      .description('Rollback migrations')
      .option('--step <number>', 'number of migrations to rollback', parseInt, 1)
      .action(this.runDown.bind(this));

    command
      .command('status')
      .description('Show migration status')
      .action(this.showStatus.bind(this));

    command
      .command('create <name>')
      .description('Create a new migration file')
      .option('--template <template>', 'migration template to use', 'basic')
      .action(this.createMigration.bind(this));

    return command;
  }

  /**
   * Run pending migrations
   */
  private async runUp(options: { step?: number }): Promise<void> {
    const config = cli.getConfig();
    const spinner = cli.startSpinner('Running migrations...');

    try {
      await this.dbManager.connect(config);
      this.migrationManager = new MigrationManager(this.dbManager, config.migrationsDir);

      const pendingMigrations = await this.migrationManager.getPendingMigrations();
      const toRun = options.step ? pendingMigrations.slice(0, options.step) : pendingMigrations;

      if (toRun.length === 0) {
        spinner.succeed('No pending migrations to run');
        return;
      }

      spinner.text = `Running ${toRun.length} migration(s)...`;

      for (const migration of toRun) {
        if (config.dryRun) {
          cli.info(`Would execute migration: ${migration.name}`);
        } else {
          await this.migrationManager.executeMigration(migration);
          cli.success(`Executed migration: ${migration.name}`);
        }
      }

      spinner.succeed(`Successfully ran ${toRun.length} migration(s)`);

    } catch (error) {
      spinner.fail('Migration failed');
      cli.error('Migration execution failed', error);
    } finally {
      await this.dbManager.disconnect();
    }
  }

  /**
   * Rollback migrations
   */
  private async runDown(options: { step: number }): Promise<void> {
    const config = cli.getConfig();
    const spinner = cli.startSpinner('Rolling back migrations...');

    try {
      await this.dbManager.connect(config);
      this.migrationManager = new MigrationManager(this.dbManager, config.migrationsDir);

      const executedMigrations = await this.dbManager.getExecutedMigrations();
      const toRollback = executedMigrations.slice(-options.step).reverse();

      if (toRollback.length === 0) {
        spinner.succeed('No migrations to rollback');
        return;
      }

      // Get migration files for rollback
      const migrationFiles = await this.migrationManager.getMigrationFiles();
      const rollbackFiles = toRollback
        .map(executed => migrationFiles.find(f => f.name === executed.name))
        .filter(Boolean);

      spinner.text = `Rolling back ${rollbackFiles.length} migration(s)...`;

      for (const migration of rollbackFiles) {
        if (!migration) continue;

        if (config.dryRun) {
          cli.info(`Would rollback migration: ${migration.name}`);
        } else {
          await this.migrationManager.rollbackMigration(migration);
          cli.success(`Rolled back migration: ${migration.name}`);
        }
      }

      spinner.succeed(`Successfully rolled back ${rollbackFiles.length} migration(s)`);

    } catch (error) {
      spinner.fail('Rollback failed');
      cli.error('Migration rollback failed', error);
    } finally {
      await this.dbManager.disconnect();
    }
  }

  /**
   * Show migration status
   */
  private async showStatus(): Promise<void> {
    const config = cli.getConfig();

    try {
      await this.dbManager.connect(config);
      this.migrationManager = new MigrationManager(this.dbManager, config.migrationsDir);

      const status = await this.migrationManager.getMigrationStatus();

      if (status.length === 0) {
        cli.info('No migrations found');
        return;
      }

      console.log('\nMigration Status:');
      console.log('================');

      for (const migration of status) {
        const statusIcon = migration.status === 'executed' ? '✓' : '○';
        const statusColor = migration.status === 'executed' ? 'green' : 'yellow';
        const statusText = migration.status.toUpperCase();

        console.log(`${statusIcon} ${migration.name} [${statusText}]`);
      }

      const executed = status.filter(s => s.status === 'executed').length;
      const pending = status.filter(s => s.status === 'pending').length;

      console.log(`\nSummary: ${executed} executed, ${pending} pending\n`);

    } catch (error) {
      cli.error('Failed to get migration status', error);
    } finally {
      await this.dbManager.disconnect();
    }
  }

  /**
   * Create a new migration file
   */
  private async createMigration(name: string, options: { template: string }): Promise<void> {
    const config = cli.getConfig();
    const spinner = cli.startSpinner('Creating migration...');

    try {
      const migrationManager = new MigrationManager(this.dbManager, config.migrationsDir);
      const filepath = await migrationManager.createMigration(name, options.template);

      spinner.succeed(`Created migration: ${path.relative(process.cwd(), filepath)}`);
      cli.info('Edit the migration file and run `neat-orm migrate up` to execute it');

    } catch (error) {
      spinner.fail('Failed to create migration');
      cli.error('Migration creation failed', error);
    }
  }
}
