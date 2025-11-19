/**
 * Neat Docs - OpenAPI Generator
 *
 * Auto-generates OpenAPI/Swagger specifications from
 * auto-discovered controllers, routes, and entities
 */

import { OpenAPIV3 } from 'openapi-types';
import {
  OpenAPISpec,
  NeatDocsConfig,
  DocsGenerationOptions,
  DocsGenerationResult,
  ControllerMetadata,
  RouteMetadata,
  EntityDocumentation,
  DEFAULT_NEAT_DOCS_CONFIG,
  DEFAULT_GENERATION_OPTIONS,
  DocsGenerationError
} from '../interfaces/docs.interfaces.js';
import {
  getRouteDocsMetadata,
  getParameterDocsMetadata,
  getRequestBodyDocsMetadata,
  getResponseDocsMetadata,
  getSchemaDocsMetadata,
  getControllerTags
} from '../decorators/docs.decorators.js';

export class OpenAPIGenerator {
  private config: NeatDocsConfig;
  private options: DocsGenerationOptions;

  constructor(
    config: Partial<NeatDocsConfig> = {},
    options: Partial<DocsGenerationOptions> = {}
  ) {
    this.config = { ...DEFAULT_NEAT_DOCS_CONFIG, ...config };
    this.options = { ...DEFAULT_GENERATION_OPTIONS, ...options };
  }

