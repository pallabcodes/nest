/**
 * Neat CLI - Test Command
 *
 * Revolutionary testing with auto-discovery integration!
 *
 * Features:
 * - Auto-discovery of test files
 * - TypeScript test execution
 * - Coverage reporting
 * - Watch mode for TDD
 * - Integration with auto-discovery
 * - Performance monitoring
 *
 * This makes testing with Neat Framework incredibly productive!
 */

import { spawn } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import chalk from 'chalk';
import ora from 'ora';

interface TestOptions {
  watch?: boolean;
  coverage?: boolean;
  pattern?: string;
  verbose?: boolean;
}

export async function runTests(options: TestOptions) {
  const spinner = ora('Running Neat tests...').start();

  try {
    // Check if we're in a Neat project
    if (!isNeatProject()) {
      throw new Error('Not a Neat Framework project. Run "neat new <name>" to create one.');
    }

    // Check if test framework is available
    const testRunner = await detectTestRunner();
    if (!testRunner) {
      spinner.warn(chalk.yellow('No test framework found. Installing Jest...'));
      await installJest();
    }

    spinner.text = 'Discovering test files...';

    // Find test files
    const testFiles = await discoverTestFiles(options.pattern || '**/*.test.ts');

    if (testFiles.length === 0) {
      spinner.warn(chalk.yellow('No test files found'));
      console.log(chalk.cyan('💡 Create your first test:'));
      console.log('   neat generate service User');
      console.log('   # Then create: src/services/user.service.test.ts');
      return;
    }

    spinner.text = `Running ${testFiles.length} test file(s)...`;

    // Run tests
    const results = await executeTests(testFiles, options);

    spinner.succeed(chalk.green('✅ Tests completed'));

    // Display results
    displayTestResults(results, options);

  } catch (error) {
    spinner.fail(chalk.red('❌ Tests failed'));
    console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    process.exit(1);
  }
}

function isNeatProject(): boolean {
  try {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    return '@neat/core' in deps;
  } catch {
    return false;
  }
}

async function detectTestRunner(): Promise<string | null> {
  try {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

    if (deps.jest || deps['@types/jest']) return 'jest';
    if (deps.vitest) return 'vitest';
    if (deps.mocha) return 'mocha';

    return null;
  } catch {
    return null;
  }
}

async function installJest() {
  const { execSync } = await import('child_process');

  console.log('Installing Jest and testing dependencies...');

  const jestDeps = [
    'jest',
    '@types/jest',
    'ts-jest',
    'jest-environment-node'
  ];

  execSync(`npm install --save-dev ${jestDeps.join(' ')}`, { stdio: 'inherit' });

  // Generate Jest configuration
  const jestConfig = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src', '<rootDir>/tests'],
    testMatch: [
      '**/__tests__/**/*.ts',
      '**/?(*.)+(spec|test).ts'
    ],
    collectCoverageFrom: [
      'src/**/*.ts',
      '!src/**/*.d.ts'
    ],
    setupFilesAfterEnv: [],
    moduleNameMapping: {
      '^@/(.*)$': '<rootDir>/src/$1'
    }
  };

  const { writeFile } = await import('fs/promises');
  await writeFile('jest.config.js', `module.exports = ${JSON.stringify(jestConfig, null, 2)};`);
}

async function discoverTestFiles(pattern: string): Promise<string[]> {
  try {
    const { glob } = await import('glob');

    const files = await glob(pattern, {
      cwd: process.cwd(),
      absolute: true
    });

    return files.filter(file => file.endsWith('.test.ts') || file.endsWith('.spec.ts'));
  } catch {
    // Fallback to manual discovery
    return [];
  }
}

async function executeTests(testFiles: string[], options: TestOptions): Promise<TestResults> {
  const testRunner = await detectTestRunner() || 'jest';

  return new Promise((resolve, reject) => {
    const args: string[] = [];

    if (testRunner === 'jest') {
      args.push('jest');

      if (options.watch) args.push('--watch');
      if (options.coverage) args.push('--coverage');
      if (options.verbose) args.push('--verbose');
      if (testFiles.length > 0) args.push('--', ...testFiles);

    } else if (testRunner === 'vitest') {
      args.push('vitest', 'run');

      if (options.watch) args[1] = 'watch';
      if (options.coverage) args.push('--coverage');
      if (testFiles.length > 0) args.push(...testFiles);

    } else {
      reject(new Error(`Unsupported test runner: ${testRunner}`));
      return;
    }

    const testProcess = spawn('npx', args, {
      stdio: ['inherit', 'pipe', 'pipe'],
      cwd: process.cwd(),
      env: { ...process.env, NODE_ENV: 'test' }
    });

    let stdout = '';
    let stderr = '';

    testProcess.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    testProcess.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    testProcess.on('close', (code) => {
      const results: TestResults = {
        success: code === 0,
        code: code || 0,
        stdout,
        stderr,
        testFiles,
        coverage: options.coverage
      };

      resolve(results);
    });

    testProcess.on('error', reject);
  });
}

