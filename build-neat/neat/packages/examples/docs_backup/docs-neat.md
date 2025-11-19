# Neat Docs - API Documentation Auto-Generation Demo

Revolutionary auto-generated API documentation that works seamlessly with auto-discovery and authentication

Features:
- Zero-configuration OpenAPI/Swagger generation
- Auto-discovery of controllers, routes, and entities
- Authentication-aware documentation
- Interactive API explorer
- Code samples and examples
- Schema documentation from entities

This demonstrates how Neat Framework makes API documentation effortless!

```typescript
import 'reflect-metadata';
import { NeatApplication, Controller, Get, Post, Put, Delete, Body, Param, Query } from '@neat/core';
import { NeatAuthModule, AuthRequired, Roles, Public, CurrentUser, User } from '@neat/auth';
import {
  NeatDocsModule,
  ApiDocs,
  ApiSummary,
  ApiDescription,
  ApiTags,
  ApiParam,
  ApiBodySchema,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiSchema,
  ApiSchemaTitle,
  ApiSchemaDescription,
  ApiSchemaExample,
  ApiCodeSamples,
  ApiBearerAuth
} from '@neat/docs';

// ... rest of the docs demo code ...
```

See the original file for complete implementation details.

