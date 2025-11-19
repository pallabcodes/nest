/**
 * Neat CLI - Code Generation Commands
 *
 * Revolutionary code generation with zero boilerplate!
 *
 * Features:
 * - Service generation with DI decorators
 * - Controller generation with HTTP decorators
 * - Entity generation for TypeORM/Mongoose
 * - Module generation (service + controller + entity)
 * - Auto-import resolution
 * - TypeScript-first generation
 *
 * This makes Neat Framework the most productive development experience!
 */

import { writeFile, mkdir, readFile } from 'fs/promises';
import { join, dirname, extname } from 'path';
import { glob } from 'glob';
import chalk from 'chalk';
import ora from 'ora';

interface GenerateOptions {
  path?: string;
  routes?: string;
  database?: 'typeorm' | 'mongoose';
  fields?: string;
  type?: string;
}

export async function generateService(name: string, options: GenerateOptions) {
  const spinner = ora('Generating service...').start();

  try {
    const serviceName = toPascalCase(name);
    const fileName = `${toKebabCase(name)}.service.ts`;
    const filePath = join(options.path || 'src/services', fileName);

    // Ensure directory exists
    await mkdir(dirname(filePath), { recursive: true });

    // Generate service content
    const content = generateServiceContent(serviceName);

    await writeFile(filePath, content);

    spinner.succeed(chalk.green(`✅ Service generated: ${filePath}`));
    console.log(`   📝 Created ${chalk.cyan(serviceName)} with dependency injection ready`);

  } catch (error) {
    spinner.fail(chalk.red('❌ Failed to generate service'));
    console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    process.exit(1);
  }
}

export async function generateController(name: string, options: GenerateOptions) {
  const spinner = ora('Generating controller...').start();

  try {
    const controllerName = toPascalCase(name) + 'Controller';
    const fileName = `${toKebabCase(name)}.controller.ts`;
    const filePath = join(options.path || 'src/controllers', fileName);

    // Ensure directory exists
    await mkdir(dirname(filePath), { recursive: true });

    // Parse routes
    const routes = parseRoutes(options.routes || 'get,post');

    // Generate controller content
    const content = generateControllerContent(controllerName, routes);

    await writeFile(filePath, content);

    spinner.succeed(chalk.green(`✅ Controller generated: ${filePath}`));
    console.log(`   🛣️  Created ${chalk.cyan(controllerName)} with routes: ${routes.join(', ')}`);

  } catch (error) {
    spinner.fail(chalk.red('❌ Failed to generate controller'));
    console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    process.exit(1);
  }
}

export async function generateEntity(name: string, options: GenerateOptions) {
  const spinner = ora('Generating entity...').start();

  try {
    const entityName = toPascalCase(name);
    const fileName = `${toKebabCase(name)}.entity.ts`;
    const database = options.database || 'typeorm';

    let filePath: string;
    if (database === 'mongoose') {
      filePath = join(options.path || 'src/schemas', fileName);
    } else {
      filePath = join(options.path || 'src/entities', fileName);
    }

    // Ensure directory exists
    await mkdir(dirname(filePath), { recursive: true });

    // Parse fields
    const fields = parseFields(options.fields || 'name:string,createdAt:date');

    // Generate entity content
    const content = generateEntityContent(entityName, database, fields);

    await writeFile(filePath, content);

    spinner.succeed(chalk.green(`✅ Entity generated: ${filePath}`));
    console.log(`   🗃️  Created ${chalk.cyan(entityName)} for ${database} with ${fields.length} fields`);

  } catch (error) {
    spinner.fail(chalk.red('❌ Failed to generate entity'));
    console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    process.exit(1);
  }
}

export async function generateModule(name: string, options: GenerateOptions) {
  const spinner = ora('Generating module...').start();

  try {
    const moduleName = toPascalCase(name);
    const basePath = options.path || `src/modules/${toKebabCase(name)}`;
    const database = options.database || 'typeorm';

    // Create module directory structure
    await mkdir(join(basePath, 'services'), { recursive: true });
    await mkdir(join(basePath, 'controllers'), { recursive: true });
    if (database === 'typeorm') {
      await mkdir(join(basePath, 'entities'), { recursive: true });
    } else {
      await mkdir(join(basePath, 'schemas'), { recursive: true });
    }

    // Generate all module files
    const serviceName = moduleName + 'Service';
    const controllerName = moduleName + 'Controller';
    const entityName = moduleName;

    // Generate service
    const serviceContent = generateServiceContent(serviceName);
    await writeFile(join(basePath, 'services', `${toKebabCase(moduleName)}.service.ts`), serviceContent);

    // Generate controller
    const controllerContent = generateControllerContent(controllerName, ['get', 'post', 'put', 'delete']);
    await writeFile(join(basePath, 'controllers', `${toKebabCase(moduleName)}.controller.ts`), controllerContent);

    // Generate entity/schema
    const entityFields = [
      { name: 'name', type: 'string' },
      { name: 'description', type: 'string' },
      { name: 'createdAt', type: 'date' },
      { name: 'updatedAt', type: 'date' }
    ];
    const entityContent = generateEntityContent(entityName, database, entityFields);

    if (database === 'typeorm') {
      await writeFile(join(basePath, 'entities', `${toKebabCase(moduleName)}.entity.ts`), entityContent);
    } else {
      await writeFile(join(basePath, 'schemas', `${toKebabCase(moduleName)}.schema.ts`), entityContent);
    }

    // Generate module index file
    const indexContent = generateModuleIndex(moduleName, database);
    await writeFile(join(basePath, 'index.ts'), indexContent);

    spinner.succeed(chalk.green(`✅ Module generated: ${basePath}`));
    console.log(`   📦 Created complete ${chalk.cyan(moduleName)} module:`);
    console.log(`      • Service: ${serviceName}`);
    console.log(`      • Controller: ${controllerName}`);
    console.log(`      • Entity: ${entityName} (${database})`);
    console.log(`      • Auto-exports in index.ts`);

  } catch (error) {
    spinner.fail(chalk.red('❌ Failed to generate module'));
    console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    process.exit(1);
  }
}

