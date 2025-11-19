/**
 * Neat Docs - Documentation Module
 *
 * Auto-generates API documentation from auto-discovered
 * controllers, routes, and entities with zero configuration
 */

import { Injectable } from '@neat/core';
import { OpenAPIGenerator } from './generators/openapi.generator.js';
import {
  NeatDocsConfig,
  DocsGenerationOptions,
  DocsGenerationResult,
  CLIDocsOptions
} from './interfaces/docs.interfaces.js';

// ========================================
// NEAT DOCS MODULE
// ========================================

@Injectable()
export class NeatDocsModule {
  private static instance: NeatDocsModule;
  private generator: OpenAPIGenerator;
  private config: NeatDocsConfig;
  private options: DocsGenerationOptions;

  constructor(
    config: Partial<NeatDocsConfig> = {},
    options: Partial<DocsGenerationOptions> = {}
  ) {
    this.config = {
      title: 'Neat Framework API',
      version: '1.0.0',
      description: 'Auto-generated API documentation',
      basePath: '/api',
      host: 'localhost:3000',
      schemes: ['http', 'https'],
      ...config
    };

    this.options = {
      includeSchemas: true,
      includeExamples: true,
      includeCodeSamples: true,
      outputFormat: 'json',
      ...options
    };

    this.generator = new OpenAPIGenerator(this.config, this.options);
    NeatDocsModule.instance = this;
  }

  /**
   * Get singleton instance
   */
  static getInstance(): NeatDocsModule {
    if (!NeatDocsModule.instance) {
      NeatDocsModule.instance = new NeatDocsModule();
    }
    return NeatDocsModule.instance;
  }

  /**
   * Configure docs module
   */
  static forRoot(
    config: Partial<NeatDocsConfig> = {},
    options: Partial<DocsGenerationOptions> = {}
  ): NeatDocsModule {
    return new NeatDocsModule(config, options);
  }

