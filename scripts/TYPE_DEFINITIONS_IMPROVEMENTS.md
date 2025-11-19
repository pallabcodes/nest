# Type Definitions (.d.ts) Improvements

## Overview

This document explains the significant improvements made by introducing `.d.ts` (TypeScript declaration) files to the sandbox project. These files provide centralized, reusable type definitions that enhance type safety, code maintainability, and developer experience.

## Created Type Definition Files

### 1. `src/types/auth.d.ts` - Authentication Types

**Purpose**: Centralizes all authentication and authorization-related types.

**Key Types Defined**:
- `JwtPayload` - Structure of JWT token payload
- `AuthenticatedUser` - User object attached to `request.user`
- `UserPayload` - Flexible user object for controllers/services
- `OAuthUser` - OAuth callback user structure
- `TokenPair` - Access and refresh token structure
- `RoleName` - Union type of all possible roles
- `Express.Request` extension - Adds `user` property to Express Request

**Benefits**:
- ✅ Single source of truth for auth types
- ✅ Type safety across all auth-related code
- ✅ IntelliSense support in IDEs
- ✅ Prevents type mismatches between JWT payload and user objects
- ✅ Makes Express Request typing explicit

**Usage Example**:
```typescript
import type { AuthenticatedUser, JwtPayload } from '@types/auth';

// JWT Strategy
async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
  // TypeScript now knows exact structure of payload and return type
}

// Controller
async getCurrentUser(@CurrentUser() user: AuthenticatedUser) {
  // user.roles is guaranteed to be string[]
  // user.id, user.email, user.name are all typed
}
```

### 2. `src/types/database.d.ts` - Database Model Types

**Purpose**: Provides type definitions for database operations and model relationships.

**Key Types Defined**:
- `UserWithRoles` - User model with roles association
- `RoleWithUsers` - Role model with users association
- `UserRoleWithAssociations` - Junction table with full associations
- `CreateUserData` - User creation payload
- `UpdateUserData` - User update payload
- `CreateRoleData` - Role creation payload
- `AssignRoleData` - Role assignment payload

**Benefits**:
- ✅ Type-safe repository methods
- ✅ Prevents incorrect data structures in create/update operations
- ✅ Documents expected data shapes
- ✅ Helps with Sequelize model typing

**Usage Example**:
```typescript
import type { CreateUserData, UserWithRoles } from '@types/database';

async createUser(userData: CreateUserData): Promise<User> {
  // TypeScript ensures userData has correct structure
}

async findUserWithRoles(id: number): Promise<UserWithRoles | null> {
  // Return type is explicit - includes roles array
}
```

### 3. `src/types/api.d.ts` - API Response Types

**Purpose**: Standardizes API response structures across all endpoints.

**Key Types Defined**:
- `ApiResponse<T>` - Generic API response wrapper
- `PaginatedResponse<T>` - Paginated list response
- `PaginationMeta` - Pagination metadata
- `ErrorResponse` - Error response structure
- `SuccessMessageResponse` - Success message response

**Benefits**:
- ✅ Consistent API response format
- ✅ Type-safe response mappers
- ✅ Better API documentation
- ✅ Easier to maintain response consistency
- ✅ Frontend can rely on consistent response structure

**Usage Example**:
```typescript
import type { ApiResponse, PaginatedResponse } from '@types/api';

// Response mapper
toReadResponse(data: User): ApiResponse<User> {
  return {
    success: true,
    data: data,
  };
}

// Paginated response
toPaginatedResponse<T>(items: T[], page: number, limit: number, total: number): PaginatedResponse<T> {
  return {
    success: true,
    data: items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
}
```

## Improvements Achieved

### 1. Type Safety

**Before**:
```typescript
// Inline types everywhere - easy to get wrong
async validate(payload: { sub: number; email: string; roles?: string[] }) {
  // What if roles structure changes? Need to update everywhere
}

async getCurrentUser(@CurrentUser() user: { id: number; email?: string; name?: string; roles?: string[] }) {
  // Inconsistent with JWT strategy return type
}
```