function generateServiceContent(serviceName: string): string {
  return `import { Injectable } from '@neat/core';

@Injectable()
export class ${serviceName} {

  private items: any[] = [];

  /**
   * Find all items
   */
  findAll(): any[] {
    return this.items;
  }

  /**
   * Find item by ID
   */
  findById(id: string | number): any | null {
    return this.items.find(item => item.id === id) || null;
  }

  /**
   * Create new item
   */
  create(data: any): any {
    const item = {
      id: Date.now(), // Simple ID generation
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.items.push(item);
    return item;
  }

  /**
   * Update existing item
   */
  update(id: string | number, data: any): any | null {
    const index = this.items.findIndex(item => item.id === id);
    if (index === -1) return null;

    this.items[index] = {
      ...this.items[index],
      ...data,
      updatedAt: new Date()
    };

    return this.items[index];
  }

  /**
   * Delete item
   */
  delete(id: string | number): boolean {
    const index = this.items.findIndex(item => item.id === id);
    if (index === -1) return false;

    this.items.splice(index, 1);
    return true;
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      totalItems: this.items.length,
      lastUpdated: this.items.length > 0 ? this.items[this.items.length - 1].updatedAt : null
    };
  }
}
`;
}

function generateControllerContent(controllerName: string, routes: string[]): string {
  const routeImports: string[] = [];
  const routeDecorators: string[] = [];

  if (routes.includes('get')) {
    routeImports.push('Get');
    routeDecorators.push('@Get()');
  }

  if (routes.includes('post')) {
    routeImports.push('Post');
    routeDecorators.push('@Post()');
  }

  if (routes.includes('put')) {
    routeImports.push('Put');
    routeDecorators.push('@Put()');
  }

  if (routes.includes('patch')) {
    routeImports.push('Patch');
    routeDecorators.push('@Patch()');
  }

  if (routes.includes('delete')) {
    routeImports.push('Delete');
    routeDecorators.push('@Delete()');
  }

  return `import { Controller, ${routeImports.join(', ')} } from '@neat/core';

@Controller('${toKebabCase(controllerName.replace('Controller', ''))}')
export class ${controllerName} {

  ${routeDecorators.map(decorator => `${decorator}
  findAll() {
    return {
      message: '${controllerName} - findAll',
      timestamp: new Date().toISOString()
    };
  }
`).join('\n  ')}

  // Add your service injection here
  // constructor(private readonly service: YourService) {}

  // Add your route handlers here
  // @Get(':id')
  // findById(@Param('id') id: string) {
  //   return this.service.findById(id);
  // }
}
`;
}

function generateEntityContent(entityName: string, database: string, fields: any[]): string {
  if (database === 'mongoose') {
    return generateMongooseSchema(entityName, fields);
  } else {
    return generateTypeORMEntity(entityName, fields);
  }
}

function generateTypeORMEntity(entityName: string, fields: any[]): string {
  const fieldDeclarations = fields.map(field => {
    const columnDecorator = getTypeORMColumnDecorator(field.type);
    return `  ${columnDecorator}
  ${field.name}!: ${getTypeScriptType(field.type)};`;
  }).join('\n\n');

  return `import { Entity, PrimaryGeneratedColumn, ${getTypeORMImports(fields)} } from '@neat/core/database';

@Entity('${toSnakeCase(entityName)}')
export class ${entityName} {

  @PrimaryGeneratedColumn()
  id!: number;

${fieldDeclarations}
}
`;
}

function generateMongooseSchema(entityName: string, fields: any[]): string {
  const schemaName = entityName + 'Schema';
  const fieldDefinitions = fields.map(field =>
    `  ${field.name}: { type: ${getMongooseType(field.type)}, required: true }`
  ).join(',\n');

  return `import { Schema, Prop } from '@neat/core/database';

@Schema('${toSnakeCase(entityName)}', { timestamps: true })
export class ${schemaName} {

${fields.map(field => `  @Prop({ required: true })
  ${field.name}!: ${getTypeScriptType(field.type)};`).join('\n\n')}
}

// Auto-register schema for auto-discovery
import { registerSchema } from '@neat/core/database';
registerSchema(${schemaName});
`;
}

