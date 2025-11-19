/**
 * Neat Docs - API Documentation Interfaces
 *
 * Auto-generated OpenAPI/Swagger documentation interfaces
 * that leverage auto-discovery metadata
 */

import { OpenAPIV3 } from 'openapi-types';

// ========================================
// OPENAPI SPECIFICATION TYPES
// ========================================

export interface OpenAPISpec extends OpenAPIV3.Document {
  // Extended with Neat-specific metadata
  'x-neat-generated'?: boolean;
  'x-neat-version'?: string;
  'x-neat-timestamp'?: string;
  'x-neat-auto-discovered'?: boolean;
}

// ========================================
// NEAT-SPECIFIC DOCUMENTATION TYPES
// ========================================

export interface NeatDocsConfig {
  title: string;
  version: string;
  description?: string;
  basePath?: string;
  host?: string;
  schemes?: string[];
  tags?: OpenAPIV3.TagObject[];
  securityDefinitions?: Record<string, OpenAPIV3.SecuritySchemeObject>;
  externalDocs?: OpenAPIV3.ExternalDocumentationObject;
  servers?: OpenAPIV3.ServerObject[];
  info?: {
    contact?: OpenAPIV3.ContactObject;
    license?: OpenAPIV3.LicenseObject;
    termsOfService?: string;
  };
}

export interface RouteDocumentation {
  path: string;
  method: string;
  summary?: string;
  description?: string;
  operationId?: string;
  tags?: string[];
  parameters?: OpenAPIV3.ParameterObject[];
  requestBody?: OpenAPIV3.RequestBodyObject;
  responses?: Record<string, OpenAPIV3.ResponseObject>;
  security?: OpenAPIV3.SecurityRequirementObject[];
  deprecated?: boolean;
  'x-code-samples'?: CodeSample[];
}

export interface EntityDocumentation {
  name: string;
  schema: OpenAPIV3.SchemaObject;
  description?: string;
  example?: any;
  'x-entity-type'?: 'typeorm' | 'mongoose';
}

export interface CodeSample {
  lang: string;
  label?: string;
  source: string;
}

// ========================================
// AUTO-DISCOVERY METADATA
// ========================================

export interface ControllerMetadata {
  name: string;
  path: string;
  description?: string;
  tags?: string[];
  security?: string[];
  routes: RouteMetadata[];
}

export interface RouteMetadata {
  path: string;
  method: string;
  handler: Function;
  parameters: ParameterMetadata[];
  responses: ResponseMetadata[];
  summary?: string;
  description?: string;
  tags?: string[];
  deprecated?: boolean;
  security?: string[];
}

export interface ParameterMetadata {
  name: string;
  type: 'path' | 'query' | 'body' | 'header';
  required: boolean;
  schema?: OpenAPIV3.SchemaObject;
  description?: string;
  example?: any;
}

export interface ResponseMetadata {
  statusCode: number;
  description: string;
  schema?: OpenAPIV3.SchemaObject;
  example?: any;
}

// ========================================
// GENERATION OPTIONS
// ========================================

export interface DocsGenerationOptions {
  includeSchemas?: boolean;
  includeExamples?: boolean;
  includeCodeSamples?: boolean;
  customTags?: OpenAPIV3.TagObject[];
  securitySchemes?: Record<string, OpenAPIV3.SecuritySchemeObject>;
  servers?: OpenAPIV3.ServerObject[];
  outputFormat?: 'json' | 'yaml';
  outputPath?: string;
  basePath?: string;
  host?: string;
  schemes?: string[];
}

// ========================================
// DECORATOR METADATA
// ========================================

export interface RouteDocsMetadata {
  summary?: string;
  description?: string;
  tags?: string[];
  deprecated?: boolean;
  operationId?: string;
  parameters?: ParameterDocsMetadata[];
  requestBody?: RequestBodyDocsMetadata;
  responses?: Record<string, ResponseDocsMetadata>;
  security?: string[];
  'x-code-samples'?: CodeSample[];
}

export interface ParameterDocsMetadata {
  name: string;
  description?: string;
  required?: boolean;
  schema?: OpenAPIV3.SchemaObject;
  example?: any;
  examples?: Record<string, OpenAPIV3.ExampleObject>;
}

export interface RequestBodyDocsMetadata {
  description?: string;
  required?: boolean;
  content: Record<string, OpenAPIV3.MediaTypeObject>;
}

export interface ResponseDocsMetadata {
  description: string;
  content?: Record<string, OpenAPIV3.MediaTypeObject>;
  headers?: Record<string, OpenAPIV3.HeaderObject>;
}

export interface SchemaDocsMetadata {
  title?: string;
  description?: string;
  example?: any;
  examples?: Record<string, OpenAPIV3.ExampleObject>;
  deprecated?: boolean;
  readOnly?: boolean;
  writeOnly?: boolean;
  'x-entity-type'?: 'typeorm' | 'mongoose';
}

// ========================================
// UTILITY TYPES
// ========================================

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'options' | 'head';

export interface DocsGenerationResult {
  spec: OpenAPISpec;
  warnings: string[];
  errors: string[];
  stats: {
    routes: number;
    schemas: number;
    parameters: number;
    responses: number;
  };
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ========================================
// CLI INTEGRATION
// ========================================

export interface CLIDocsOptions {
  output?: string;
  format?: 'json' | 'yaml';
  includeExamples?: boolean;
  includeCodeSamples?: boolean;
  serve?: boolean;
  port?: number;
  host?: string;
}

// ========================================
// EXPRESS INTEGRATION
// ========================================

export interface SwaggerUIOptions {
  customCss?: string;
  customJs?: string;
  customSiteTitle?: string;
  customfavIcon?: string;
  swaggerOptions?: any;
  explorer?: boolean;
  swaggerUrl?: string;
  swaggerUrls?: string[];
}

// ========================================
// DEFAULT CONFIGURATIONS
// ========================================

export const DEFAULT_NEAT_DOCS_CONFIG: NeatDocsConfig = {
  title: 'Neat Framework API',
  version: '1.0.0',
  description: 'Auto-generated API documentation for Neat Framework',
  basePath: '/api',
  host: 'localhost:3000',
  schemes: ['http', 'https'],
  tags: [
    {
      name: 'Authentication',
      description: 'Authentication and authorization endpoints'
    },
    {
      name: 'Users',
      description: 'User management endpoints'
    },
    {
      name: 'System',
      description: 'System and health endpoints'
    }
  ],
  securityDefinitions: {
    BearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT'
    }
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server'
    }
  ]
};

export const DEFAULT_GENERATION_OPTIONS: DocsGenerationOptions = {
  includeSchemas: true,
  includeExamples: true,
  includeCodeSamples: true,
  outputFormat: 'json',
  basePath: '/api',
  host: 'localhost:3000',
  schemes: ['http', 'https']
};

// ========================================
// ERROR TYPES
// ========================================

export class DocsGenerationError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'DocsGenerationError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public errors: string[],
    public warnings: string[] = []
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}
