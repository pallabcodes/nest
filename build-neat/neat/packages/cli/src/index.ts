#!/usr/bin/env node

/**
 * Neat Framework CLI
 *
 * Revolutionary CLI for zero-boilerplate TypeScript development!
 *
 * Features:
 * - Project generation (`neat new my-app`)
 * - Code generation (`neat generate service UserService`)
 * - Development server (`neat dev`)
 * - Build commands (`neat build`)
 * - Auto-discovery integration
 * - Environment-aware tooling
 *
 * This CLI makes Neat Framework the most developer-friendly
 * TypeScript framework available!
 */

import { Command } from 'commander';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

const program = new Command();

// ========================================
// CLI METADATA
// ========================================

const packageJson = require('../package.json');
program
  .name('neat')
  .description('Revolutionary CLI for zero-boilerplate TypeScript development')
  .version(packageJson.version)
  .option('-v, --verbose', 'enable verbose logging')
  .option('--dry-run', 'show what would be done without executing');

// ========================================
// NEW COMMAND - Project Generation
// ========================================

program
  .command('new <name>')
  .description('Create a new Neat Framework project')
  .option('-t, --template <template>', 'project template (default, minimal, enterprise)', 'default')
  .option('--typescript', 'use TypeScript (default)', true)
  .option('--skip-install', 'skip npm/yarn install')
  .option('--database <db>', 'database to use (typeorm, mongoose, both)', 'typeorm')
  .action(async (name, options) => {
    console.log('🚀 Creating new Neat Framework project...');

    const { createProject } = await import('./commands/new.js');
    await createProject(name, options);
  });

// ========================================
// GENERATE COMMAND - Code Generation
// ========================================

const generateCommand = program
  .command('generate')
  .alias('g')
  .description('Generate Neat Framework code');

generateCommand
  .command('service <name>')
  .description('Generate a service class')
  .option('-p, --path <path>', 'path to create the service', 'src/services')
  .action(async (name, options) => {
    const { generateService } = await import('./commands/generate.js');
    await generateService(name, options);
  });

generateCommand
  .command('controller <name>')
  .description('Generate a controller class')
  .option('-p, --path <path>', 'path to create the controller', 'src/controllers')
  .option('-r, --routes <routes>', 'comma-separated routes to generate', 'get,post')
  .action(async (name, options) => {
    const { generateController } = await import('./commands/generate.js');
    await generateController(name, options);
  });

generateCommand
  .command('entity <name>')
  .description('Generate an entity/model class')
  .option('-p, --path <path>', 'path to create the entity', 'src/entities')
  .option('-d, --database <db>', 'database type (typeorm, mongoose)', 'typeorm')
  .option('-f, --fields <fields>', 'comma-separated fields (name:string,age:number)', '')
  .action(async (name, options) => {
    const { generateEntity } = await import('./commands/generate.js');
    await generateEntity(name, options);
  });

generateCommand
  .command('module <name>')
  .description('Generate a module with service, controller, and entity')
  .option('-p, --path <path>', 'base path for the module', 'src/modules')
  .option('-d, --database <db>', 'database type (typeorm, mongoose)', 'typeorm')
  .action(async (name, options) => {
    const { generateModule } = await import('./commands/generate.js');
    await generateModule(name, options);
  });

generateCommand
  .command('auth')
  .description('Generate authentication setup')
  .option('--basic', 'generate basic JWT authentication')
  .option('--full', 'generate full auth with OAuth')
  .option('--controller', 'generate auth controller with login/register routes')
  .option('--guard <name>', 'generate custom auth guard')
  .option('--strategy <name>', 'generate custom auth strategy')
  .action(async (options) => {
    const { generateAuth } = await import('./commands/generate.js');
    await generateAuth(options);
  });

generateCommand
  .command('guard <name>')
  .description('Generate a guard class for authorization')
  .option('-p, --path <path>', 'path to create the guard', 'src/guards')
  .option('--type <type>', 'guard type (auth, role, permission, rate-limit)', 'auth')
  .action(async (name, options) => {
    const { generateGuard } = await import('./commands/generate.js');
    await generateGuard(name, options);
  });

generateCommand
  .command('pipe <name>')
  .description('Generate a pipe class for data transformation/validation')
  .option('-p, --path <path>', 'path to create the pipe', 'src/pipes')
  .option('--type <type>', 'pipe type (validation, transform, parse)', 'validation')
  .action(async (name, options) => {
    const { generatePipe } = await import('./commands/generate.js');
    await generatePipe(name, options);
  });

generateCommand
  .command('interceptor <name>')
  .description('Generate an interceptor class for request/response processing')
  .option('-p, --path <path>', 'path to create the interceptor', 'src/interceptors')
  .option('--type <type>', 'interceptor type (logging, cache, timeout)', 'logging')
  .action(async (name, options) => {
    const { generateInterceptor } = await import('./commands/generate.js');
    await generateInterceptor(name, options);
  });

