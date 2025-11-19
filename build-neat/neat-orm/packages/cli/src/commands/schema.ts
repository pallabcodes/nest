/**
 * Schema Command
 *
 * Handles schema generation, introspection, and synchronization.
 *
 * @module cli/commands/schema
 */

import fs from 'fs-extra';
import path from 'path';
import { Command } from 'commander';
import { cli } from '../framework/cli.js';
import { DatabaseManager } from '../utils/database-manager.js';
import { SchemaIntrospector } from '../utils/schema-introspector.js';
import { EntityGenerator } from '../utils/entity-generator.js';

/**
 * Schema Command
 *
 * Provides schema-related CLI commands.
 */
export class SchemaCommand {
  private dbManager = new DatabaseManager();
  private introspector!: SchemaIntrospector;
  private generator!: EntityGenerator;

  /**
   * Get the commander command instance
   */
  getCommand(): Command {
    const command = new Command('schema')
      .description('Manage database schemas');

    command
      .command('introspect')
      .description('Introspect database schema and generate entities')
      .option('-o, --output <dir>', 'output directory for generated entities', 'src/entities')
      .option('--sync', 'synchronize entities with database schema')
      .action(this.introspectSchema.bind(this));

    command
      .command('generate')
      .description('Generate database schema from entities')
      .option('-i, --input <dir>', 'input directory containing entities', 'src/entities')
      .option('--dry-run', 'show what would be generated without creating files')
      .action(this.generateSchema.bind(this));

    command
      .command('sync')
      .description('Synchronize database schema with entities')
      .option('-i, --input <dir>', 'input directory containing entities', 'src/entities')
      .action(this.syncSchema.bind(this));

    return command;
  }

  /**
   * Introspect database schema and generate entities
   */
  private async introspectSchema(options: {
    output: string;
    sync?: boolean;
  }): Promise<void> {
    const config = cli.getConfig();
    const spinner = cli.startSpinner('Introspecting database schema...');

    try {
      await this.dbManager.connect(config);
      this.introspector = new SchemaIntrospector(this.dbManager.getAdapter());
      this.generator = new EntityGenerator();

      // Get all tables
      const tables = await this.introspector.getTables();

      if (tables.length === 0) {
        spinner.warn('No tables found in database');
        return;
      }

      spinner.text = `Found ${tables.length} table(s), generating entities...`;

      for (const table of tables) {
        const columns = await this.introspector.getTableColumns(table.name);
        const entityCode = this.generator.generateEntity(table.name, columns);

        if (config.dryRun) {
          cli.info(`Would generate entity for table: ${table.name}`);
          console.log('\n' + '='.repeat(50));
          console.log(entityCode);
          console.log('='.repeat(50) + '\n');
        } else {
          const filename = `${table.name}.ts`;
          const filepath = path.join(options.output, filename);

          await fs.ensureDir(options.output);
          await fs.writeFile(filepath, entityCode);

          cli.success(`Generated entity: ${table.name} -> ${filepath}`);
        }
      }

      if (!config.dryRun) {
        spinner.succeed(`Generated ${tables.length} entity file(s) in ${options.output}`);
      } else {
        spinner.succeed(`Introspected ${tables.length} table(s)`);
      }

    } catch (error) {
      spinner.fail('Schema introspection failed');
      cli.error('Failed to introspect database schema', error);
    } finally {
      await this.dbManager.disconnect();
    }
  }

  /**
   * Generate database schema from entities
   */
  private async generateSchema(options: {
    input: string;
    dryRun?: boolean;
  }): Promise<void> {
    const config = cli.getConfig();
    const spinner = cli.startSpinner('Generating database schema...');

    try {
      // Load entities from directory
      const entities = await this.loadEntities(options.input);

      if (entities.length === 0) {
        spinner.warn(`No entities found in ${options.input}`);
        return;
      }

      spinner.text = `Found ${entities.length} entity(ies), generating schema...`;

      // Generate SQL for each entity
      const schemaSQL: string[] = [];

      for (const entity of entities) {
        // This would require entity metadata parsing
        // For now, show a placeholder
        const tableSQL = this.generateTableSQL(entity);
        schemaSQL.push(tableSQL);
      }

      const fullSchema = schemaSQL.join('\n\n');

      if (config.dryRun || options.dryRun) {
        cli.info('Generated schema SQL:');
        console.log('\n' + '='.repeat(80));
        console.log(fullSchema);
        console.log('='.repeat(80) + '\n');
        spinner.succeed('Schema generation completed (dry run)');
      } else {
        // Write schema to file
        const schemaFile = 'schema.sql';
        await fs.writeFile(schemaFile, fullSchema);
        spinner.succeed(`Generated schema file: ${schemaFile}`);
      }

    } catch (error) {
      spinner.fail('Schema generation failed');
      cli.error('Failed to generate database schema', error);
    }
  }

  /**
   * Synchronize database schema with entities
   */
  private async syncSchema(options: { input: string }): Promise<void> {
    const config = cli.getConfig();
    const spinner = cli.startSpinner('Synchronizing schema...');

    try {
      await this.dbManager.connect(config);

      // Load entities
      const entities = await this.loadEntities(options.input);

      spinner.text = `Synchronizing ${entities.length} entity(ies)...`;

      // For each entity, check if table exists and create if needed
      for (const entity of entities) {
        const tableExists = await this.dbManager.tableExists(entity.tableName);

        if (!tableExists) {
          if (config.dryRun) {
            cli.info(`Would create table: ${entity.tableName}`);
          } else {
            const tableSQL = this.generateTableSQL(entity);
            await this.dbManager.executeQuery(tableSQL);
            cli.success(`Created table: ${entity.tableName}`);
          }
        } else {
          cli.info(`Table ${entity.tableName} already exists`);
        }
      }

      spinner.succeed('Schema synchronization completed');

    } catch (error) {
      spinner.fail('Schema synchronization failed');
      cli.error('Failed to synchronize schema', error);
    } finally {
      await this.dbManager.disconnect();
    }
  }

  /**
   * Load entities from directory
   */
  private async loadEntities(dir: string): Promise<any[]> {
    // This is a simplified implementation
    // In a real implementation, we'd scan the directory for entity files
    // and extract metadata using the metadata scanner

    cli.warn('Entity loading is simplified in this implementation');
    return [
      {
        name: 'User',
        tableName: 'users',
        columns: [
          { name: 'id', type: 'integer', primaryKey: true, autoIncrement: true },
          { name: 'email', type: 'varchar', nullable: false },
          { name: 'name', type: 'varchar', nullable: false },
        ],
      },
    ];
  }

  /**
   * Generate CREATE TABLE SQL for an entity
   */
  private generateTableSQL(entity: any): string {
    const columns = entity.columns.map((col: any) => {
      let sql = `${col.name} ${col.type.toUpperCase()}`;

      if (col.primaryKey) {
        sql += ' PRIMARY KEY';
      }

      if (col.autoIncrement) {
        sql += ' AUTOINCREMENT';
      }

      if (!col.nullable) {
        sql += ' NOT NULL';
      }

      return sql;
    });

    return `CREATE TABLE IF NOT EXISTS ${entity.tableName} (\n  ${columns.join(',\n  ')}\n);`;
  }
}
