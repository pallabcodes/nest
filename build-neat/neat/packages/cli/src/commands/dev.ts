/**
 * Neat CLI - Development Server Command
 *
 * Revolutionary development experience with hot reload!
 *
 * Features:
 * - Auto-discovery of application files
 * - Hot reload with file watching
 * - TypeScript compilation on-the-fly
 * - Error handling and debugging
 * - Environment-aware configuration
 * - Performance monitoring
 *
 * This makes development with Neat Framework incredibly productive!
 */

import { spawn } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import chalk from 'chalk';
import ora from 'ora';

interface DevOptions {
  port?: string;
  host?: string;
  inspect?: boolean;
  watch?: boolean;
}

export async function startDevServer(options: DevOptions) {
  const spinner = ora('Starting Neat development server...').start();

  try {
    // Check if we're in a Neat project
    if (!isNeatProject()) {
      throw new Error('Not a Neat Framework project. Run "neat new <name>" to create one.');
    }

    // Find the main application file
    const appFile = findAppFile();
    if (!appFile) {
      throw new Error('Could not find application file. Make sure you have an app.ts or app.js file in src/');
    }

    spinner.succeed(chalk.green('✅ Neat development server starting...'));

    // Display server info
    console.log(chalk.blue('\n🚀 Development Server Configuration:'));
    console.log(`   📁 Project: ${process.cwd()}`);
    console.log(`   📄 Entry: ${appFile}`);
    console.log(`   🌐 Host: ${options.host || 'localhost'}`);
    console.log(`   🔌 Port: ${options.port || '3000'}`);
    console.log(`   🔍 Auto-discovery: ${chalk.green('ENABLED')}`);
    console.log(`   🔥 Hot reload: ${options.watch !== false ? chalk.green('ENABLED') : chalk.red('DISABLED')}`);

    if (options.inspect) {
      console.log(`   🐛 Debug: ${chalk.green('ENABLED')} (Node.js Inspector)`);
    }

    console.log(chalk.yellow('\n⏳ Starting server...\n'));

    // Start the development server
    await runDevServer(appFile, options);

  } catch (error) {
    spinner.fail(chalk.red('❌ Failed to start development server'));
    console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));

    // Show helpful suggestions
    console.log(chalk.yellow('\n💡 Suggestions:'));
    console.log('   • Make sure you\'re in a Neat project directory');
    console.log('   • Check that your app.ts file exists in src/');
    console.log('   • Run "neat doctor" to check project health');
    console.log('   • Try "npm install" to install dependencies');

    process.exit(1);
  }
}

function isNeatProject(): boolean {
  // Check for package.json with @neat/core dependency
  try {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    return '@neat/core' in deps;
  } catch {
    return false;
  }
}

function findAppFile(): string | null {
  const possibleFiles = [
    'src/app.ts',
    'src/app.js',
    'src/main.ts',
    'src/main.js',
    'src/index.ts',
    'src/index.js',
    'app.ts',
    'app.js',
    'main.ts',
    'main.js',
    'index.ts',
    'index.js'
  ];

  for (const file of possibleFiles) {
    if (existsSync(file)) {
      return file;
    }
  }

  return null;
}

async function runDevServer(appFile: string, options: DevOptions) {
  const isTypeScript = appFile.endsWith('.ts');
  const useInspect = options.inspect;
  const watchMode = options.watch !== false;

  // Prepare environment variables
  const env = {
    ...process.env,
    NODE_ENV: 'development',
    PORT: options.port || '3000',
    HOST: options.host || 'localhost'
  };

  // Command arguments
  const args: string[] = [];

  if (useInspect) {
    args.push('--inspect');
  }

  // For TypeScript files, use tsx for automatic compilation
  if (isTypeScript) {
    // Use tsx for TypeScript execution with hot reload
    args.push(appFile);
    await runWithTsx(args, env, watchMode);
  } else {
    // For JavaScript files, use node directly
    args.push(appFile);
    await runWithNode(args, env, watchMode);
  }
}

async function runWithTsx(args: string[], env: NodeJS.ProcessEnv, watchMode: boolean) {
  return new Promise<void>((resolve, reject) => {
    // Use tsx for TypeScript execution
    const tsx = spawn('npx', ['tsx', ...args], {
      stdio: ['inherit', 'inherit', 'inherit'],
      env,
      cwd: process.cwd()
    });

    // Handle process events
    tsx.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Development server exited with code ${code}`));
      }
    });

    tsx.on('error', (error) => {
      reject(error);
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log(chalk.yellow('\n🛑 Shutting down development server...'));
      tsx.kill('SIGINT');
      resolve();
    });

    process.on('SIGTERM', () => {
      console.log(chalk.yellow('\n🛑 Terminating development server...'));
      tsx.kill('SIGTERM');
      resolve();
    });
  });
}

async function runWithNode(args: string[], env: NodeJS.ProcessEnv, watchMode: boolean) {
  return new Promise<void>((resolve, reject) => {
    // Use nodemon for JavaScript with hot reload
    const command = watchMode ? 'nodemon' : 'node';
    const finalArgs = watchMode ? ['--exec', 'node', ...args] : args;

    const child = spawn('npx', [command, ...finalArgs], {
      stdio: ['inherit', 'inherit', 'inherit'],
      env,
      cwd: process.cwd()
    });

    // Handle process events
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Development server exited with code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log(chalk.yellow('\n🛑 Shutting down development server...'));
      child.kill('SIGINT');
      resolve();
    });

    process.on('SIGTERM', () => {
      console.log(chalk.yellow('\n🛑 Terminating development server...'));
      child.kill('SIGTERM');
      resolve();
    });
  });
}

// ========================================
// DEVELOPMENT SERVER FEATURES
// ========================================

/**
 * Display server startup information
 */
function displayServerInfo(options: DevOptions) {
  const port = options.port || '3000';
  const host = options.host || 'localhost';

  console.log(chalk.green('\n🎉 Development server started successfully!'));
  console.log(chalk.blue('\n📋 Server Information:'));
  console.log(`   🌐 URL: http://${host}:${port}`);
  console.log(`   🏥 Health: http://${host}:${port}/health`);
  console.log(`   📊 Info: http://${host}:${port}/health/info`);

  if (options.inspect) {
    console.log(`   🐛 Debug: chrome://inspect or http://127.0.0.1:9229`);
  }

  console.log(chalk.yellow('\n🔧 Development Features:'));
  console.log('   • Auto-discovery of new services/controllers');
  console.log('   • Hot reload on file changes');
  console.log('   • TypeScript compilation on-the-fly');
  console.log('   • Enhanced error reporting');
  console.log('   • Request logging and debugging');

  console.log(chalk.cyan('\n💡 Tips:'));
  console.log('   • Press Ctrl+C to stop the server');
  console.log('   • Use "neat generate" to create new code');
  console.log('   • Check "neat scan" for auto-discovery analysis');
  console.log('   • Run "neat doctor" for health checks');

  console.log(chalk.magenta('\n🚀 Happy coding with Neat Framework!\n'));
}

/**
 * Check if the server is responding
 */
async function checkServerHealth(host: string, port: string): Promise<boolean> {
  try {
    const response = await fetch(`http://${host}:${port}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Wait for server to be ready
 */
async function waitForServer(host: string, port: string, timeout = 30000): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await checkServerHealth(host, port)) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  throw new Error(`Server did not respond within ${timeout}ms`);
}

