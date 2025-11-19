#!/usr/bin/env node

/**
 * NeatOrm CLI Executable
 *
 * Main entry point for the NeatOrm CLI tool.
 */

import { cli } from '../dist/framework/cli.js';
import { MigrateCommand } from '../dist/commands/migrate.js';
import { SchemaCommand } from '../dist/commands/schema.js';
import { EntityCommand } from '../dist/commands/entity.js';
import { SeedCommand } from '../dist/commands/seed.js';
import { DBCommand } from '../dist/commands/db.js';

// Register commands
const migrateCommand = new MigrateCommand();
const schemaCommand = new SchemaCommand();
const entityCommand = new EntityCommand();
const seedCommand = new SeedCommand();
const dbCommand = new DBCommand();

// Add commands to CLI
cli.getProgram().addCommand(migrateCommand.getCommand());
cli.getProgram().addCommand(schemaCommand.getCommand());
cli.getProgram().addCommand(entityCommand.getCommand());
cli.getProgram().addCommand(seedCommand.getCommand());
cli.getProgram().addCommand(dbCommand.getCommand());

// Run CLI
cli.run(process.argv).catch((error) => {
  console.error('CLI Error:', error);
  process.exit(1);
});