function generateModuleIndex(moduleName: string, database: string): string {
  const entityDir = database === 'typeorm' ? 'entities' : 'schemas';
  const entityExt = database === 'typeorm' ? 'entity' : 'schema';

  return `/**
 * ${moduleName} Module
 *
 * Auto-exports all module components for auto-discovery
 */

export { ${moduleName}Service } from './services/${toKebabCase(moduleName)}.service.js';
export { ${moduleName}Controller } from './controllers/${toKebabCase(moduleName)}.controller.js';
export { ${moduleName} } from './${entityDir}/${toKebabCase(moduleName)}.${entityExt}.js';
`;
}

function parseRoutes(routesStr: string): string[] {
  return routesStr.split(',').map(r => r.trim().toLowerCase());
}

function parseFields(fieldsStr: string): any[] {
  if (!fieldsStr) return [];

  return fieldsStr.split(',').map(field => {
    const [name, type] = field.trim().split(':');
    return {
      name: name.trim(),
      type: type ? type.trim() : 'string'
    };
  });
}

function getTypeORMColumnDecorator(type: string): string {
  switch (type.toLowerCase()) {
    case 'string':
    case 'varchar':
      return '@Column({ type: \'varchar\' })';
    case 'text':
      return '@Column({ type: \'text\' })';
    case 'number':
    case 'int':
    case 'integer':
      return '@Column({ type: \'int\' })';
    case 'boolean':
    case 'bool':
      return '@Column({ type: \'boolean\' })';
    case 'date':
    case 'datetime':
      return '@Column({ type: \'datetime\' })';
    case 'createdat':
      return '@CreateDateColumn()';
    case 'updatedat':
      return '@UpdateDateColumn()';
    default:
      return '@Column()';
  }
}

function getTypeORMImports(fields: any[]): string {
  const imports = new Set<string>();

  fields.forEach(field => {
    if (field.type === 'createdat') {
      imports.add('CreateDateColumn');
    } else if (field.type === 'updatedat') {
      imports.add('UpdateDateColumn');
    } else {
      imports.add('Column');
    }
  });

  return Array.from(imports).join(', ');
}

function getMongooseType(type: string): string {
  switch (type.toLowerCase()) {
    case 'string':
    case 'varchar':
    case 'text':
      return 'String';
    case 'number':
    case 'int':
    case 'integer':
      return 'Number';
    case 'boolean':
    case 'bool':
      return 'Boolean';
    case 'date':
    case 'datetime':
    case 'createdat':
    case 'updatedat':
      return 'Date';
    default:
      return 'String';
  }
}

function getTypeScriptType(type: string): string {
  switch (type.toLowerCase()) {
    case 'string':
    case 'varchar':
    case 'text':
      return 'string';
    case 'number':
    case 'int':
    case 'integer':
      return 'number';
    case 'boolean':
    case 'bool':
      return 'boolean';
    case 'date':
    case 'datetime':
    case 'createdat':
    case 'updatedat':
      return 'Date';
    default:
      return 'any';
  }
}

