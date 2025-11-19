/**
 * Neat Docs - Documentation Decorators
 *
 * Decorators to enhance auto-generated API documentation
 * with custom descriptions, examples, and metadata
 */

import 'reflect-metadata';
import {
  RouteDocsMetadata,
  ParameterDocsMetadata,
  RequestBodyDocsMetadata,
  ResponseDocsMetadata,
  SchemaDocsMetadata,
  CodeSample
} from '../interfaces/docs.interfaces.js';

// ========================================
// METADATA KEYS
// ========================================

export const ROUTE_DOCS_KEY = Symbol('neat:route-docs');
export const PARAMETER_DOCS_KEY = Symbol('neat:param-docs');
export const REQUEST_BODY_DOCS_KEY = Symbol('neat:request-body-docs');
export const RESPONSE_DOCS_KEY = Symbol('neat:response-docs');
export const SCHEMA_DOCS_KEY = Symbol('neat:schema-docs');

// ========================================
// ROUTE DOCUMENTATION DECORATORS
// ========================================

/**
 * Add documentation metadata to a route
 */
export function ApiDocs(metadata: RouteDocsMetadata) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata(ROUTE_DOCS_KEY, metadata, target.constructor, propertyKey);
  };
}

/**
 * Set the summary for a route
 */
export function ApiSummary(summary: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const existingMetadata: RouteDocsMetadata = Reflect.getMetadata(ROUTE_DOCS_KEY, target.constructor, propertyKey) || {};
    existingMetadata.summary = summary;
    Reflect.defineMetadata(ROUTE_DOCS_KEY, existingMetadata, target.constructor, propertyKey);
  };
}

/**
 * Set the description for a route
 */
export function ApiDescription(description: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const existingMetadata: RouteDocsMetadata = Reflect.getMetadata(ROUTE_DOCS_KEY, target.constructor, propertyKey) || {};
    existingMetadata.description = description;
    Reflect.defineMetadata(ROUTE_DOCS_KEY, existingMetadata, target.constructor, propertyKey);
  };
}

/**
 * Add tags to a route
 */
export function ApiTags(...tags: string[]) {
  return function (target: any, propertyKey?: string) {
    if (propertyKey) {
      // Method-level
      const existingMetadata: RouteDocsMetadata = Reflect.getMetadata(ROUTE_DOCS_KEY, target.constructor, propertyKey) || {};
      existingMetadata.tags = tags;
      Reflect.defineMetadata(ROUTE_DOCS_KEY, existingMetadata, target.constructor, propertyKey);
    } else {
      // Class-level (affects all routes in controller)
      Reflect.defineMetadata(Symbol('neat:controller-tags'), tags, target);
    }
  };
}

/**
 * Mark a route as deprecated
 */
export function ApiDeprecated() {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const existingMetadata: RouteDocsMetadata = Reflect.getMetadata(ROUTE_DOCS_KEY, target.constructor, propertyKey) || {};
    existingMetadata.deprecated = true;
    Reflect.defineMetadata(ROUTE_DOCS_KEY, existingMetadata, target.constructor, propertyKey);
  };
}

/**
 * Set operation ID for a route
 */
export function ApiOperationId(operationId: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const existingMetadata: RouteDocsMetadata = Reflect.getMetadata(ROUTE_DOCS_KEY, target.constructor, propertyKey) || {};
    existingMetadata.operationId = operationId;
    Reflect.defineMetadata(ROUTE_DOCS_KEY, existingMetadata, target.constructor, propertyKey);
  };
}

// ========================================
// PARAMETER DOCUMENTATION DECORATORS
// ========================================

/**
 * Document a parameter
 */
export function ApiParam(metadata: ParameterDocsMetadata) {
  return function (target: any, propertyKey: string, parameterIndex: number) {
    const key = Symbol(`neat:param-docs:${parameterIndex}`);
    Reflect.defineMetadata(key, metadata, target.constructor, propertyKey);
  };
}

