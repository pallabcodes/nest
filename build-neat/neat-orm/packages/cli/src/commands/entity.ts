/**
 * Entity Command
 *
 * Handles entity generation and management.
 *
 * @module cli/commands/entity
 */

import { Command } from 'commander';
import { cli } from '../framework/cli.js';
import { EntityGenerator } from '../utils/entity-generator.js';

/**
 * Entity Command
 *
 * Provides entity-related CLI commands.
 */
export class EntityCommand {
  private generator = new EntityGenerator();

  /**
   * Get the commander command instance
   */
  getCommand(): Command {
    const command = new Command('entity')
      .description('Manage entities');

    command
      .command('generate <name>')
      .description('Generate a new entity class')
      .option('-t, --table <table>', 'database table name')
      .option('-o, --output <dir>', 'output directory', 'src/entities')
      .action(this.generateEntity.bind(this));

    return command;
  }

  /**
   * Generate a new entity class
   */
  private async generateEntity(name: string, options: {
    table?: string;
    output: string;
  }): Promise<void> {
    const config = cli.getConfig();
    const spinner = cli.startSpinner('Generating entity...');

    try {
      const tableName = options.table || name.toLowerCase() + 's';
      const className = name.charAt(0).toUpperCase() + name.slice(1);

      // Generate basic entity with common columns
      const columns = [
        { name: 'id', type: 'INTEGER', nullable: false, primaryKey: true, autoIncrement: true },
        { name: 'created_at', type: 'TIMESTAMP', nullable: false },
        { name: 'updated_at', type: 'TIMESTAMP', nullable: false },
      ];

      const entityCode = this.generator.generateEntity(tableName, columns);

      // Replace class name in generated code
      const finalCode = entityCode.replace(
        /export class \w+/,
        `export class ${className}`
      );

      if (config.dryRun) {
        cli.info('Generated entity code:');
        console.log('\n' + '='.repeat(50));
        console.log(finalCode);
        console.log('='.repeat(50) + '\n');
        spinner.succeed('Entity generation completed (dry run)');
      } else {
        const fs = await import('fs-extra');
        const path = await import('path');

        const filename = `${className}.ts`;
        const filepath = path.join(options.output, filename);

        await fs.ensureDir(options.output);
        await fs.writeFile(filepath, finalCode);

        spinner.succeed(`Generated entity: ${className} -> ${filepath}`);
      }

    } catch (error) {
      spinner.fail('Entity generation failed');
      cli.error('Failed to generate entity', error);
    }
  }
}