interface TestResults {
  success: boolean;
  code: number;
  stdout: string;
  stderr: string;
  testFiles: string[];
  coverage?: boolean;
}

function displayTestResults(results: TestResults, options: TestOptions) {
  console.log(chalk.blue('\n📊 Test Results:'));

  if (results.success) {
    console.log(chalk.green(`   ✅ All tests passed`));
  } else {
    console.log(chalk.red(`   ❌ Tests failed with exit code ${results.code}`));
  }

  console.log(`   📁 Test files: ${chalk.cyan(results.testFiles.length)}`);

  // Parse test output for summary
  const testSummary = parseTestOutput(results.stdout);

  if (testSummary) {
    console.log(`   🧪 Tests: ${chalk.cyan(testSummary.passed + testSummary.failed)}`);
    console.log(`   ✅ Passed: ${chalk.green(testSummary.passed)}`);
    console.log(`   ❌ Failed: ${chalk.red(testSummary.failed)}`);

    if (testSummary.coverage) {
      console.log(`   📈 Coverage: ${chalk.cyan(testSummary.coverage.overall + '%')}`);
    }
  }

  if (options.coverage && results.success) {
    console.log(chalk.yellow('\n📈 Coverage Report:'));
    console.log('   📄 HTML report: coverage/lcov-report/index.html');
    console.log('   📊 Summary: coverage/coverage-summary.json');
  }

  if (!results.success) {
    console.log(chalk.red('\n❌ Test Failures:'));
    console.log(results.stderr || results.stdout);
  }

  console.log(chalk.cyan('\n💡 Testing Tips:'));
  console.log('   • Run tests in watch mode: neat test --watch');
  console.log('   • Generate coverage: neat test --coverage');
  console.log('   • Test specific file: neat test --pattern "**/user.test.ts"');
  console.log('   • Auto-discover tests: All .test.ts and .spec.ts files included');
}

function parseTestOutput(output: string): TestSummary | null {
  // Parse Jest output
  const testMatch = output.match(/Tests:\s*(\d+)\s*passed,\s*(\d+)\s*failed/);
  const coverageMatch = output.match(/All files[^|]*\|\s*([^|]*)\s*\|\s*([^|]*)\s*\|\s*([^|]*)\s*\|\s*([^|]*)\s*\|\s*(\d+)%/);

  if (testMatch) {
    const summary: TestSummary = {
      passed: parseInt(testMatch[1]),
      failed: parseInt(testMatch[2])
    };

    if (coverageMatch) {
      summary.coverage = {
        statements: coverageMatch[1],
        branches: coverageMatch[2],
        functions: coverageMatch[3],
        lines: coverageMatch[4],
        overall: coverageMatch[5]
      };
    }

    return summary;
  }

  return null;
}

interface TestSummary {
  passed: number;
  failed: number;
  coverage?: {
    statements: string;
    branches: string;
    functions: string;
    lines: string;
    overall: string;
  };
}

// ========================================
// TEST GENERATION HELPERS
// ========================================

/**
 * Generate a basic test file for a service
 */
export async function generateServiceTest(serviceName: string, servicePath: string) {
  const testContent = `import { ${serviceName} } from '${servicePath.replace('.ts', '').replace('src/', '@/')}';

describe('${serviceName}', () => {
  let service: ${serviceName};

  beforeEach(() => {
    // Setup service instance
    service = new ${serviceName}();
  });

  afterEach(() => {
    // Cleanup after each test
    jest.clearAllMocks();
  });

  describe('Core functionality', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should perform basic operations', () => {
      // Add your test assertions here
      expect(true).toBe(true);
    });
  });

  describe('Business logic', () => {
    it('should handle valid input', () => {
      // Test business logic here
    });

    it('should handle edge cases', () => {
      // Test edge cases here
    });
  });
});
`;

  return testContent;
}