**After**:
```typescript
// Centralized types - single source of truth
import type { JwtPayload, AuthenticatedUser } from '@types/auth';

async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
  // Type is consistent everywhere
}

async getCurrentUser(@CurrentUser() user: AuthenticatedUser) {
  // Matches JWT strategy return type exactly
}
```

### 2. IntelliSense and Autocomplete

- IDEs now provide accurate autocomplete for all auth-related types
- Reduces typos and errors
- Faster development with better IDE support

### 3. Refactoring Safety

- Changing a type definition updates all usages automatically
- TypeScript compiler catches breaking changes
- Prevents runtime errors from type mismatches

### 4. Documentation

- Types serve as inline documentation
- New developers can understand data structures quickly
- Self-documenting code reduces need for external docs

### 5. Express Request Typing

**Before**:
```typescript
// request.user is 'any' type
const user = request.user; // No type information
```

**After**:
```typescript
// request.user is AuthenticatedUser | undefined
import type { AuthenticatedUser } from '@shared-types/auth';

const user: AuthenticatedUser | undefined = request.user;
// Full type information available
```

## Migration Guide

### Step 1: Import Types

Replace inline type definitions with imports:

```typescript
// Before
async validate(payload: { sub: number; email: string; roles?: string[] })

// After
import type { JwtPayload } from '@shared-types/auth';
async validate(payload: JwtPayload)
```

### Step 2: Update Function Signatures

Use typed return values:

```typescript
// Before
async getCurrentUser(userId: number, jwtUser?: { id: number; ... }) {
  // ...
}

// After
import type { AuthenticatedUser } from '@shared-types/auth';
async getCurrentUser(userId: number, jwtUser?: AuthenticatedUser): Promise<UserProfile> {
  // ...
}
```

### Step 3: Use in Controllers

```typescript
// Before
async getCurrentUser(@CurrentUser() user: { id: number; email?: string; ... }) {
  // ...
}

// After
import type { AuthenticatedUser } from '@shared-types/auth';
async getCurrentUser(@CurrentUser() user: AuthenticatedUser) {
  // user.roles is guaranteed to be string[]
}
```

## Future Enhancements

### Potential Additional Type Definitions

1. **Query Types** (`src/types/query.d.ts`):
   - `FindAllQueryDto` - Base pagination query
   - `FilterQuery` - Generic filter structure
   - `SortQuery` - Sorting parameters

2. **Service Types** (`src/types/service.d.ts`):
   - `ServiceResponse<T>` - Standard service return type
   - `ServiceError` - Service error structure

3. **Guard Types** (`src/types/guard.d.ts`):
   - `GuardContext` - Execution context type
   - `GuardResult` - Guard return type

4. **Repository Types** (`src/types/repository.d.ts`):
   - `RepositoryOptions` - Sequelize query options
   - `TransactionContext` - Transaction wrapper

## Configuration

### tsconfig.json

Added path mapping for type imports:

```json
{
  "compilerOptions": {
    "paths": {
      "@shared-types/*": ["src/types/*"]
    }
  }
}
```

This allows importing types with:
```typescript
import type { AuthenticatedUser } from '@shared-types/auth';
```

## Benefits Summary

1. ✅ **Type Safety**: Catch errors at compile time
2. ✅ **Consistency**: Single source of truth for types
3. ✅ **Maintainability**: Easier to update types across codebase
4. ✅ **Developer Experience**: Better IntelliSense and autocomplete
5. ✅ **Documentation**: Types serve as inline documentation
6. ✅ **Refactoring**: Safe refactoring with TypeScript compiler checks
7. ✅ **Express Integration**: Proper typing for Express Request.user

## Conclusion

The introduction of `.d.ts` files significantly improves the codebase by:
- Centralizing type definitions
- Providing type safety across authentication flows
- Making the codebase more maintainable
- Improving developer experience
- Serving as living documentation

These improvements make the codebase more robust, easier to understand, and safer to refactor.

