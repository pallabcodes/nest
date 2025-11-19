# Neat Framework Authentication Demo

Complete authentication example showcasing:
- JWT authentication with auto-discovery
- Role-based authorization
- Permission-based access control
- OAuth integration ready
- Guards and decorators
- Protected routes
- User management
- Token refresh

This demonstrates how authentication works seamlessly with auto-discovery!

```typescript
import 'reflect-metadata';
import { NeatApplication, Controller, Get, Post, Put, Delete, Body, Param, Query } from '@neat/core';
import {
  NeatAuthModule,
  createBasicAuthConfig,
  AuthRequired,
  RolesRequired,
  PermissionsRequired,
  Auth,
  Roles,
  Permissions,
  Public,
  CurrentUser,
  AdminOnly,
  AuthService,
  User,
  LoginCredentials,
  RegisterData,
  AuthTokens,
  DEFAULT_ROLES
} from '@neat/auth';

// ... rest of the auth demo code ...
```

See the original file for complete implementation details.

