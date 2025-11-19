/**
 * NeatOrm CLI Framework
 *
 * Provides the foundation for CLI commands including configuration loading,
 * command parsing, error handling, and common utilities.
 *
 * @module cli/framework/cli
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';
import { config } from 'dotenv';

// Load environment variables
config();

export interface CLIConfig {
  /**
   * Database dialect (postgres, mysql, sqlite)
   */
  dialect?: 'postgres' | 'mysql' | 'sqlite' | 'sqlserver' | 'oracle';

  /**
   * Database host
   */
  host?: string;

  /**
   * Database port
   */
  port?: number;

  /**
   * Database name
   */
  database?: string;

  /**
   * Database user
   */
  user?: string;

  /**
   * Database password
   */
  password?: string;

  /**
   * Connection string
   */
  connectionString?: string;

  /**
   * Path to migrations directory
   */
  migrationsDir?: string;

  /**
   * Path to entities directory
   */
  entitiesDir?: string;

  /**
   * Path to seeds directory
   */
  seedsDir?: string;

  /**
   * Configuration file path
   */
  configFile?: string;

  /**
   * Whether to enable verbose logging
   */
  verbose?: boolean;

  /**
   * Whether to run in dry-run mode
   */
  dryRun?: boolean;
}

/**
 * CLI Framework
 *
 * Handles command parsing, configuration, and common utilities.
 */
export class CLIFramework {
  private program: Command;
  private config: CLIConfig = {};
  private spinner?: ora.Ora;

  constructor() {
    this.program = new Command();

    // Setup basic program info
    this.program
      .name('neat-orm')
      .description('Enterprise TypeScript ORM CLI')
      .version('0.1.0')
      .option('-c, --config <path>', 'path to config file')
      .option('-v, --verbose', 'enable verbose logging')
      .option('--dry-run', 'run in dry-run mode (no actual changes)')
      .option('--color', 'force color output')
      .option('--no-color', 'disable color output');

    // Global error handling
    this.program.exitOverride();

    this.setupGlobalOptions();
  }

  /**
   * Get the commander program instance
   */
  getProgram(): Command {
    return this.program;
  }

  /**
   * Load configuration from file and environment
   */
  async loadConfig(): Promise<CLIConfig> {
    // Load from environment variables
    const envConfig: Partial<CLIConfig> = {
      dialect: (process.env.DB_DIALECT as any) || (process.env.DATABASE_DIALECT as any),
      host: process.env.DB_HOST || process.env.DATABASE_HOST,
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined,
      database: process.env.DB_NAME || process.env.DB_DATABASE || process.env.DATABASE_NAME,
      user: process.env.DB_USER || process.env.DATABASE_USER,
      password: process.env.DB_PASSWORD || process.env.DATABASE_PASSWORD,
      connectionString: process.env.DATABASE_URL,
      migrationsDir: process.env.MIGRATIONS_DIR || 'migrations',
      entitiesDir: process.env.ENTITIES_DIR || 'src/entities',
      seedsDir: process.env.SEEDS_DIR || 'seeds',
    };

    // Load from config file if specified
    const configFile = this.program.opts().config || 'neat-orm.config.js';
    let fileConfig: Partial<CLIConfig> = {};

    if (await fs.pathExists(configFile)) {
      try {
        const configModule = await import(path.resolve(configFile));
        fileConfig = configModule.default || configModule;
      } catch (error) {
        this.error(`Failed to load config file ${configFile}:`, error);
      }
    }

    // Merge configurations (environment overrides file)
    this.config = {
      ...fileConfig,
      ...envConfig,
      configFile,
      verbose: this.program.opts().verbose || false,
      dryRun: this.program.opts().dryRun || false,
    };

    return this.config;
  }

  /**
   * Get current configuration
   */
  getConfig(): CLIConfig {
    return { ...this.config };
  }

  /**
   * Show success message
   */
  success(message: string): void {
    console.log(chalk.green('✓'), message);
  }

  /**
   * Show info message
   */
  info(message: string): void {
    console.log(chalk.blue('ℹ'), message);
  }

  /**
   * Show warning message
   */
  warn(message: string): void {
    console.log(chalk.yellow('⚠'), message);
  }

  /**
   * Show error message and exit
   */
  error(message: string, error?: unknown): never {
    console.error(chalk.red('✗'), message);
    if (error && this.config.verbose) {
      console.error(error);
    }
    process.exit(1);
  }

  /**
   * Start a spinner
   */
  startSpinner(text: string): ora.Ora {
    this.spinner = ora(text).start();
    return this.spinner;
  }

  /**
   * Stop the current spinner
   */
  stopSpinner(): void {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = undefined;
    }
  }

  /**
   * Succeed the current spinner
   */
  succeedSpinner(text?: string): void {
    if (this.spinner) {
      this.spinner.succeed(text);
      this.spinner = undefined;
    }
  }

  /**
   * Fail the current spinner
   */
  failSpinner(text?: string): void {
    if (this.spinner) {
      this.spinner.fail(text);
      this.spinner = undefined;
    }
  }

  /**
   * Parse and execute commands
   */
  async run(argv?: string[]): Promise<void> {
    try {
      // Parse arguments
      this.program.parse(argv);

      // Load configuration
      await this.loadConfig();

      // If no command was specified, show help
      if (!this.program.args.length) {
        this.program.help();
      }
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Setup global options and hooks
   */
  private setupGlobalOptions(): void {
    // Handle --version
    this.program.on('option:version', () => {
      console.log('NeatOrm CLI v0.1.0');
      process.exit(0);
    });

    // Handle --help
    this.program.on('option:help', () => {
      this.program.help();
    });
  }

  /**
   * Handle errors
   */
  private handleError(error: unknown): never {
    if (error instanceof Error) {
      // Commander-specific errors
      if (error.message.includes('commander')) {
        console.error(chalk.red('✗'), error.message);
        this.program.help();
      } else {
        this.error(`Unexpected error: ${error.message}`, error);
      }
    } else {
      this.error('An unknown error occurred', error);
    }
  }
}

// Export singleton instance
export const cli = new CLIFramework();