/**
 * Document a path parameter
 */
export function ApiPathParam(name: string, metadata?: Omit<ParameterDocsMetadata, 'name'>) {
  return function (target: any, propertyKey: string, parameterIndex: number) {
    const key = Symbol(`neat:param-docs:${parameterIndex}`);
    const paramMetadata: ParameterDocsMetadata = {
      name,
      type: 'path',
      required: true,
      ...metadata
    };
    Reflect.defineMetadata(key, paramMetadata, target.constructor, propertyKey);
  };
}

/**
 * Document a query parameter
 */
export function ApiQueryParam(name: string, metadata?: Omit<ParameterDocsMetadata, 'name'>) {
  return function (target: any, propertyKey: string, parameterIndex: number) {
    const key = Symbol(`neat:param-docs:${parameterIndex}`);
    const paramMetadata: ParameterDocsMetadata = {
      name,
      type: 'query',
      required: false,
      ...metadata
    };
    Reflect.defineMetadata(key, paramMetadata, target.constructor, propertyKey);
  };
}

/**
 * Document a header parameter
 */
export function ApiHeaderParam(name: string, metadata?: Omit<ParameterDocsMetadata, 'name'>) {
  return function (target: any, propertyKey: string, parameterIndex: number) {
    const key = Symbol(`neat:param-docs:${parameterIndex}`);
    const paramMetadata: ParameterDocsMetadata = {
      name,
      type: 'header',
      required: false,
      ...metadata
    };
    Reflect.defineMetadata(key, paramMetadata, target.constructor, propertyKey);
  };
}

// ========================================
// REQUEST BODY DOCUMENTATION DECORATORS
// ========================================

/**
 * Document the request body
 */
export function ApiBody(metadata: RequestBodyDocsMetadata) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata(REQUEST_BODY_DOCS_KEY, metadata, target.constructor, propertyKey);
  };
}

/**
 * Document request body with a schema reference
 */
export function ApiBodySchema(schemaName: string, metadata?: Omit<RequestBodyDocsMetadata, 'content'>) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const bodyMetadata: RequestBodyDocsMetadata = {
      required: true,
      content: {
        'application/json': {
          schema: {
            $ref: `#/components/schemas/${schemaName}`
          }
        }
      },
      ...metadata
    };
    Reflect.defineMetadata(REQUEST_BODY_DOCS_KEY, bodyMetadata, target.constructor, propertyKey);
  };
}

// ========================================
// RESPONSE DOCUMENTATION DECORATORS
// ========================================

/**
 * Document responses for a route
 */
export function ApiResponses(responses: Record<string, ResponseDocsMetadata>) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata(RESPONSE_DOCS_KEY, responses, target.constructor, propertyKey);
  };
}

/**
 * Document a specific response
 */
export function ApiResponse(statusCode: number, metadata: ResponseDocsMetadata) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const existingResponses: Record<string, ResponseDocsMetadata> =
      Reflect.getMetadata(RESPONSE_DOCS_KEY, target.constructor, propertyKey) || {};

    existingResponses[statusCode.toString()] = metadata;
    Reflect.defineMetadata(RESPONSE_DOCS_KEY, existingResponses, target.constructor, propertyKey);
  };
}

/**
 * Document a successful response with schema
 */
export function ApiOkResponse(schemaName?: string, description?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const existingResponses: Record<string, ResponseDocsMetadata> =
      Reflect.getMetadata(RESPONSE_DOCS_KEY, target.constructor, propertyKey) || {};

    existingResponses['200'] = {
      description: description || 'Successful response',
      ...(schemaName && {
        content: {
          'application/json': {
            schema: {
              $ref: `#/components/schemas/${schemaName}`
            }
          }
        }
      })
    };

    Reflect.defineMetadata(RESPONSE_DOCS_KEY, existingResponses, target.constructor, propertyKey);
  };
}

/**
 * Document a created response
 */
