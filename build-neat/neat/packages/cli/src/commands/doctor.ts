/**
 * Neat CLI - Doctor Command
 *
 * Revolutionary project health diagnostics!
 *
 * Features:
 * - Comprehensive health checks
 * - Configuration validation
 * - Dependency analysis
 * - Auto-discovery verification
 * - Performance diagnostics
 * - Security checks
 * - Fix suggestions
 *
 * This ensures your Neat Framework project is healthy and optimized!
 */

import { existsSync, readFileSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';
import ora from 'ora';

export async function runDoctor() {
  const spinner = ora('Running comprehensive health checks...').start();

  try {
    // Check if we're in a Neat project
    if (!isNeatProject()) {
      throw new Error('Not a Neat Framework project. Run "neat new <name>" to create one.');
    }

    spinner.text = 'Analyzing project health...';

    // Run all health checks
    const healthReport = await performHealthChecks();

    spinner.succeed(chalk.green('✅ Health analysis complete'));

    // Display results
    displayHealthReport(healthReport);

    // Show summary
    displayHealthSummary(healthReport);

  } catch (error) {
    spinner.fail(chalk.red('❌ Health check failed'));
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

async function performHealthChecks(): Promise<HealthReport> {
  const report: HealthReport = {
    timestamp: new Date().toISOString(),
    overall: 'passing',
    categories: {
      project: await checkProjectStructure(),
      dependencies: await checkDependencies(),
      configuration: await checkConfiguration(),
      autoDiscovery: await checkAutoDiscovery(),
      performance: await checkPerformance(),
      security: await checkSecurity()
    },
    recommendations: [],
    fixes: []
  };

  // Determine overall health
  const categories = Object.values(report.categories);
  if (categories.some(cat => cat.status === 'failing')) {
    report.overall = 'failing';
  } else if (categories.some(cat => cat.status === 'warning')) {
    report.overall = 'warning';
  }

  // Generate recommendations
  report.recommendations = generateRecommendations(report);
  report.fixes = generateFixes(report);

  return report;
}

async function checkProjectStructure(): Promise<HealthCategory> {
  const category: HealthCategory = {
    name: 'Project Structure',
    status: 'passing',
    checks: []
  };

  // Check for required directories
  const requiredDirs = ['src', 'package.json'];
  for (const dir of requiredDirs) {
    const exists = existsSync(dir);
    category.checks.push({
      name: `${dir} exists`,
      status: exists ? 'passing' : 'failing',
      message: exists ? `✅ ${dir} found` : `❌ Missing ${dir}`
    });
  }

  // Check for common structure
  const recommendedDirs = ['src/controllers', 'src/services', 'src/entities', 'tests'];
  for (const dir of recommendedDirs) {
    const exists = existsSync(dir);
    category.checks.push({
      name: `${dir} directory`,
      status: exists ? 'passing' : 'warning',
      message: exists ? `✅ ${dir} exists` : `⚠️  Consider creating ${dir}`
    });
  }

  // Update category status
  if (category.checks.some(check => check.status === 'failing')) {
    category.status = 'failing';
  } else if (category.checks.some(check => check.status === 'warning')) {
    category.status = 'warning';
  }

  return category;
}

async function checkDependencies(): Promise<HealthCategory> {
  const category: HealthCategory = {
    name: 'Dependencies',
    status: 'passing',
    checks: []
  };

  try {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

    // Check core dependencies
    const coreDeps = ['@neat/core', 'reflect-metadata'];
    for (const dep of coreDeps) {
      const installed = deps[dep];
      category.checks.push({
        name: `${dep} installed`,
        status: installed ? 'passing' : 'failing',
        message: installed ? `✅ ${dep}@${installed} installed` : `❌ Missing ${dep}`
      });
    }

    // Check for conflicting dependencies
    const conflicts = checkDependencyConflicts(deps);
    if (conflicts.length > 0) {
      category.checks.push({
        name: 'Dependency conflicts',
        status: 'warning',
        message: `⚠️  Potential conflicts: ${conflicts.join(', ')}`
      });
    }

    // Check for outdated packages (simplified)
    const outdated = await checkOutdatedPackages();
    if (outdated.length > 0) {
      category.checks.push({
        name: 'Package updates',
        status: 'warning',
        message: `⚠️  ${outdated.length} packages may be outdated`
      });
    }

  } catch (error) {
    category.checks.push({
      name: 'Package.json validation',
      status: 'failing',
      message: '❌ Invalid package.json file'
    });
  }

  // Update category status
  if (category.checks.some(check => check.status === 'failing')) {
    category.status = 'failing';
  } else if (category.checks.some(check => check.status === 'warning')) {
    category.status = 'warning';
  }

  return category;
}

async function checkConfiguration(): Promise<HealthCategory> {
  const category: HealthCategory = {
    name: 'Configuration',
    status: 'passing',
    checks: []
  };

  // Check TypeScript configuration
  const tsConfigExists = existsSync('tsconfig.json');
  category.checks.push({
    name: 'TypeScript config',
    status: tsConfigExists ? 'passing' : 'failing',
    message: tsConfigExists ? '✅ tsconfig.json found' : '❌ Missing tsconfig.json'
  });

  // Check for experimental decorators
  if (tsConfigExists) {
    try {
      const tsConfig = JSON.parse(readFileSync('tsconfig.json', 'utf-8'));
      const compilerOptions = tsConfig.compilerOptions || {};
      const hasDecorators = compilerOptions.experimentalDecorators;
      const hasMetadata = compilerOptions.emitDecoratorMetadata;

      category.checks.push({
        name: 'Decorator support',
        status: hasDecorators && hasMetadata ? 'passing' : 'failing',
        message: hasDecorators && hasMetadata ?
          '✅ Decorators configured' :
          '❌ Missing experimentalDecorators or emitDecoratorMetadata'
      });
    } catch {
      category.checks.push({
        name: 'TypeScript config validation',
        status: 'warning',
        message: '⚠️  Could not parse tsconfig.json'
      });
    }
  }

  // Check environment variables
  const hasEnv = existsSync('.env') || existsSync('.env.example');
  category.checks.push({
    name: 'Environment config',
    status: hasEnv ? 'passing' : 'warning',
    message: hasEnv ? '✅ Environment file found' : '⚠️  Consider adding .env file'
  });

  // Update category status
  if (category.checks.some(check => check.status === 'failing')) {
    category.status = 'failing';
  } else if (category.checks.some(check => check.status === 'warning')) {
    category.status = 'warning';
  }

  return category;
}

async function checkAutoDiscovery(): Promise<HealthCategory> {
  const category: HealthCategory = {
    name: 'Auto-Discovery',
    status: 'passing',
    checks: []
  };

  try {
    // Check if scanner is available
    let scanForEntities: any = null;
    let scanForServices: any = null;
    let scanForControllers: any = null;

    try {
      const scanner = await import('@neat/core/metadata/scanner.js').catch(() => null);
      if (scanner) {
        scanForEntities = scanner.scanForEntities;
        scanForServices = scanner.scanForServices;
        scanForControllers = scanner.scanForControllers;
      }
    } catch {
      // Scanner not available
    }

    if (!scanForEntities) {
      category.checks.push({
        name: 'Auto-discovery system',
        status: 'warning',
        message: '⚠️  Neat Framework scanner not available'
      });
      return category;
    }

    // Try to scan for components
    const entities = scanForEntities();
    const services = scanForServices ? scanForServices() : [];
    const controllers = scanForControllers ? scanForControllers() : [];

    category.checks.push({
      name: 'Scanner availability',
      status: 'passing',
      message: '✅ Auto-discovery scanner available'
    });

    category.checks.push({
      name: 'Entity discovery',
      status: entities.length > 0 ? 'passing' : 'warning',
      message: entities.length > 0 ?
        `✅ Found ${entities.length} entities` :
        '⚠️  No entities found'
    });

    category.checks.push({
      name: 'Service discovery',
      status: services.length > 0 ? 'passing' : 'warning',
      message: services.length > 0 ?
        `✅ Found ${services.length} services` :
        '⚠️  No services found'
    });

    category.checks.push({
      name: 'Controller discovery',
      status: controllers.length > 0 ? 'passing' : 'warning',
      message: controllers.length > 0 ?
        `✅ Found ${controllers.length} controllers` :
        '⚠️  No controllers found'
    });

  } catch (error) {
    category.checks.push({
      name: 'Auto-discovery system',
      status: 'failing',
      message: `❌ Auto-discovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }

  // Update category status
  if (category.checks.some(check => check.status === 'failing')) {
    category.status = 'failing';
  } else if (category.checks.some(check => check.status === 'warning')) {
    category.status = 'warning';
  }

  return category;
}

// These functions are no longer used since we import them conditionally above

async function checkPerformance(): Promise<HealthCategory> {
  const category: HealthCategory = {
    name: 'Performance',
    status: 'passing',
    checks: []
  };

  // Check file sizes
  try {
    const { glob } = await import('glob');
    const files = await glob('src/**/*.{ts,js}', { cwd: process.cwd() });

    let totalSize = 0;
    for (const file of files) {
      try {
        const stats = statSync(file);
        totalSize += stats.size;
      } catch {
        // Ignore stat errors
      }
    }

    const avgSize = files.length > 0 ? totalSize / files.length : 0;
    category.checks.push({
      name: 'Average file size',
      status: avgSize < 100 * 1024 ? 'passing' : 'warning', // 100KB
      message: avgSize < 100 * 1024 ?
        `✅ Average file size: ${(avgSize / 1024).toFixed(1)}KB` :
        `⚠️  Large average file size: ${(avgSize / 1024).toFixed(1)}KB`
    });

  } catch {
    category.checks.push({
      name: 'File size analysis',
      status: 'warning',
      message: '⚠️  Could not analyze file sizes'
    });
  }

  // Check memory usage
  const memUsage = process.memoryUsage();
  const heapUsedMB = memUsage.heapUsed / 1024 / 1024;

  category.checks.push({
    name: 'Memory usage',
    status: heapUsedMB < 100 ? 'passing' : 'warning',
    message: heapUsedMB < 100 ?
      `✅ Memory usage: ${heapUsedMB.toFixed(1)}MB` :
      `⚠️  High memory usage: ${heapUsedMB.toFixed(1)}MB`
  });

  // Update category status
  if (category.checks.some(check => check.status === 'failing')) {
    category.status = 'failing';
  } else if (category.checks.some(check => check.status === 'warning')) {
    category.status = 'warning';
  }

  return category;
}

async function checkSecurity(): Promise<HealthCategory> {
  const category: HealthCategory = {
    name: 'Security',
    status: 'passing',
    checks: []
  };

  // Check for sensitive files
  const sensitiveFiles = ['.env', '.env.local', '.env.production'];
  for (const file of sensitiveFiles) {
    if (existsSync(file)) {
      category.checks.push({
        name: `${file} protection`,
        status: 'warning',
        message: `⚠️  Ensure ${file} is in .gitignore`
      });
    }
  }

  // Check .gitignore
  const hasGitignore = existsSync('.gitignore');
  if (hasGitignore) {
    try {
      const gitignore = readFileSync('.gitignore', 'utf-8');
      const hasEnv = gitignore.includes('.env');
      const hasDist = gitignore.includes('dist/') || gitignore.includes('build/');

      category.checks.push({
        name: 'Git ignore configuration',
        status: hasEnv && hasDist ? 'passing' : 'warning',
        message: hasEnv && hasDist ?
          '✅ Proper .gitignore configuration' :
          '⚠️  Consider adding .env and dist/ to .gitignore'
      });
    } catch {
      category.checks.push({
        name: 'Git ignore validation',
        status: 'warning',
        message: '⚠️  Could not read .gitignore'
      });
    }
  } else {
    category.checks.push({
      name: 'Git ignore file',
      status: 'warning',
      message: '⚠️  Missing .gitignore file'
    });
  }

  // Update category status
  if (category.checks.some(check => check.status === 'failing')) {
    category.status = 'failing';
  } else if (category.checks.some(check => check.status === 'warning')) {
    category.status = 'warning';
  }

  return category;
}

function checkDependencyConflicts(deps: Record<string, string>): string[] {
  const conflicts: string[] = [];

  // Check for multiple similar packages
  const similarPackages = [
    ['typeorm', '@neat/typeorm'],
    ['mongoose', '@neat/mongoose']
  ];

  for (const [pkg1, pkg2] of similarPackages) {
    if (deps[pkg1] && deps[pkg2]) {
      conflicts.push(`${pkg1} and ${pkg2}`);
    }
  }

  return conflicts;
}

async function checkOutdatedPackages(): Promise<string[]> {
  try {
    // This would normally run npm outdated, but we'll simulate it
    return [];
  } catch {
    return [];
  }
}

function generateRecommendations(report: HealthReport): string[] {
  const recommendations: string[] = [];

  // Generate recommendations based on health checks
  Object.values(report.categories).forEach(category => {
    category.checks.forEach(check => {
      if (check.status === 'warning') {
        recommendations.push(`${category.name}: ${check.message}`);
      }
    });
  });

  return recommendations;
}

function generateFixes(report: HealthReport): string[] {
  const fixes: string[] = [];

  // Generate automatic fixes
  Object.values(report.categories).forEach(category => {
    category.checks.forEach(check => {
      if (check.status === 'failing') {
        const fix = getAutomaticFix(check.name);
        if (fix) {
          fixes.push(`${category.name}: ${fix}`);
        }
      }
    });
  });

  return fixes;
}

function getAutomaticFix(checkName: string): string | null {
  const fixes: Record<string, string> = {
    'tsconfig.json exists': 'Run "npx tsc --init"',
    'TypeScript config': 'Add experimentalDecorators and emitDecoratorMetadata to tsconfig.json',
    '@neat/core installed': 'Run "npm install @neat/core"',
    'reflect-metadata installed': 'Run "npm install reflect-metadata"'
  };

  return fixes[checkName] || null;
}

interface HealthReport {
  timestamp: string;
  overall: 'passing' | 'warning' | 'failing';
  categories: {
    project: HealthCategory;
    dependencies: HealthCategory;
    configuration: HealthCategory;
    autoDiscovery: HealthCategory;
    performance: HealthCategory;
    security: HealthCategory;
  };
  recommendations: string[];
  fixes: string[];
}

interface HealthCategory {
  name: string;
  status: 'passing' | 'warning' | 'failing';
  checks: HealthCheck[];
}

interface HealthCheck {
  name: string;
  status: 'passing' | 'warning' | 'failing';
  message: string;
}

function displayHealthReport(report: HealthReport) {
  console.log(chalk.blue('\n🏥 Neat Framework Health Report'));
  console.log(chalk.gray(`Generated: ${new Date(report.timestamp).toLocaleString()}\n`));

  // Overall status
  const statusColor = report.overall === 'passing' ? chalk.green :
                     report.overall === 'warning' ? chalk.yellow : chalk.red;
  console.log(`Overall Status: ${statusColor(report.overall.toUpperCase())}\n`);

  // Category results
  Object.values(report.categories).forEach(category => {
    const categoryColor = category.status === 'passing' ? chalk.green :
                         category.status === 'warning' ? chalk.yellow : chalk.red;

    console.log(`${categoryColor('■')} ${category.name}:`);
    category.checks.forEach(check => {
      console.log(`   ${check.message}`);
    });
    console.log('');
  });
}

function displayHealthSummary(report: HealthReport) {
  console.log(chalk.yellow('📋 Summary:'));

  const totalChecks = Object.values(report.categories)
    .reduce((sum, cat) => sum + cat.checks.length, 0);

  const passingChecks = Object.values(report.categories)
    .reduce((sum, cat) => sum + cat.checks.filter(c => c.status === 'passing').length, 0);

  const warningChecks = Object.values(report.categories)
    .reduce((sum, cat) => sum + cat.checks.filter(c => c.status === 'warning').length, 0);

  const failingChecks = Object.values(report.categories)
    .reduce((sum, cat) => sum + cat.checks.filter(c => c.status === 'failing').length, 0);

  console.log(`   ✅ Passing: ${chalk.green(passingChecks)}`);
  console.log(`   ⚠️  Warnings: ${chalk.yellow(warningChecks)}`);
  console.log(`   ❌ Failing: ${chalk.red(failingChecks)}`);
  console.log(`   📊 Total Checks: ${totalChecks}`);

  if (report.recommendations.length > 0) {
    console.log(chalk.cyan('\n💡 Recommendations:'));
    report.recommendations.forEach(rec => {
      console.log(`   • ${rec}`);
    });
  }

  if (report.fixes.length > 0) {
    console.log(chalk.green('\n🔧 Automatic Fixes Available:'));
    report.fixes.forEach(fix => {
      console.log(`   • ${fix}`);
    });
  }

  // Final message
  if (report.overall === 'passing') {
    console.log(chalk.green('\n🎉 Your Neat Framework project is healthy!'));
  } else if (report.overall === 'warning') {
    console.log(chalk.yellow('\n⚠️  Your project has some warnings to address.'));
  } else {
    console.log(chalk.red('\n❌ Your project has critical issues that need attention.'));
  }

  console.log(chalk.gray('\n💡 Run "neat doctor" again after making changes.'));
}