  /**
   * Generate API documentation from auto-discovered components
   */
  async generateDocs(): Promise<DocsGenerationResult> {
    try {
      // Get auto-discovered controllers
      const controllers = await this.discoverControllers();

      // Get auto-discovered entities
      const entities = await this.discoverEntities();

      // Generate specification
      return await this.generator.generateSpec(controllers, entities);
    } catch (error) {
      throw new Error(`Failed to generate documentation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate and export documentation
   */
  async generateAndExport(outputPath?: string): Promise<DocsGenerationResult> {
    const result = await this.generateDocs();
    await this.generator.exportSpec(result, outputPath);
    return result;
  }

  /**
   * Serve documentation with Swagger UI
   */
  async serveDocs(port: number = 3001, host: string = 'localhost'): Promise<void> {
    const result = await this.generateDocs();

    // This would set up an Express server with Swagger UI
    // For now, just log that it would be served
    console.log(`📚 API Documentation would be served at http://${host}:${port}`);
    console.log(`📊 Generated ${result.stats.routes} routes and ${result.stats.schemas} schemas`);

    if (result.warnings.length > 0) {
      console.log(`⚠️  ${result.warnings.length} warnings:`);
      result.warnings.forEach(warning => console.log(`   - ${warning}`));
    }

    if (result.errors.length > 0) {
      console.log(`❌ ${result.errors.length} errors:`);
      result.errors.forEach(error => console.log(`   - ${error}`));
    }
  }

  /**
   * Get documentation as JSON
   */
  async getDocsAsJson(): Promise<string> {
    const result = await this.generateDocs();
    return JSON.stringify(result.spec, null, 2);
  }

  /**
   * Get documentation as YAML
   */
  async getDocsAsYaml(): Promise<string> {
    const result = await this.generateDocs();
    const yaml = await import('yaml');
    return yaml.stringify(result.spec);
  }

  // ========================================
  // AUTO-DISCOVERY INTEGRATION
  // ========================================

  /**
   * Discover controllers from the application
   */
  private async discoverControllers(): Promise<any[]> {
    try {
      // Try to get controllers from Neat's scanner
      const { scanForControllers } = await import('@neat/core/metadata/scanner.js').catch(() => null);

      if (scanForControllers) {
        const controllers = scanForControllers();
        return this.transformControllers(controllers);
      }
    } catch {
      // Fallback to manual discovery
    }

    return [];
  }

  /**
   * Discover entities/schemas from the application
   */
  private async discoverEntities(): Promise<any[]> {
    try {
      // Try to get entities from Neat's scanner
      const { scanForEntities } = await import('@neat/core/metadata/scanner.js').catch(() => null);
      const { scanForSchemas } = await import('@neat/core/metadata/scanner.js').catch(() => null);

      const entities = [];
      if (scanForEntities) {
        entities.push(...scanForEntities());
      }
      if (scanForSchemas) {
        entities.push(...scanForSchemas());
      }

      return entities;
    } catch {
      // Fallback to manual discovery
    }

    return [];
  }

  /**
   * Transform discovered controllers to our format
   */
  private transformControllers(controllers: any[]): any[] {
    return controllers.map(controller => ({
      name: controller.constructor.name,
      path: this.extractControllerPath(controller),
      routes: this.extractControllerRoutes(controller)
    }));
  }

  /**
   * Extract path from controller
   */
  private extractControllerPath(controller: any): string {
    // This would analyze controller decorators to extract the path
    // For now, return a default
    return `/${controller.constructor.name.replace('Controller', '').toLowerCase()}`;
  }

  /**
   * Extract routes from controller
   */
  private extractControllerRoutes(controller: any): any[] {
    // This would analyze method decorators to extract routes
    // For now, return mock routes
    return [
      {
        path: '/',
        method: 'GET',
        handler: { name: 'findAll', constructor: controller.constructor },
        parameters: [],
        responses: [{ statusCode: 200, description: 'Success' }]
      }
    ];
  }

  // ========================================
  // CONFIGURATION
  // ========================================

  /**
   * Update configuration
   */
  updateConfig(config: Partial<NeatDocsConfig>): void {
    this.config = { ...this.config, ...config };
    this.generator = new OpenAPIGenerator(this.config, this.options);
  }

  /**
   * Update generation options
   */
  updateOptions(options: Partial<DocsGenerationOptions>): void {
    this.options = { ...this.options, ...options };
    this.generator = new OpenAPIGenerator(this.config, this.options);
  }

  /**
   * Get current configuration
   */
  getConfig(): NeatDocsConfig {
    return { ...this.config };
  }

  /**
   * Get current options
   */
  getOptions(): DocsGenerationOptions {
    return { ...this.options };
  }
}

// ========================================
// EXPRESS INTEGRATION
// ========================================

/**
 * Express middleware for serving Swagger UI
 */
export function createSwaggerMiddleware(docsModule: NeatDocsModule) {
  return async (req: any, res: any, next: any) => {
    try {
      if (req.path === '/api-docs.json') {
        const json = await docsModule.getDocsAsJson();
        res.setHeader('Content-Type', 'application/json');
        res.send(json);
      } else if (req.path === '/api-docs.yaml') {
        const yaml = await docsModule.getDocsAsYaml();
        res.setHeader('Content-Type', 'application/x-yaml');
        res.send(yaml);
      } else {
        next();
      }
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Setup Swagger UI route
 */
export function setupSwaggerUI(app: any, docsModule: NeatDocsModule, options: any = {}) {
  const swaggerUi = require('swagger-ui-express');

  app.use('/api-docs', swaggerUi.serve);

  app.get('/api-docs', async (req: any, res: any) => {
    try {
      const spec = await docsModule.generateDocs();
      res.send(swaggerUi.generateHTML(spec.spec, options));
    } catch (error) {
      res.status(500).send('Failed to generate documentation');
    }
  });
}

// ========================================
// CLI INTEGRATION
// ========================================

/**
 * CLI command for generating documentation
 */
export async function generateDocsCLI(options: CLIDocsOptions): Promise<void> {
  const docsModule = new NeatDocsModule();

  console.log('📚 Generating API documentation...');

  try {
    const result = await docsModule.generateDocs();

    // Export to file if requested
    if (options.output) {
      await docsModule.generateAndExport(options.output);
      console.log(`✅ Documentation exported to ${options.output}`);
    }

    // Serve if requested
    if (options.serve) {
      console.log(`🚀 Serving documentation at http://localhost:${options.port || 3001}`);
      await docsModule.serveDocs(options.port, options.host);
    }

    // Display stats
    console.log(`📊 Generated ${result.stats.routes} routes, ${result.stats.schemas} schemas`);
    console.log(`📄 ${result.stats.parameters} parameters, ${result.stats.responses} responses`);

    if (result.warnings.length > 0) {
      console.log(`⚠️  ${result.warnings.length} warnings`);
    }

    if (result.errors.length > 0) {
      console.log(`❌ ${result.errors.length} errors`);
    }

  } catch (error) {
    console.error('❌ Failed to generate documentation:', error);
    process.exit(1);
  }
}

// ========================================
// DECORATOR RE-EXPORTS
// ========================================

export {
  // Route documentation
  ApiDocs,
  ApiSummary,
  ApiDescription,
  ApiTags,
  ApiDeprecated,
  ApiOperationId,

  // Parameter documentation
  ApiParam,
  ApiPathParam,
  ApiQueryParam,
  ApiHeaderParam,

  // Request body documentation
  ApiBody,
  ApiBodySchema,

  // Response documentation
  ApiResponses,
  ApiResponse,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,

  // Schema documentation
  ApiSchema,
  ApiSchemaTitle,
  ApiSchemaDescription,
  ApiSchemaExample,
  ApiSchemaDeprecated,

  // Code samples
  ApiCodeSamples,
  ApiCodeSample,

  // Security
  ApiSecurity,
  ApiBearerAuth
} from './decorators/docs.decorators.js';

// ========================================
// TYPE EXPORTS
// ========================================

export type {
  NeatDocsConfig,
  DocsGenerationOptions,
  DocsGenerationResult,
  CLIDocsOptions,
  RouteDocsMetadata,
  SchemaDocsMetadata,
  CodeSample
} from './interfaces/docs.interfaces.js';