function toPascalCase(str: string): string {
  return str
    .split(/[-_\s]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

function toSnakeCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
}

export async function generateAuth(options: any) {
  const spinner = ora('Generating authentication setup...').start();

  try {
    if (options.basic) {
      await generateBasicAuth();
    } else if (options.full) {
      await generateFullAuth();
    } else if (options.controller) {
      await generateAuthController();
    } else if (options.guard) {
      await generateCustomGuard(options.guard);
    } else if (options.strategy) {
      await generateCustomStrategy(options.strategy);
    } else {
      // Default: generate basic auth
      await generateBasicAuth();
    }

    spinner.succeed(chalk.green('✅ Authentication setup generated successfully'));

    console.log(chalk.yellow('\n📋 Next Steps:'));
    console.log('   1. 📦 Install dependencies: npm install @neat/auth');
    console.log('   2. ⚙️  Configure environment variables');
    console.log('   3. 🔧 Update your app.ts to include NeatAuthModule');
    console.log('   4. 🚀 Start server and test auth endpoints');

  } catch (error) {
    spinner.fail(chalk.red('❌ Failed to generate auth setup'));
    console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    process.exit(1);
  }
}

async function generateBasicAuth() {
  console.log('🔐 Generating basic JWT authentication...');

  // Generate auth service
  await generateAuthService();

  // Generate auth controller
  await generateAuthController();

  // Generate auth module configuration
  await generateAuthModuleConfig();

  // Generate environment template
  await generateAuthEnvTemplate();
}

async function generateFullAuth() {
  console.log('🔐 Generating full authentication with OAuth...');

  await generateBasicAuth();

  // Generate OAuth configuration
  await generateOAuthConfig();

  // Update environment template with OAuth
  await generateFullAuthEnvTemplate();
}

async function generateAuthService() {
  const serviceContent = `import { Injectable } from '@neat/core';
import { BaseAuthService, User } from '@neat/auth';

@Injectable()
export class AuthService extends BaseAuthService {
  // Extend BaseAuthService and implement these methods:

  async validateUser(email: string, password: string): Promise<User | null> {
    // TODO: Implement user validation against your database
    // Example with TypeORM:
    // const user = await this.userRepository.findOne({ where: { email } });
    // if (user && await this.verifyPassword(password, user.password)) {
    //   return user;
    // }
    // return null;

    // Placeholder implementation:
    if (email === 'admin@example.com' && password === 'password') {
      return {
        id: 1,
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        roles: ['admin'],
        isActive: true,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
    return null;
  }

  async createUser(userData: any): Promise<User> {
    // TODO: Implement user creation in your database
    // const hashedPassword = await this.hashPassword(userData.password);
    // const user = await this.userRepository.save({
    //   ...userData,
    //   password: hashedPassword,
    //   roles: ['user'],
    //   isActive: true,
    //   emailVerified: false
    // });
    // return user;

    throw new Error('createUser not implemented - extend this service');
  }

  async findUserById(id: string | number): Promise<User | null> {
    // TODO: Implement user lookup by ID
    // return await this.userRepository.findOne({ where: { id } });

    throw new Error('findUserById not implemented - extend this service');
  }

  async findUserByEmail(email: string): Promise<User | null> {
    // TODO: Implement user lookup by email
    // return await this.userRepository.findOne({ where: { email } });

    throw new Error('findUserByEmail not implemented - extend this service');
  }

  async updateUser(id: string | number, updates: Partial<User>): Promise<User | null> {
    // TODO: Implement user update
    // await this.userRepository.update(id, updates);
    // return await this.findUserById(id);

    throw new Error('updateUser not implemented - extend this service');
  }

  async revokeUserTokens(userId: string | number): Promise<void> {
    // TODO: Implement token revocation (update token versions)
    // await this.userRepository.update(userId, {
    //   tokenVersion: (current tokenVersion || 1) + 1,
    //   refreshTokenVersion: (current refreshTokenVersion || 1) + 1
    // });

    throw new Error('revokeUserTokens not implemented - extend this service');
  }
}
`;

  await writeFile('src/services/auth.service.ts', serviceContent);
  console.log('   ✅ Created src/services/auth.service.ts');
}

async function generateAuthController() {
  const controllerContent = `import { Controller, Post, Body, Get, UseGuard } from '@neat/core';
import {
  AuthService,
  LoginCredentials,
  RegisterData,
  AuthTokens,
  CurrentUser,
  User,
  Public
} from '@neat/auth';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  async login(@Body() credentials: LoginCredentials): Promise<{ user: User; tokens: AuthTokens }> {
    const user = await this.authService.validateUser(credentials.email, credentials.password);

    if (!user) {
      return {
        error: 'Invalid credentials',
        status: 401
      } as any;
    }

    const tokens = await this.authService.generateTokens(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles
      },
      tokens
    };
  }

  @Public()
  @Post('register')
  async register(@Body() userData: RegisterData): Promise<{ user: User; tokens: AuthTokens }> {
    try {
      const user = await this.authService.createUser(userData);
      const tokens = await this.authService.generateTokens(user);

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          roles: user.roles
        },
        tokens
      };
    } catch (error) {
      return {
        error: 'Registration failed',
        status: 400
      } as any;
    }
  }

  @Post('refresh')
  async refresh(@Body() data: { refreshToken: string }): Promise<AuthTokens> {
    const tokens = await this.authService.refreshTokens(data.refreshToken);

    if (!tokens) {
      return {
        error: 'Invalid refresh token',
        status: 401
      } as any;
    }

    return tokens;
  }

  @Post('logout')
  async logout(@CurrentUser() user: User): Promise<{ message: string }> {
    await this.authService.revokeUserTokens(user.id);
    return { message: 'Logged out successfully' };
  }

  @Get('profile')
  getProfile(@CurrentUser() user: User): User {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roles,
      permissions: user.permissions,
      createdAt: user.createdAt
    };
  }

  @Get('me')
  getCurrentUser(@CurrentUser() user: User): User {
    return user;
  }
}
`;

  await writeFile('src/controllers/auth.controller.ts', controllerContent);
  console.log('   ✅ Created src/controllers/auth.controller.ts');
}

async function generateAuthModuleConfig() {
  const configContent = `import { NeatAuthModule, createBasicAuthConfig } from '@neat/auth';

// Configure authentication
const authConfig = createBasicAuthConfig({
  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },
  // Password hashing
  bcrypt: {
    rounds: parseInt(process.env.BCRYPT_ROUNDS || '12')
  }
});

// Create auth module
export const authModule = new NeatAuthModule(authConfig);

// Export for use in your main app
export { NeatAuthModule };
`;

  await writeFile('src/config/auth.ts', configContent);
  console.log('   ✅ Created src/config/auth.ts');
}

async function generateOAuthConfig() {
  const oauthConfigContent = `import { OAuthConfigs } from '@neat/auth';

// OAuth provider configurations
export const oauthConfigs: OAuthConfigs = {
  google: {
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/oauth/google/callback',
    scope: ['email', 'profile']
  },
  github: {
    clientID: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    callbackURL: process.env.GITHUB_CALLBACK_URL || 'http://localhost:3000/auth/oauth/github/callback',
    scope: ['user:email']
  },
  // Add more OAuth providers as needed
  // facebook: { ... },
  // twitter: { ... }
};
`;

  await writeFile('src/config/oauth.ts', oauthConfigContent);
  console.log('   ✅ Created src/config/oauth.ts');
}

async function generateAuthEnvTemplate() {
  const envContent = `# Authentication Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_ROUNDS=12

# OAuth Configuration (optional)
# GOOGLE_CLIENT_ID=your-google-client-id
# GOOGLE_CLIENT_SECRET=your-google-client-secret
# GOOGLE_CALLBACK_URL=http://localhost:3000/auth/oauth/google/callback

# GITHUB_CLIENT_ID=your-github-client-id
# GITHUB_CLIENT_SECRET=your-github-client-secret
# GITHUB_CALLBACK_URL=http://localhost:3000/auth/oauth/github/callback
`;

  await writeFile('.env.example', envContent);
  console.log('   ✅ Updated .env.example with auth configuration');
}

async function generateFullAuthEnvTemplate() {
  const envContent = `# Authentication Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_ROUNDS=12

# OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/oauth/google/callback

GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_CALLBACK_URL=http://localhost:3000/auth/oauth/github/callback

# Additional OAuth providers (optional)
# FACEBOOK_CLIENT_ID=your-facebook-client-id
# FACEBOOK_CLIENT_SECRET=your-facebook-client-secret
# TWITTER_CONSUMER_KEY=your-twitter-consumer-key
# TWITTER_CONSUMER_SECRET=your-twitter-consumer-secret
`;

  await writeFile('.env.example', envContent);
  console.log('   ✅ Updated .env.example with full OAuth configuration');
}

async function generateCustomGuard(guardName: string) {
  const guardContent = `import { Injectable } from '@neat/core';
import { AuthGuard, AuthGuardContext, AuthGuardResult } from '@neat/auth';

@Injectable()
export class ${guardName} extends AuthGuard {
  async canActivate(context: AuthGuardContext): Promise<AuthGuardResult> {
    // First check basic authentication
    const authResult = await this.jwtGuard(context);
    if (!authResult) {
      return false;
    }

    // Add your custom authorization logic here
    const { request } = context;
    const user = (request as any).user;

    // Example: Check if user has specific permissions or meets custom criteria
    // if (!this.checkCustomCondition(user)) {
    //   return false;
    // }

    return true;
  }

  private checkCustomCondition(user: any): boolean {
    // Implement your custom authorization logic
    // Example: Check subscription status, feature flags, etc.
    return true; // Allow by default
  }
}
`;

  await writeFile(`src/guards/${toKebabCase(guardName)}.guard.ts`, guardContent);
  console.log(`   ✅ Created src/guards/${toKebabCase(guardName)}.guard.ts`);
}

async function generateCustomStrategy(strategyName: string) {
  const strategyContent = `import { Injectable } from '@neat/core';
import { AuthService } from '@neat/auth';

@Injectable()
export class ${strategyName}Strategy {
  constructor(private readonly authService: AuthService) {}

  async validate(token: string): Promise<any> {
    // Implement your custom authentication strategy
    // This could be API key validation, custom JWT format, etc.

    try {
      // Example: Custom token validation
      // const payload = await this.validateCustomToken(token);
      // const user = await this.authService.findUserById(payload.userId);
      // return user;

      throw new Error('Custom strategy not implemented');
    } catch (error) {
      return null;
    }
  }

  private async validateCustomToken(token: string): Promise<any> {
    // Implement your custom token validation logic
    // This is where you'd put your specific authentication logic
    throw new Error('validateCustomToken not implemented');
  }
}
`;

  await writeFile(`src/strategies/${toKebabCase(strategyName)}.strategy.ts`, strategyContent);
  console.log(`   ✅ Created src/strategies/${toKebabCase(strategyName)}.strategy.ts`);
}

// ========================================
// MIDDLEWARE GENERATION FUNCTIONS
// ========================================

export async function generateGuard(name: string, options: GenerateOptions) {
  const spinner = ora('Generating guard...').start();

  try {
    const guardName = toPascalCase(name);
    const fileName = `${toKebabCase(name)}.guard.ts`;
    const filePath = join(options.path || 'src/guards', fileName);

    await mkdir(dirname(filePath), { recursive: true });

    const content = generateGuardContent(guardName, options.type || 'auth');
    await writeFile(filePath, content);

    spinner.succeed(chalk.green(`✅ Guard generated: ${filePath}`));
    console.log(`   📝 Created ${chalk.cyan(guardName)} guard with authorization logic`);

  } catch (error) {
    spinner.fail(chalk.red('❌ Failed to generate guard'));
    throw error;
  }
}

export async function generatePipe(name: string, options: GenerateOptions) {
  const spinner = ora('Generating pipe...').start();

  try {
    const pipeName = toPascalCase(name);
    const fileName = `${toKebabCase(name)}.pipe.ts`;
    const filePath = join(options.path || 'src/pipes', fileName);

    await mkdir(dirname(filePath), { recursive: true });

    const content = generatePipeContent(pipeName, options.type || 'validation');
    await writeFile(filePath, content);

    spinner.succeed(chalk.green(`✅ Pipe generated: ${filePath}`));
    console.log(`   📝 Created ${chalk.cyan(pipeName)} pipe for data transformation`);

  } catch (error) {
    spinner.fail(chalk.red('❌ Failed to generate pipe'));
    throw error;
  }
}

export async function generateInterceptor(name: string, options: GenerateOptions) {
  const spinner = ora('Generating interceptor...').start();

  try {
    const interceptorName = toPascalCase(name);
    const fileName = `${toKebabCase(name)}.interceptor.ts`;
    const filePath = join(options.path || 'src/interceptors', fileName);

    await mkdir(dirname(filePath), { recursive: true });

    const content = generateInterceptorContent(interceptorName, options.type || 'logging');
    await writeFile(filePath, content);

    spinner.succeed(chalk.green(`✅ Interceptor generated: ${filePath}`));
    console.log(`   📝 Created ${chalk.cyan(interceptorName)} interceptor for request processing`);

  } catch (error) {
    spinner.fail(chalk.red('❌ Failed to generate interceptor'));
    throw error;
  }
}

export async function generateExceptionFilter(name: string, options: GenerateOptions) {
  const spinner = ora('Generating exception filter...').start();

  try {
    const filterName = toPascalCase(name);
    const fileName = `${toKebabCase(name)}.filter.ts`;
    const filePath = join(options.path || 'src/filters', fileName);

    await mkdir(dirname(filePath), { recursive: true });

    const content = generateExceptionFilterContent(filterName, options.type || 'http');
    await writeFile(filePath, content);

    spinner.succeed(chalk.green(`✅ Exception filter generated: ${filePath}`));
    console.log(`   📝 Created ${chalk.cyan(filterName)} filter for error handling`);

  } catch (error) {
    spinner.fail(chalk.red('❌ Failed to generate exception filter'));
    throw error;
  }
}

// ========================================
// MIDDLEWARE CONTENT GENERATORS
// ========================================

function generateGuardContent(name: string, type: string): string {
  const imports = `import { Injectable } from '@neat/core';
import { Guard, GuardContext } from '@neat/middleware';`;

  let decorator = '';
  let classContent = '';

  switch (type) {
    case 'auth':
      decorator = `@Guard({\n  name: '${name}',\n  priority: 10,\n  global: false\n})`;
      classContent = `
  async canActivate(context: GuardContext): Promise<boolean> {
    // Implement your authorization logic here
    // Example: Check if user is authenticated
    const user = context.user;
    if (!user) {
      return false;
    }

    // Add your custom authorization logic
    // return this.checkPermissions(user, context.route);

    return true;
  }`;
      break;

    case 'role':
      decorator = `@Guard({\n  name: '${name}',\n  priority: 20,\n  global: false\n})`;
      classContent = `
  constructor(private readonly requiredRoles: string[]) {}

  async canActivate(context: GuardContext): Promise<boolean> {
    const userRoles = context.roles || [];
    return this.requiredRoles.some(role => userRoles.includes(role));
  }`;
      break;

    case 'permission':
      decorator = `@Guard({\n  name: '${name}',\n  priority: 20,\n  global: false\n})`;
      classContent = `
  constructor(private readonly requiredPermissions: string[]) {}

  async canActivate(context: GuardContext): Promise<boolean> {
    const userPermissions = context.permissions || [];
    return this.requiredPermissions.some(permission => userPermissions.includes(permission));
  }`;
      break;

    case 'rate-limit':
      decorator = `@Guard({\n  name: '${name}',\n  priority: 5,\n  global: false\n})`;
      classContent = `
  private readonly requests = new Map<string, { count: number; resetTime: number }>();

  constructor(
    private readonly maxRequests: number = 100,
    private readonly windowMs: number = 15 * 60 * 1000 // 15 minutes
  ) {}

  async canActivate(context: GuardContext): Promise<boolean> {
    const clientId = this.getClientIdentifier(context);
    const now = Date.now();

    const record = this.requests.get(clientId) || { count: 0, resetTime: now + this.windowMs };

    if (now > record.resetTime) {
      record.count = 0;
      record.resetTime = now + this.windowMs;
    }

    if (record.count >= this.maxRequests) {
      return false;
    }

    record.count++;
    this.requests.set(clientId, record);

    // Cleanup old entries
    if (Math.random() < 0.01) {
      this.cleanup();
    }

    return true;
  }

  private getClientIdentifier(context: GuardContext): string {
    return context.user?.id?.toString() ||
           context.request.headers?.['x-forwarded-for'] ||
           'anonymous';
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.requests.entries()) {
      if (now > record.resetTime) {
        this.requests.delete(key);
      }
    }
  }`;
      break;

    default:
      decorator = `@Guard({\n  name: '${name}',\n  priority: 10,\n  global: false\n})`;
      classContent = `
  async canActivate(context: GuardContext): Promise<boolean> {
    // Implement your custom guard logic here
    return true;
  }`;
  }

  return `${imports}

@Injectable()
${decorator}
export class ${name} implements Guard {
${classContent}
}
`;
}

function generatePipeContent(name: string, type: string): string {
  const imports = `import { Injectable } from '@neat/core';
import { Pipe, PipeResult, PipeMetadata } from '@neat/middleware';`;

  let decorator = '';
  let classContent = '';

  switch (type) {
    case 'validation':
      decorator = `@Pipe({\n  name: '${name}',\n  priority: 10,\n  global: false,\n  types: ['body']\n})`;
      classContent = `
  async transform(value: any, metadata: PipeMetadata): Promise<PipeResult> {
    // Implement validation logic here
    // Example: Basic validation
    if (!value) {
      return {
        success: false,
        errors: [{
          field: metadata.field || 'value',
          message: 'Value is required',
          value
        }]
      };
    }

    // Add your custom validation logic
    // const errors = await validate(value);
    // if (errors.length > 0) {
    //   return { success: false, errors };
    // }

    return { success: true, value };
  }`;
      break;

    case 'transform':
      decorator = `@Pipe({\n  name: '${name}',\n  priority: 5,\n  global: false\n})`;
      classContent = `
  async transform(value: any, metadata: PipeMetadata): Promise<PipeResult> {
    // Implement transformation logic here
    // Example: Trim strings
    if (typeof value === 'string') {
      return { success: true, value: value.trim() };
    }

    // Example: Convert to uppercase
    // if (typeof value === 'string') {
    //   return { success: true, value: value.toUpperCase() };
    // }

    return { success: true, value };
  }`;
      break;

    case 'parse':
      decorator = `@Pipe({\n  name: '${name}',\n  priority: 5,\n  global: false,\n  types: ['param', 'query']\n})`;
      classContent = `
  async transform(value: any, metadata: PipeMetadata): Promise<PipeResult> {
    // Implement parsing logic here
    // Example: Parse number
    if (metadata.type === 'param' || metadata.type === 'query') {
      if (typeof value === 'string') {
        const parsed = parseInt(value, 10);
        if (isNaN(parsed)) {
          return {
            success: false,
            errors: [{
              field: metadata.field || 'value',
              message: 'Invalid number format',
              value
            }]
          };
        }
        return { success: true, value: parsed };
      }
    }

    return { success: true, value };
  }`;
      break;

    default:
      decorator = `@Pipe({\n  name: '${name}',\n  priority: 10,\n  global: false\n})`;
      classContent = `
  async transform(value: any, metadata: PipeMetadata): Promise<PipeResult> {
    // Implement your custom pipe logic here
    return { success: true, value };
  }`;
  }

  return `${imports}

@Injectable()
${decorator}
export class ${name} implements Pipe {
${classContent}
}
`;
}

function generateInterceptorContent(name: string, type: string): string {
  const imports = `import { Injectable } from '@neat/core';
import { Interceptor, InterceptorResult, InterceptorContext, CallHandler } from '@neat/middleware';`;

  let decorator = '';
  let classContent = '';

  switch (type) {
    case 'logging':
      decorator = `@Interceptor({\n  name: '${name}',\n  priority: 1,\n  global: false\n})`;
      classContent = `
  async intercept(context: InterceptorContext, next: CallHandler): Promise<InterceptorResult> {
    const { route, startTime } = context;

    console.log(\`[REQUEST] \${route.method} \${route.path} - Start\`);

    try {
      const result = await next.handle();
      const duration = Date.now() - startTime;

      console.log(\`[RESPONSE] \${route.method} \${route.path} - \${duration}ms\`);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(\`[ERROR] \${route.method} \${route.path} - \${duration}ms - \${error}\`);

      throw error;
    }
  }`;
      break;

    case 'cache':
      decorator = `@Interceptor({\n  name: '${name}',\n  priority: 5,\n  global: false\n})`;
      classContent = `
  private readonly cache = new Map<string, { data: any; expiry: number }>();

  constructor(private readonly ttl: number = 300000) {} // 5 minutes

  async intercept(context: InterceptorContext, next: CallHandler): Promise<InterceptorResult> {
    const cacheKey = this.generateCacheKey(context);

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return { success: true, data: cached.data };
    }

    // Execute handler
    const result = await next.handle();

    // Cache successful responses
    if (result.success) {
      this.cache.set(cacheKey, {
        data: result.data,
        expiry: Date.now() + this.ttl
      });
    }

    return result;
  }

  private generateCacheKey(context: InterceptorContext): string {
    const { route, request } = context;
    const queryString = request.query ? JSON.stringify(request.query) : '';
    return \`\${route.method}:\${route.path}:\${queryString}\`;
  }`;
      break;

    case 'timeout':
      decorator = `@Interceptor({\n  name: '${name}',\n  priority: 10,\n  global: false\n})`;
      classContent = `
  constructor(private readonly timeoutMs: number = 30000) {}

  async intercept(context: InterceptorContext, next: CallHandler): Promise<InterceptorResult> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(\`Request timeout after \${this.timeoutMs}ms\`));
      }, this.timeoutMs);
    });

    try {
      return await Promise.race([next.handle(), timeoutPromise]);
    } catch (error) {
      if (error.message.includes('timeout')) {
        return {
          success: false,
          error
        };
      }
      throw error;
    }
  }`;
      break;

    default:
      decorator = `@Interceptor({\n  name: '${name}',\n  priority: 10,\n  global: false\n})`;
      classContent = `
  async intercept(context: InterceptorContext, next: CallHandler): Promise<InterceptorResult> {
    // Implement your custom interceptor logic here

    // Pre-processing (before handler)
    // this.preProcess(context);

    const result = await next.handle();

    // Post-processing (after handler)
    // this.postProcess(context, result);

    return result;
  }`;
  }

  return `${imports}

@Injectable()
${decorator}
export class ${name} implements Interceptor {
${classContent}
}
`;
}

function generateExceptionFilterContent(name: string, type: string): string {
  const imports = `import { Injectable } from '@neat/core';
import { ExceptionFilter, ExceptionFilterResult, ExceptionFilterContext } from '@neat/middleware';`;

  let decorator = '';
  let classContent = '';

  switch (type) {
    case 'http':
      decorator = `@ExceptionFilter({\n  name: '${name}',\n  priority: 10,\n  global: false\n})`;
      classContent = `
  catch(exception: any, context: ExceptionFilterContext): ExceptionFilterResult {
    // Handle HTTP exceptions
    const statusCode = exception.statusCode || 500;
    const message = exception.message || 'Internal server error';

    return {
      statusCode,
      response: {
        success: false,
        error: {
          message,
          code: exception.errorCode || 'HTTP_ERROR',
          type: exception.name || 'Exception',
          timestamp: context.timestamp.toISOString(),
          path: context.route?.path
        }
      }
    };
  }`;
      break;

    case 'validation':
      decorator = `@ExceptionFilter({\n  name: '${name}',\n  priority: 20,\n  global: false\n})`;
      classContent = `
  catch(exception: any, context: ExceptionFilterContext): ExceptionFilterResult {
    // Handle validation errors
    if (exception.errors || exception.validationErrors) {
      const errors = exception.errors || exception.validationErrors;

      return {
        statusCode: 422,
        response: {
          success: false,
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            type: 'ValidationException',
            timestamp: context.timestamp.toISOString(),
            path: context.route?.path,
            validationErrors: errors
          }
        }
      };
    }

    // If not a validation error, re-throw
    throw exception;
  }`;
      break;

    case 'database':
      decorator = `@ExceptionFilter({\n  name: '${name}',\n  priority: 25,\n  global: false\n})`;
      classContent = `
  catch(exception: any, context: ExceptionFilterContext): ExceptionFilterResult {
    // Handle database errors
    if (exception.code || exception.sqlState) {
      // Don't expose internal database errors in production
      const isDevelopment = process.env.NODE_ENV === 'development';

      return {
        statusCode: 500,
        response: {
          success: false,
          error: {
            message: isDevelopment ? exception.message : 'Database operation failed',
            code: 'DATABASE_ERROR',
            type: 'DatabaseException',
            timestamp: context.timestamp.toISOString(),
            path: context.route?.path,
            ...(isDevelopment && {
              sqlCode: exception.code,
              sqlState: exception.sqlState
            })
          }
        }
      };
    }

    // If not a database error, re-throw
    throw exception;
  }`;
      break;

    default:
      decorator = `@ExceptionFilter({\n  name: '${name}',\n  priority: 10,\n  global: false\n})`;
      classContent = `
  catch(exception: Error, context: ExceptionFilterContext): ExceptionFilterResult {
    // Implement your custom exception handling logic here

    return {
      statusCode: 500,
      response: {
        success: false,
        error: {
          message: exception.message,
          code: 'CUSTOM_ERROR',
          type: exception.name,
          timestamp: context.timestamp.toISOString(),
          path: context.route?.path
        }
      }
    };
  }`;
  }

  return `${imports}

@Injectable()
${decorator}
export class ${name} implements ExceptionFilter {
${classContent}
}
`;
}
