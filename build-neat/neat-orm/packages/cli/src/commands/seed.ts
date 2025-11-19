/**
 * Seed Command
 *
 * Handles database seeding with test data.
 *
 * @module cli/commands/seed
 */

import { Command } from 'commander';
import { cli } from '../framework/cli.js';
import { DatabaseManager } from '../utils/database-manager.js';
import { SeedManager } from '../utils/seed-manager.js';

/**
 * Seed Command
 *
 * Provides seeding-related CLI commands.
 */
export class SeedCommand {
  private dbManager = new DatabaseManager();
  private seedManager!: SeedManager;

  /**
   * Get the commander command instance
   */
  getCommand(): Command {
    const command = new Command('seed')
      .description('Manage database seeds');

    command
      .command('run')
      .description('Run database seeds')
      .option('--seed <name>', 'run specific seed file')
      .action(this.runSeeds.bind(this));

    command
      .command('create <name>')
      .description('Create a new seed file')
      .action(this.createSeed.bind(this));

    return command;
  }

  /**
   * Run database seeds
   */
  private async runSeeds(options: { seed?: string }): Promise<void> {
    const config = cli.getConfig();
    const spinner = cli.startSpinner('Running seeds...');

    try {
      await this.dbManager.connect(config);
      this.seedManager = new SeedManager(this.dbManager, config.seedsDir);

      if (options.seed) {
        const seed = await this.seedManager.getSeed(options.seed);
        if (!seed) {
          spinner.fail(`Seed '${options.seed}' not found`);
          return;
        }

        if (config.dryRun) {
          cli.info(`Would run seed: ${options.seed}`);
        } else {
          await this.seedManager.runSeed(seed);
          cli.success(`Ran seed: ${options.seed}`);
        }
      } else {
        const seeds = await this.seedManager.getSeeds();
        if (seeds.length === 0) {
          spinner.warn('No seeds found');
          return;
        }

        spinner.text = `Running ${seeds.length} seed(s)...`;

        for (const seed of seeds) {
          if (config.dryRun) {
            cli.info(`Would run seed: ${seed.name}`);
          } else {
            await this.seedManager.runSeed(seed);
            cli.success(`Ran seed: ${seed.name}`);
          }
        }
      }

      spinner.succeed('Seeding completed');

    } catch (error) {
      spinner.fail('Seeding failed');
      cli.error('Failed to run seeds', error);
    } finally {
      await this.dbManager.disconnect();
    }
  }

  /**
   * Create a new seed file
   */
  private async createSeed(name: string): Promise<void> {
    const config = cli.getConfig();
    const spinner = cli.startSpinner('Creating seed...');

    try {
      this.seedManager = new SeedManager(this.dbManager, config.seedsDir);
      const filepath = await this.seedManager.createSeed(name);

      spinner.succeed(`Created seed: ${filepath}`);
      cli.info('Edit the seed file and run `neat-orm seed run` to execute it');

    } catch (error) {
      spinner.fail('Failed to create seed');
      cli.error('Seed creation failed', error);
    }
  }
}
