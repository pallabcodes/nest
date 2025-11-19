/**
 * Neat Docs - Auto-Generated API Documentation
 *
 * Zero-configuration OpenAPI/Swagger documentation
 * that leverages auto-discovery for instant API docs
 */

// Main exports
export {
  NeatDocsModule,
  createSwaggerMiddleware,
  setupSwaggerUI,
  generateDocsCLI
} from './docs.module.js';

// Generator
export { OpenAPIGenerator } from './generators/openapi.generator.js';

// Decorators for enhancing documentation
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

// Types and interfaces
export type {
  NeatDocsConfig,
  DocsGenerationOptions,
  DocsGenerationResult,
  CLIDocsOptions,
  RouteDocsMetadata,
  ParameterDocsMetadata,
  RequestBodyDocsMetadata,
  ResponseDocsMetadata,
  SchemaDocsMetadata,
  CodeSample,
  OpenAPISpec
} from './interfaces/docs.interfaces.js';

// Error classes
export {
  DocsGenerationError,
  ValidationError
} from './interfaces/docs.interfaces.js';