  /**
   * Generate OpenAPI specification from auto-discovered metadata
   */
  async generateSpec(
    controllers: ControllerMetadata[] = [],
    entities: any[] = []
  ): Promise<DocsGenerationResult> {
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      // Build the OpenAPI specification
      const spec: OpenAPISpec = {
        openapi: '3.0.0',
        info: {
          title: this.config.title,
          version: this.config.version,
          description: this.config.description,
          ...this.config.info
        },
        servers: this.config.servers,
        paths: {},
        components: {
          schemas: {},
          securitySchemes: this.config.securityDefinitions
        },
        tags: this.config.tags,
        externalDocs: this.config.externalDocs,
        'x-neat-generated': true,
        'x-neat-version': '1.0.0',
        'x-neat-timestamp': new Date().toISOString(),
        'x-neat-auto-discovered': true
      };

      // Generate paths from controllers
      spec.paths = this.generatePaths(controllers, warnings, errors);

      // Generate schemas from entities
      if (this.options.includeSchemas && spec.components) {
        spec.components.schemas = this.generateSchemas(entities, warnings, errors);
      }

      // Add custom security schemes
      if (this.options.securitySchemes && spec.components) {
        spec.components.securitySchemes = {
          ...spec.components.securitySchemes,
          ...this.options.securitySchemes
        };
      }

      // Add custom servers
      if (this.options.servers) {
        spec.servers = this.options.servers;
      }

      // Validate the specification
      const validationResult = this.validateSpec(spec);
      warnings.push(...validationResult.warnings);
      errors.push(...validationResult.errors);

      const stats = {
        routes: this.countRoutes(controllers),
        schemas: entities.length,
        parameters: this.countParameters(controllers),
        responses: this.countResponses(controllers)
      };

      return {
        spec,
        warnings,
        errors,
        stats
      };

    } catch (error) {
      throw new DocsGenerationError(
        `Failed to generate OpenAPI specification: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'GENERATION_FAILED',
        error
      );
    }
  }

  /**
   * Generate paths from controller metadata
   */
  private generatePaths(
    controllers: ControllerMetadata[],
    warnings: string[],
    errors: string[]
  ): OpenAPIV3.PathsObject {
    const paths: OpenAPIV3.PathsObject = {};

    for (const controller of controllers) {
      try {
        const controllerTags = getControllerTags(controller.name as any) || controller.tags || [];

        for (const route of controller.routes) {
          const pathKey = this.buildPathKey(controller.path, route.path);
          const method = route.method.toLowerCase() as OpenAPIV3.HttpMethods;

          if (!paths[pathKey]) {
            paths[pathKey] = {};
          }

          // Generate operation
          const operation = this.generateOperation(controller, route, controllerTags, warnings, errors);
          paths[pathKey][method] = operation;
        }
      } catch (error) {
        errors.push(`Failed to process controller ${controller.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return paths;
  }

  /**
   * Generate operation from route metadata
   */
  private generateOperation(
    controller: ControllerMetadata,
    route: RouteMetadata,
    controllerTags: string[],
    warnings: string[],
    errors: string[]
  ): OpenAPIV3.OperationObject {
    // Get custom documentation metadata
    const routeDocs = getRouteDocsMetadata(controller.name as any, route.handler.name);

    const operation: OpenAPIV3.OperationObject = {
      summary: routeDocs?.summary || this.generateSummary(route),
      description: routeDocs?.description || this.generateDescription(route),
      operationId: routeDocs?.operationId || this.generateOperationId(controller, route),
      tags: routeDocs?.tags || controllerTags || [controller.name.replace('Controller', '')],
      deprecated: routeDocs?.deprecated || false
    };

    // Add parameters
    operation.parameters = this.generateParameters(route, warnings, errors);

    // Add request body
    const requestBody = this.generateRequestBody(route, warnings, errors);
    if (requestBody) {
      operation.requestBody = requestBody;
    }

    // Add responses
    operation.responses = this.generateResponses(route, warnings, errors);

    // Add security
    if (routeDocs?.security) {
      operation.security = routeDocs.security.map(sec => ({ [sec]: [] }));
    }

    // Add code samples
    if (routeDocs?.['x-code-samples'] && this.options.includeCodeSamples) {
      (operation as any)['x-code-samples'] = routeDocs['x-code-samples'];
    }

    return operation;
  }

  /**
   * Generate parameters for an operation
   */
  private generateParameters(
    route: RouteMetadata,
    warnings: string[],
    errors: string[]
  ): OpenAPIV3.ParameterObject[] {
    const parameters: OpenAPIV3.ParameterObject[] = [];

    for (const param of route.parameters) {
      try {
        const paramDocs = getParameterDocsMetadata(route.handler.constructor, route.handler.name, 0); // Simplified

        const parameter: OpenAPIV3.ParameterObject = {
          name: param.name,
          in: param.type,
          required: param.required,
          schema: param.schema || { type: 'string' },
          description: paramDocs?.description || param.description
        };

        if (paramDocs?.example) {
          parameter.example = paramDocs.example;
        }

        parameters.push(parameter);
      } catch (error) {
        warnings.push(`Failed to generate parameter ${param.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return parameters;
  }

  /**
   * Generate request body for an operation
   */
  private generateRequestBody(
    route: RouteMetadata,
    warnings: string[],
    errors: string[]
  ): OpenAPIV3.RequestBodyObject | undefined {
    // Check for custom request body documentation
    const requestBodyDocs = getRequestBodyDocsMetadata(route.handler.constructor, route.handler.name);

    if (requestBodyDocs) {
      return requestBodyDocs;
    }

    // Generate from route metadata
    const hasBodyParams = route.parameters.some(p => p.type === 'body');

    if (hasBodyParams) {
      return {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              description: 'Request body'
            }
          }
        }
      };
    }

    return undefined;
  }

  /**
   * Generate responses for an operation
   */
  private generateResponses(
    route: RouteMetadata,
    warnings: string[],
    errors: string[]
  ): OpenAPIV3.ResponsesObject {
    const responses: OpenAPIV3.ResponsesObject = {};

    // Check for custom response documentation
    const responseDocs = getResponseDocsMetadata(route.handler.constructor, route.handler.name);

    if (responseDocs) {
      for (const [statusCode, response] of Object.entries(responseDocs)) {
        responses[statusCode] = response;
      }
    }

    // Generate default responses
    if (route.responses.length > 0) {
      for (const response of route.responses) {
        responses[response.statusCode.toString()] = {
          description: response.description,
          ...(response.schema && {
            content: {
              'application/json': {
                schema: response.schema
              }
            }
          })
        };
      }
    }

    // Ensure we have at least a default success response
    if (!responses['200'] && !responses['201']) {
      responses['200'] = {
        description: 'Successful response'
      };
    }

    // Add common error responses
    if (!responses['400']) {
      responses['400'] = { description: 'Bad request' };
    }
    if (!responses['401']) {
      responses['401'] = { description: 'Unauthorized' };
    }
    if (!responses['404']) {
      responses['404'] = { description: 'Not found' };
    }
    if (!responses['500']) {
      responses['500'] = { description: 'Internal server error' };
    }

    return responses;
  }

  /**
   * Generate schemas from entities
   */
  private generateSchemas(entities: any[], warnings: string[], errors: string[]): Record<string, OpenAPIV3.SchemaObject> {
    const schemas: Record<string, OpenAPIV3.SchemaObject> = {};

    for (const entity of entities) {
      try {
        const schemaName = entity.name || entity.constructor.name;
        const schemaDocs = getSchemaDocsMetadata(entity);

        const schema: OpenAPIV3.SchemaObject = {
          type: 'object',
          properties: {},
          required: []
        };

        // Add title and description
        if (schemaDocs?.title) {
          (schema as any).title = schemaDocs.title;
        }
        if (schemaDocs?.description) {
          schema.description = schemaDocs.description;
        }

        // Generate properties from entity metadata
        // This would analyze the entity's decorators and fields
        schema.properties = this.generateSchemaProperties(entity);
        schema.required = this.generateRequiredFields(entity);

        // Add example
        if (schemaDocs?.example && this.options.includeExamples) {
          schema.example = schemaDocs.example;
        }

        // Add entity type metadata
        if (schemaDocs?.['x-entity-type']) {
          (schema as any)['x-entity-type'] = schemaDocs['x-entity-type'];
        }

        schemas[schemaName] = schema;
      } catch (error) {
        warnings.push(`Failed to generate schema for ${entity.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return schemas;
  }

  /**
   * Generate schema properties from entity
   */
  private generateSchemaProperties(entity: any): Record<string, OpenAPIV3.SchemaObject> {
    const properties: Record<string, OpenAPIV3.SchemaObject> = {};

    // This would analyze entity decorators and generate appropriate schemas
    // For now, return a basic structure
    return {
      id: { type: 'integer', format: 'int64' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' }
    };
  }

  /**
   * Generate required fields from entity
   */
  private generateRequiredFields(entity: any): string[] {
    // This would analyze entity decorators for required fields
    return ['id'];
  }

  /**
   * Build path key from controller and route paths
   */
  private buildPathKey(controllerPath: string, routePath: string): string {
    const basePath = this.options.basePath || '';
    const fullPath = controllerPath + routePath;

    // Ensure path starts with /
    const normalizedPath = fullPath.startsWith('/') ? fullPath : '/' + fullPath;

    // Combine with base path
    return basePath + normalizedPath;
  }

  /**
   * Generate summary from route metadata
   */
  private generateSummary(route: RouteMetadata): string {
    const method = route.method.toUpperCase();
    const path = route.path;
    return `${method} ${path}`;
  }

  /**
   * Generate description from route metadata
   */
  private generateDescription(route: RouteMetadata): string {
    // This could be enhanced to generate better descriptions
    return `Auto-generated description for ${route.method.toUpperCase()} ${route.path}`;
  }

  /**
   * Generate operation ID
   */
  private generateOperationId(controller: ControllerMetadata, route: RouteMetadata): string {
    const controllerName = controller.name.replace('Controller', '');
    const methodName = route.handler.name;
    return `${controllerName}_${methodName}`;
  }

  /**
   * Validate OpenAPI specification
   */
  private validateSpec(spec: OpenAPISpec): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!spec.info?.title) {
      errors.push('Specification must have a title');
    }

    if (!spec.paths || Object.keys(spec.paths).length === 0) {
      warnings.push('Specification has no paths defined');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Count routes in controllers
   */
  private countRoutes(controllers: ControllerMetadata[]): number {
    return controllers.reduce((count, controller) => count + controller.routes.length, 0);
  }

  /**
   * Count parameters in controllers
   */
  private countParameters(controllers: ControllerMetadata[]): number {
    return controllers.reduce((count, controller) =>
      count + controller.routes.reduce((routeCount, route) =>
        routeCount + route.parameters.length, 0
      ), 0
    );
  }

  /**
   * Count responses in controllers
   */
  private countResponses(controllers: ControllerMetadata[]): number {
    return controllers.reduce((count, controller) =>
      count + controller.routes.reduce((routeCount, route) =>
        routeCount + route.responses.length, 0
      ), 0
    );
  }

  /**
   * Export specification to file
   */
  async exportSpec(result: DocsGenerationResult, outputPath?: string): Promise<void> {
    const path = outputPath || this.options.outputPath || './openapi-spec.json';
    const format = this.options.outputFormat || 'json';

    let content: string;

    if (format === 'yaml') {
      const yaml = await import('yaml');
      content = yaml.stringify(result.spec);
    } else {
      content = JSON.stringify(result.spec, null, 2);
    }

    const fs = await import('fs/promises');
    await fs.writeFile(path, content, 'utf-8');
  }
}