export function ApiCreatedResponse(schemaName?: string, description?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const existingResponses: Record<string, ResponseDocsMetadata> =
      Reflect.getMetadata(RESPONSE_DOCS_KEY, target.constructor, propertyKey) || {};

    existingResponses['201'] = {
      description: description || 'Resource created successfully',
      ...(schemaName && {
        content: {
          'application/json': {
            schema: {
              $ref: `#/components/schemas/${schemaName}`
            }
          }
        }
      })
    };

    Reflect.defineMetadata(RESPONSE_DOCS_KEY, existingResponses, target.constructor, propertyKey);
  };
}

/**
 * Document error responses
 */
export function ApiBadRequestResponse(description?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const existingResponses: Record<string, ResponseDocsMetadata> =
      Reflect.getMetadata(RESPONSE_DOCS_KEY, target.constructor, propertyKey) || {};

    existingResponses['400'] = {
      description: description || 'Bad request'
    };

    Reflect.defineMetadata(RESPONSE_DOCS_KEY, existingResponses, target.constructor, propertyKey);
  };
}

export function ApiUnauthorizedResponse(description?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const existingResponses: Record<string, ResponseDocsMetadata> =
      Reflect.getMetadata(RESPONSE_DOCS_KEY, target.constructor, propertyKey) || {};

    existingResponses['401'] = {
      description: description || 'Unauthorized'
    };

    Reflect.defineMetadata(RESPONSE_DOCS_KEY, existingResponses, target.constructor, propertyKey);
  };
}

export function ApiForbiddenResponse(description?: string) {
  return function (target: any, propertyKey: string, descriptor: description || 'Forbidden'
    const existingResponses: Record<string, ResponseDocsMetadata> =
      Reflect.getMetadata(RESPONSE_DOCS_KEY, target.constructor, propertyKey) || {};

    existingResponses['403'] = {
      description: description || 'Forbidden'
    };

    Reflect.defineMetadata(RESPONSE_DOCS_KEY, existingResponses, target.constructor, propertyKey);
  };
}

export function ApiNotFoundResponse(description?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const existingResponses: Record<string, ResponseDocsMetadata> =
      Reflect.getMetadata(RESPONSE_DOCS_KEY, target.constructor, propertyKey) || {};

    existingResponses['404'] = {
      description: description || 'Not found'
    };

    Reflect.defineMetadata(RESPONSE_DOCS_KEY, existingResponses, target.constructor, propertyKey);
  };
}

// ========================================
// SCHEMA DOCUMENTATION DECORATORS
// ========================================

/**
 * Document an entity/schema
 */
export function ApiSchema(metadata: SchemaDocsMetadata) {
  return function (target: any) {
    Reflect.defineMetadata(SCHEMA_DOCS_KEY, metadata, target);
  };
}

/**
 * Set title for a schema
 */
export function ApiSchemaTitle(title: string) {
  return function (target: any) {
    const existingMetadata: SchemaDocsMetadata = Reflect.getMetadata(SCHEMA_DOCS_KEY, target) || {};
    existingMetadata.title = title;
    Reflect.defineMetadata(SCHEMA_DOCS_KEY, existingMetadata, target);
  };
}

/**
 * Set description for a schema
 */
export function ApiSchemaDescription(description: string) {
  return function (target: any) {
    const existingMetadata: SchemaDocsMetadata = Reflect.getMetadata(SCHEMA_DOCS_KEY, target) || {};
    existingMetadata.description = description;
    Reflect.defineMetadata(SCHEMA_DOCS_KEY, existingMetadata, target);
  };
}

/**
 * Add example for a schema
 */
export function ApiSchemaExample(example: any) {
  return function (target: any) {
    const existingMetadata: SchemaDocsMetadata = Reflect.getMetadata(SCHEMA_DOCS_KEY, target) || {};
    existingMetadata.example = example;
    Reflect.defineMetadata(SCHEMA_DOCS_KEY, existingMetadata, target);
  };
}

