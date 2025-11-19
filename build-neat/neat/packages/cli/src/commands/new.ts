/**
 * Neat CLI - New Project Command
 *
 * Creates a new Neat Framework project with zero configuration!
 *
 * Features:
 * - Multiple project templates (default, minimal, enterprise)
 * - Auto-setup of TypeScript configuration
 * - Database integration (TypeORM, Mongoose, or both)
 * - Auto-discovery ready structure
 * - Development server configuration
 * - Build and test scripts
 *
 * This command makes starting new Neat projects instantaneous!
 */

import { execSync } from 'child_process';
import { mkdir, writeFile, copyFile, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import ora from 'ora';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

interface NewOptions {
  template: 'default' | 'minimal' | 'enterprise';
  typescript: boolean;
  skipInstall: boolean;
  database: 'typeorm' | 'mongoose' | 'both';
}

const TEMPLATES = {
  default: {
    description: 'Full-featured Neat project with examples',
    features: ['HTTP server', 'Database integration', 'Auto-discovery', 'Testing', 'Docker']
  },
  minimal: {
    description: 'Minimal Neat project for learning',
    features: ['HTTP server', 'Basic routing', 'Dependency injection']
  },
  enterprise: {
    description: 'Enterprise-ready Neat project',
    features: ['Microservices support', 'Monitoring', 'Security', 'CI/CD', 'Docker']
  }
};

export async function createProject(name: string, options: NewOptions) {
  const spinner = ora('Creating Neat Framework project...').start();

  try {
    // Validate project name
    if (!isValidProjectName(name)) {
      throw new Error(`Invalid project name: ${name}. Use lowercase letters, numbers, and hyphens only.`);
    }

    // Check if directory already exists
    const projectPath = join(process.cwd(), name);
    if (await directoryExists(projectPath)) {
      throw new Error(`Directory ${name} already exists.`);
    }

    // Create project directory
    await mkdir(projectPath, { recursive: true });

    // Get template configuration
    const template = TEMPLATES[options.template];
    if (!template) {
      throw new Error(`Unknown template: ${options.template}`);
    }

    spinner.text = `Setting up ${chalk.cyan(options.template)} template...`;

    // Generate project files
    await generatePackageJson(projectPath, name, options);
    await generateTsConfig(projectPath);
    await generateProjectStructure(projectPath, options);
    await generateSourceFiles(projectPath, options);
    await generateConfigFiles(projectPath, options);

    if (!options.skipInstall) {
      spinner.text = 'Installing dependencies...';
      await installDependencies(projectPath);
    }

    spinner.succeed(chalk.green(`✅ Neat Framework project "${name}" created successfully!`));

    // Show next steps
    showNextSteps(name, options);

  } catch (error) {
    spinner.fail(chalk.red('❌ Failed to create project'));
    console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    process.exit(1);
  }
}

function isValidProjectName(name: string): boolean {
  return /^[a-z0-9-]+$/.test(name);
}

async function directoryExists(path: string): Promise<boolean> {
  try {
    await readFile(join(path, 'package.json'));
    return true;
  } catch {
    return false;
  }
}

async function generatePackageJson(projectPath: string, name: string, options: NewOptions) {
  const packageJson = {
    name: name.toLowerCase(),
    version: '1.0.0',
    description: `Neat Framework application - ${TEMPLATES[options.template].description}`,
    type: 'module',
    scripts: {
      dev: 'neat dev',
      build: 'neat build',
      start: 'node dist/index.js',
      test: 'neat test',
      scan: 'neat scan',
      info: 'neat info',
      doctor: 'neat doctor'
    },
    dependencies: getDependencies(options),
    devDependencies: getDevDependencies(options)
  };

  await writeFile(
    join(projectPath, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );
}

function getDependencies(options: NewOptions): Record<string, string> {
  const deps: Record<string, string> = {
    '@neat/core': '^1.0.0',
    'reflect-metadata': '^0.2.0'
  };

  if (options.database === 'typeorm' || options.database === 'both') {
    deps['@neat/typeorm'] = '^1.0.0';
    deps['typeorm'] = '^0.3.0';
    deps['sqlite3'] = '^5.1.0';
  }

  if (options.database === 'mongoose' || options.database === 'both') {
    deps['@neat/mongoose'] = '^1.0.0';
    deps['mongoose'] = '^8.0.0';
  }

  return deps;
}

function getDevDependencies(options: NewOptions): Record<string, string> {
  return {
    '@neat/cli': '^1.0.0',
    'typescript': '^5.7.0',
    '@types/node': '^22.0.0',
    'tsx': '^4.7.0',
    'nodemon': '^3.0.0'
  };
}

async function generateTsConfig(projectPath: string) {
  const tsconfig = {
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'node',
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      strict: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      resolveJsonModule: true,
      isolatedModules: true,
      noEmit: true,
      experimentalDecorators: true,
      emitDecoratorMetadata: true,
      baseUrl: '.',
      paths: {
        '@/*': ['src/*']
      }
    },
    include: [
      'src/**/*'
    ],
    exclude: [
      'node_modules',
      'dist'
    ]
  };

  await writeFile(
    join(projectPath, 'tsconfig.json'),
    JSON.stringify(tsconfig, null, 2)
  );
}

async function generateProjectStructure(projectPath: string, options: NewOptions) {
  const dirs = [
    'src',
    'src/controllers',
    'src/services',
    'src/entities',
    'src/schemas',
    'src/middleware',
    'src/config',
    'src/utils',
    'tests',
    'tests/unit',
    'tests/integration'
  ];

  if (options.template === 'enterprise') {
    dirs.push(
      'src/modules',
      'src/guards',
      'src/interceptors',
      'src/decorators',
      'src/dto',
      'docker',
      'k8s',
      'monitoring'
    );
  }

  for (const dir of dirs) {
    await mkdir(join(projectPath, dir), { recursive: true });
  }
}

async function generateSourceFiles(projectPath: string, options: NewOptions) {
  // Generate main application file
  await generateAppFile(projectPath, options);

  // Generate database configuration
  await generateDatabaseConfig(projectPath, options);

  // Generate example files based on template
  await generateTemplateFiles(projectPath, options);
}

async function generateAppFile(projectPath: string, options: NewOptions) {
  const imports = ['@neat/core'];

  if (options.database === 'typeorm' || options.database === 'both') {
    imports.push('@neat/core/database');
  }

  if (options.database === 'mongoose' || options.database === 'both') {
    imports.push('@neat/core/database');
  }

  let appContent = `import 'reflect-metadata';
import { NeatApplication } from '@neat/core';

@NeatApplication({
  port: 3000,
  host: 'localhost',
  cors: true,
  logging: true
})
export class App {

`;

  if (options.database === 'typeorm' || options.database === 'both') {
    appContent += `  // TypeORM auto-discovery enabled
  // All @Entity decorated classes will be auto-discovered
`;
  }

  if (options.database === 'mongoose' || options.database === 'both') {
    appContent += `  // Mongoose auto-discovery enabled
  // All @Schema decorated classes will be auto-discovered
`;
  }

  appContent += `}
`;

  await writeFile(join(projectPath, 'src/app.ts'), appContent);
}

async function generateDatabaseConfig(projectPath: string, options: NewOptions) {
  if (options.database === 'typeorm' || options.database === 'both') {
    const typeormConfig = `// TypeORM Configuration
// This will be auto-discovered by NeatTypeORMModule
export const typeormConfig = {
  type: 'sqlite' as const,
  database: './data/app.db',
  synchronize: true, // Auto-create tables (development only)
  logging: process.env.NODE_ENV === 'development',
  entities: [], // Leave empty - auto-discovered by Neat
};
`;
    await writeFile(join(projectPath, 'src/config/database.ts'), typeormConfig);
  }

  if (options.database === 'mongoose' || options.database === 'both') {
    const mongooseConfig = `// Mongoose Configuration
// This will be auto-discovered by NeatMongooseModule
export const mongooseUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/neat-app';
`;
    await writeFile(join(projectPath, 'src/config/database.ts'), mongooseConfig);
  }
}

async function generateTemplateFiles(projectPath: string, options: NewOptions) {
  // Generate basic controller
  const controllerContent = `import { Controller, Get } from '@neat/core';

@Controller('health')
export class HealthController {

  @Get()
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      framework: 'Neat Framework v1.0.0'
    };
  }

  @Get('info')
  info() {
    return {
      name: '${options.database}',
      version: '1.0.0',
      description: '${TEMPLATES[options.template].description}',
      features: ${JSON.stringify(TEMPLATES[options.template].features)}
    };
  }
}
`;
  await writeFile(join(projectPath, 'src/controllers/health.controller.ts'), controllerContent);

  // Generate basic service
  const serviceContent = `import { Injectable } from '@neat/core';

@Injectable()
export class AppService {

  getWelcomeMessage() {
    return {
      message: 'Welcome to Neat Framework!',
      template: '${options.template}',
      database: '${options.database}',
      timestamp: new Date().toISOString()
    };
  }

  getSystemInfo() {
    return {
      platform: process.platform,
      nodeVersion: process.version,
      architecture: process.arch,
      uptime: process.uptime(),
      memory: process.memoryUsage()
    };
  }
}
`;
  await writeFile(join(projectPath, 'src/services/app.service.ts'), serviceContent);

  // Generate README
  const readmeContent = `# ${options.database}

${TEMPLATES[options.template].description}

## Features

${TEMPLATES[options.template].features.map(f => `- ✅ ${f}`).join('\n')}

## Quick Start

\`\`\`bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm run test
\`\`\`

## Auto-Discovery

This project uses Neat Framework's revolutionary auto-discovery system:

- **Services**: All classes decorated with \`@Injectable\` are automatically registered
- **Controllers**: All classes decorated with \`@Controller\` are automatically registered
${options.database === 'typeorm' || options.database === 'both' ? '- **Entities**: All classes decorated with \`@Entity\` are automatically registered' : ''}
${options.database === 'mongoose' || options.database === 'both' ? '- **Schemas**: All classes decorated with \`@Schema\` are automatically registered' : ''}

No manual module registration required!

## Scripts

- \`npm run dev\` - Start development server with hot reload
- \`npm run build\` - Build for production
- \`npm run start\` - Run production build
- \`npm run test\` - Run tests
- \`npm run scan\` - Analyze auto-discovery results
- \`npm run info\` - Show project information
- \`npm run doctor\` - Health check

## Neat CLI

Use the Neat CLI for code generation:

\`\`\`bash
# Generate a new service
npx neat generate service UserService

# Generate a new controller
npx neat generate controller UserController

# Generate a new entity
npx neat generate entity User

# Generate a complete module
npx neat generate module User
\`\`\`

## Architecture

This project follows Neat Framework's zero-boilerplate architecture:

- **Dependency Injection**: Automatic service resolution
- **Auto-Discovery**: No manual configuration
- **Type Safety**: Full TypeScript support
- **Performance**: Optimized for production
- **Scalability**: Enterprise-ready architecture

## Database

${options.database === 'typeorm' ? 'Using TypeORM for SQL database integration with auto-discovery.' : ''}
${options.database === 'mongoose' ? 'Using Mongoose for MongoDB integration with auto-discovery.' : ''}
${options.database === 'both' ? 'Using both TypeORM (SQL) and Mongoose (MongoDB) for maximum flexibility.' : ''}

All database entities/schemas are automatically discovered and registered.

## Deployment

${options.template === 'enterprise' ? 'Enterprise features include Docker configuration, Kubernetes manifests, and monitoring setup.' : 'Ready for deployment with standard Node.js practices.'}

## Learn More

- [Neat Framework Documentation](https://github.com/neat-framework/neat)
- [Auto-Discovery Guide](https://github.com/neat-framework/neat/docs/auto-discovery)
- [Database Integration](https://github.com/neat-framework/neat/docs/database)
`;
  await writeFile(join(projectPath, 'README.md'), readmeContent);
}

async function generateConfigFiles(projectPath: string, options: NewOptions) {
  // Generate .gitignore
  const gitignore = `node_modules/
dist/
.env
.env.local
.env.production
*.log
.DS_Store
data/*.db
`;
  await writeFile(join(projectPath, '.gitignore'), gitignore);

  // Generate .env.example
  const envExample = `# Application Configuration
NODE_ENV=development
PORT=3000
HOST=localhost

# Database Configuration
${options.database === 'typeorm' || options.database === 'both' ? `DATABASE_URL=./data/app.db
DB_TYPE=sqlite` : ''}

${options.database === 'mongoose' || options.database === 'both' ? `MONGODB_URI=mongodb://localhost:27017/neat-app` : ''}

# Logging
LOG_LEVEL=info
`;
  await writeFile(join(projectPath, '.env.example'), envExample);

  if (options.template === 'enterprise') {
    // Generate Docker files
    const dockerfile = `FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:3000/health || exit 1

# Start application
CMD ["npm", "start"]
`;
    await writeFile(join(projectPath, 'Dockerfile'), dockerfile);

    // Generate docker-compose
    const dockerCompose = `version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    volumes:
      - ./data:/app/data
    depends_on:
      - db
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  db:
    image: sqlite3:latest
    volumes:
      - ./data:/data
    command: ["sqlite3", "/data/app.db", "VACUUM;"]
`;
    await writeFile(join(projectPath, 'docker-compose.yml'), dockerCompose);
  }
}

async function installDependencies(projectPath: string) {
  const originalCwd = process.cwd();
  try {
    process.chdir(projectPath);
    execSync('npm install', { stdio: 'inherit' });
  } finally {
    process.chdir(originalCwd);
  }
}

function showNextSteps(name: string, options: NewOptions) {
  console.log(`
🎯 Next Steps:

  1. Navigate to your project:
     ${chalk.cyan(`cd ${name}`)}

  2. Start development server:
     ${chalk.cyan('npm run dev')}

  3. Open your browser:
     ${chalk.cyan('http://localhost:3000')}

  4. Check health endpoint:
     ${chalk.cyan('http://localhost:3000/health')}

  5. Generate new code:
     ${chalk.cyan('npx neat generate service MyService')}

📚 Useful Commands:
  • ${chalk.yellow('npm run dev')}     - Start development server
  • ${chalk.yellow('npm run build')}   - Build for production
  • ${chalk.yellow('npm run test')}    - Run tests
  • ${chalk.yellow('npm run scan')}    - Analyze auto-discovery
  • ${chalk.yellow('npm run doctor')}  - Health check

🚀 Happy coding with Neat Framework!
  `);
}