generateCommand
  .command('filter <name>')
  .description('Generate an exception filter class for error handling')
  .option('-p, --path <path>', 'path to create the filter', 'src/filters')
  .option('--type <type>', 'filter type (http, validation, database)', 'http')
  .action(async (name, options) => {
    const { generateExceptionFilter } = await import('./commands/generate.js');
    await generateExceptionFilter(name, options);
  });

// ========================================
// DEV COMMAND - Development Server
// ========================================

program
  .command('dev')
  .description('Start development server with hot reload')
  .option('-p, --port <port>', 'port to run on', '3000')
  .option('-h, --host <host>', 'host to bind to', 'localhost')
  .option('--inspect', 'enable Node.js inspector')
  .option('--no-watch', 'disable file watching')
  .action(async (options) => {
    console.log('🔥 Starting Neat development server...');

    const { startDevServer } = await import('./commands/dev.js');
    await startDevServer(options);
  });

// ========================================
// BUILD COMMAND - Production Build
// ========================================

program
  .command('build')
  .description('Build the application for production')
  .option('-o, --out-dir <dir>', 'output directory', 'dist')
  .option('-w, --watch', 'watch mode for continuous building')
  .option('--minify', 'minify the output')
  .option('--sourcemap', 'generate source maps')
  .action(async (options) => {
    console.log('🔨 Building Neat application for production...');

    const { buildProject } = await import('./commands/build.js');
    await buildProject(options);
  });

// ========================================
// TEST COMMAND - Run Tests
// ========================================

program
  .command('test')
  .description('Run tests with auto-discovery')
  .option('-w, --watch', 'watch mode')
  .option('-c, --coverage', 'generate coverage report')
  .option('-p, --pattern <pattern>', 'test file pattern', '**/*.test.ts')
  .option('--verbose', 'verbose test output')
  .action(async (options) => {
    console.log('🧪 Running Neat tests with auto-discovery...');

    const { runTests } = await import('./commands/test.js');
    await runTests(options);
  });

// ========================================
// SCAN COMMAND - Auto-Discovery Analysis
// ========================================

program
  .command('scan')
  .description('Analyze auto-discovery results')
  .option('-t, --type <type>', 'scan type (all, entities, services, controllers, schemas)', 'all')
  .option('-v, --verbose', 'show detailed scan results')
  .option('--json', 'output results as JSON')
  .action(async (options) => {
    console.log('🔍 Analyzing Neat auto-discovery...');

    const { analyzeScan } = await import('./commands/scan.js');
    await analyzeScan(options);
  });

// ========================================
// INFO COMMAND - Project Information
// ========================================

program
  .command('info')
  .description('Show project information and auto-discovery stats')
  .action(async () => {
    console.log('ℹ️  Neat Framework Project Information\n');

    const { showProjectInfo } = await import('./commands/info.js');
    await showProjectInfo();
  });

// ========================================
// DOCTOR COMMAND - Health Check
// ========================================

program
  .command('doctor')
  .description('Check project health and configuration')
  .action(async () => {
    console.log('🏥 Running Neat doctor...\n');

    const { runDoctor } = await import('./commands/doctor.js');
    await runDoctor();
  });

// ========================================
// INIT COMMAND - Initialize Existing Project
// ========================================

program
  .command('init')
  .description('Initialize Neat Framework in existing project')
  .option('-f, --force', 'overwrite existing files')
  .option('--database <db>', 'database to configure (typeorm, mongoose, both)', 'typeorm')
  .action(async (options) => {
    console.log('🎯 Initializing Neat Framework in existing project...');

    const { initProject } = await import('./commands/init.js');
    await initProject(options);
  });

// ========================================
// UPDATE COMMAND - Update Framework
// ========================================

program
  .command('update')
  .description('Update Neat Framework to latest version')
  .option('-f, --force', 'force update even if on latest')
  .action(async (options) => {
    console.log('⬆️  Updating Neat Framework...');

    const { updateFramework } = await import('./commands/update.js');
    await updateFramework(options);
  });

// ========================================
// ERROR HANDLING
// ========================================

program.on('command:*', (unknownCommand) => {
  console.error(`❌ Unknown command: ${unknownCommand[0]}`);
  console.log('\nAvailable commands:');
  program.outputHelp();
  process.exit(1);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// ========================================
// EXECUTE CLI
// ========================================

// Show help if no command provided
if (process.argv.length === 2) {
  program.help();
} else {
  program.parse(process.argv);
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Neat CLI shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Neat CLI terminated...');
  process.exit(0);
});