/**
 * Mark schema as deprecated
 */
export function ApiSchemaDeprecated() {
  return function (target: any) {
    const existingMetadata: SchemaDocsMetadata = Reflect.getMetadata(SCHEMA_DOCS_KEY, target) || {};
    existingMetadata.deprecated = true;
    Reflect.defineMetadata(SCHEMA_DOCS_KEY, existingMetadata, target);
  };
}

// ========================================
// CODE SAMPLE DECORATORS
// ========================================

/**
 * Add code samples to a route
 */
export function ApiCodeSamples(...samples: CodeSample[]) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const existingMetadata: RouteDocsMetadata = Reflect.getMetadata(ROUTE_DOCS_KEY, target.constructor, propertyKey) || {};
    existingMetadata['x-code-samples'] = samples;
    Reflect.defineMetadata(ROUTE_DOCS_KEY, existingMetadata, target.constructor, propertyKey);
  };
}

/**
 * Add a single code sample
 */
export function ApiCodeSample(lang: string, source: string, label?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const existingMetadata: RouteDocsMetadata = Reflect.getMetadata(ROUTE_DOCS_KEY, target.constructor, propertyKey) || {};
    const samples = existingMetadata['x-code-samples'] || [];
    samples.push({ lang, source, label });
    existingMetadata['x-code-samples'] = samples;
    Reflect.defineMetadata(ROUTE_DOCS_KEY, existingMetadata, target.constructor, propertyKey);
  };
}

// ========================================
// SECURITY DECORATORS
// ========================================

/**
 * Specify security requirements for a route
 */
export function ApiSecurity(...security: string[]) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const existingMetadata: RouteDocsMetadata = Reflect.getMetadata(ROUTE_DOCS_KEY, target.constructor, propertyKey) || {};
    existingMetadata.security = security;
    Reflect.defineMetadata(ROUTE_DOCS_KEY, existingMetadata, target.constructor, propertyKey);
  };
}

/**
 * Use Bearer token authentication
 */
export function ApiBearerAuth() {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const existingMetadata: RouteDocsMetadata = Reflect.getMetadata(ROUTE_DOCS_KEY, target.constructor, propertyKey) || {};
    existingMetadata.security = ['BearerAuth'];
    Reflect.defineMetadata(ROUTE_DOCS_KEY, existingMetadata, target.constructor, propertyKey);
  };
}

// ========================================
// METADATA RETRIEVAL HELPERS
// ========================================

/**
 * Get route documentation metadata
 */
export function getRouteDocsMetadata(target: any, propertyKey: string): RouteDocsMetadata | undefined {
  return Reflect.getMetadata(ROUTE_DOCS_KEY, target, propertyKey);
}

/**
 * Get parameter documentation metadata
 */
export function getParameterDocsMetadata(target: any, propertyKey: string, parameterIndex: number): ParameterDocsMetadata | undefined {
  const key = Symbol(`neat:param-docs:${parameterIndex}`);
  return Reflect.getMetadata(key, target, propertyKey);
}

/**
 * Get request body documentation metadata
 */
export function getRequestBodyDocsMetadata(target: any, propertyKey: string): RequestBodyDocsMetadata | undefined {
  return Reflect.getMetadata(REQUEST_BODY_DOCS_KEY, target, propertyKey);
}

/**
 * Get response documentation metadata
 */
export function getResponseDocsMetadata(target: any, propertyKey: string): Record<string, ResponseDocsMetadata> | undefined {
  return Reflect.getMetadata(RESPONSE_DOCS_KEY, target, propertyKey);
}

/**
 * Get schema documentation metadata
 */
export function getSchemaDocsMetadata(target: any): SchemaDocsMetadata | undefined {
  return Reflect.getMetadata(SCHEMA_DOCS_KEY, target);
}

/**
 * Get controller tags
 */
export function getControllerTags(target: any): string[] | undefined {
  return Reflect.getMetadata(Symbol('neat:controller-tags'), target);
}
