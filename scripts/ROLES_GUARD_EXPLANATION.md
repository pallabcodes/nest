# RolesGuard Deep Dive Explanation

## Overview

The `RolesGuard` is a NestJS guard that implements role-based access control (RBAC). It checks if an authenticated user has the required roles to access a protected route.

## How Guards Work in NestJS

Guards in NestJS are executed **before** route handlers and can:
- Allow the request to proceed (`return true`)
- Deny the request (`return false` or throw exception)
- Modify the request/response

Guards execute in the order they're declared in `@UseGuards()`.

## Complete Request Flow

### Example Route

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Put(':id')
async update(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdateUserDto) {
  // This code only runs if both guards pass
  return this.userService.update(id, updateDto);
}
```

### Execution Order

```
1. Request arrives at route
   ↓
2. JwtAuthGuard executes first
   ├─ Extracts JWT from cookie/header
   ├─ Validates JWT signature and expiration
   ├─ Calls JWT Strategy's validate() method
   ├─ Attaches user to request.user
   └─ Returns true (allows request to continue)
   ↓
3. RolesGuard executes second
   ├─ Reads @Roles decorator metadata
   ├─ Checks if request.user exists
   ├─ Compares user.roles with required roles
   └─ Returns true (if authorized) or throws ForbiddenException
   ↓
4. Route handler executes (only if guards pass)
```

## Step-by-Step: RolesGuard Execution

### Step 1: Guard Activation

```typescript
canActivate(context: ExecutionContext): boolean {
```

The `canActivate` method is called by NestJS for every request to the protected route.

**Parameters**:
- `context: ExecutionContext` - Contains request/response objects and route metadata

### Step 2: Extract Required Roles from Metadata

```typescript
const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
  context.getHandler(),  // Check method-level decorator
  context.getClass(),     // Check class-level decorator
]);
```

**How it works**:

1. **Reflector**: NestJS utility that reads metadata from decorators
2. **ROLES_KEY**: The key used by `@Roles()` decorator (`'roles'`)
3. **getAllAndOverride**: Gets metadata, with method-level overriding class-level

**Example**:
```typescript
// Method-level (takes precedence)
@Roles('ADMIN')
@Put(':id')
async update() { ... }

// Class-level (applies to all methods)
@Roles('USER')
@Controller('users')
export class UserController { ... }
```

**Result**: `requiredRoles = ['ADMIN']`

### Step 3: Check if Roles Are Required

```typescript
if (!requiredRoles || requiredRoles.length === 0) {
  return true;  // No roles required, allow access
}
```

If no `@Roles()` decorator is present, the guard allows access (no role check needed).

### Step 4: Get Authenticated User

```typescript
const request = context.switchToHttp().getRequest();
const user = request.user;
```

**Important**: `request.user` is set by `JwtAuthGuard` (which runs first).

The user object structure (from JWT Strategy):
```typescript
{
  id: 1,
  email: 'admin@example.com',
  name: 'Admin User',
  roles: ['ADMIN', 'USER']  // Array of role names (uppercase)
}
```

### Step 5: Verify User is Authenticated

```typescript
if (!user) {
  throw new ForbiddenException('User not authenticated');
}
```

If `JwtAuthGuard` didn't set `request.user`, the user isn't authenticated.

**Note**: This shouldn't happen if guards are in correct order, but it's a safety check.

### Step 6: Check User Roles

```typescript
const hasRole = this.checkUserRoles(user, requiredRoles);
```

This is where the actual role checking happens (detailed below).

### Step 7: Allow or Deny Access

```typescript
if (!hasRole) {
  const userRoles = this.getUserRoles(user);
  throw new ForbiddenException(
    `Access denied. Required roles: ${requiredRoles.join(', ')}. Your roles: ${userRoles.join(', ') || 'none'}`,
  );
}

return true;  // User has required role, allow access
```

If user doesn't have required role:
- Extract user's roles for error message
- Throw `ForbiddenException` with helpful message
- Request is denied (403 Forbidden)

If user has required role:
- Return `true`
- Request proceeds to route handler

## Role Checking Logic (`checkUserRoles`)

The guard supports multiple role formats for backward compatibility:

### Format 1: New System (Current) - `user.roles` Array

```typescript
// User from JWT Strategy
user = {
  id: 1,
  email: 'admin@example.com',
  roles: ['ADMIN', 'USER']  // Array of strings
}
```

**Checking Logic**:
```typescript
if (user.roles && Array.isArray(user.roles)) {
  const userRoleNames = user.roles.map((role: any) => {
    const roleName = typeof role === 'string' ? role : role.name;
    return roleName?.toLowerCase();
  });
  // userRoleNames = ['admin', 'user']
  
  return normalizedRequiredRoles.some((role) => userRoleNames.includes(role));
  // Checks if 'admin' is in ['admin', 'user'] → true
}
```

**Case-Insensitive Matching**:
- Required roles: `['ADMIN']` → normalized to `['admin']`
- User roles: `['ADMIN', 'USER']` → normalized to `['admin', 'user']`
- Comparison: `'admin'` in `['admin', 'user']` → ✅ **Match**

### Format 2: Legacy System - `user.role` (Single String)

```typescript
// Legacy format (for backward compatibility)
user = {
  id: 1,
  role: 'ADMIN'  // Single role string
}
```

**Checking Logic**:
```typescript
if (user.role) {
  return normalizedRequiredRoles.includes(user.role.toLowerCase());
  // Checks if 'admin' is in ['admin'] → true
}
```

### Format 3: Legacy System - `user.roleNames` Array

```typescript
// Another legacy format
user = {
  id: 1,
  roleNames: ['ADMIN', 'USER']  // Legacy property name
}
```

**Checking Logic**:
```typescript
if (user.roleNames && Array.isArray(user.roleNames)) {
  const normalizedUserRoles = user.roleNames.map((r: string) => r.toLowerCase());
  return normalizedRequiredRoles.some((role) => normalizedUserRoles.includes(role));
}
```

## Case-Insensitive Matching Explained

### Why Case-Insensitive?

Roles can come from different sources:
- Database: `'ADMIN'` (uppercase)
- JWT payload: `'admin'` (could be any case)
- User input: `'Admin'` (mixed case)

**Solution**: Normalize everything to lowercase before comparison.

### Example

```typescript
// Required role
@Roles('admin')  // lowercase

// User roles (from JWT)
user.roles = ['ADMIN', 'USER']  // uppercase

// Normalization
requiredRoles = ['admin']  // normalized to lowercase
userRoles = ['admin', 'user']  // normalized to lowercase

// Comparison
'admin' in ['admin', 'user']  // ✅ Match!
```

## Real-World Examples

### Example 1: Admin-Only Route

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Put('users/:id')
async updateUser(@Param('id') id: number, @Body() dto: UpdateUserDto) {
  return this.userService.update(id, dto);
}
```

**Request Flow**:

1. **User with ADMIN role**:
   ```
   Request → JwtAuthGuard ✅ → RolesGuard ✅ → Handler executes
   ```

2. **User with USER role only**:
   ```
   Request → JwtAuthGuard ✅ → RolesGuard ❌ → ForbiddenException
   Error: "Access denied. Required roles: ADMIN. Your roles: USER"
   ```

3. **Unauthenticated user**:
   ```
   Request → JwtAuthGuard ❌ → UnauthorizedException
   ```

### Example 2: Multiple Roles (OR Logic)

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'TEACHER')
@Get('courses/:id/students')
async getCourseStudents(@Param('id') id: number) {
  return this.courseService.getStudents(id);
}
```

**Logic**: User needs **ANY** of the specified roles (OR, not AND).

- User with `['ADMIN']` → ✅ **Allowed**
- User with `['TEACHER']` → ✅ **Allowed**
- User with `['ADMIN', 'TEACHER']` → ✅ **Allowed**
- User with `['USER']` only → ❌ **Denied**

### Example 3: No Roles Required

```typescript
@UseGuards(JwtAuthGuard)  // Only authentication, no role check
@Get('profile')
async getProfile(@CurrentUser() user: AuthenticatedUser) {
  return this.userService.findOne(user.id);
}
```

**Note**: `RolesGuard` not included, so any authenticated user can access.

### Example 4: Public Route (No Guards)

```typescript
@Public()  // Skips all guards
@Get('courses')
async findAll() {
  return this.courseService.findAll();
}
```

**Note**: `@Public()` decorator tells guards to skip this route entirely.

## Error Messages

The guard provides helpful error messages:

### User Not Authenticated
```typescript
throw new ForbiddenException('User not authenticated');
```

### User Lacks Required Role
```typescript
throw new ForbiddenException(
  `Access denied. Required roles: ADMIN. Your roles: USER`
);
```

**Benefits**:
- Clear error message
- Shows what roles were required
- Shows what roles the user has
- Helps with debugging

## Guard Order Matters

### ✅ Correct Order

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)  // JWT first, then Roles
@Roles('ADMIN')
```

**Why**: `JwtAuthGuard` must run first to set `request.user`, which `RolesGuard` needs.

### ❌ Wrong Order

```typescript
@UseGuards(RolesGuard, JwtAuthGuard)  // Wrong order!
@Roles('ADMIN')
```

**Problem**: `RolesGuard` runs before `JwtAuthGuard`, so `request.user` doesn't exist yet → throws error.

## Performance Considerations

### Fast Path: JWT Roles

The guard primarily uses roles from JWT payload (already validated):
- ✅ No database lookup needed
- ✅ Fast comparison
- ✅ Stateless

### Fallback: Database Roles

Only used if JWT has no roles (edge case):
- ⚠️ Requires database query
- ⚠️ Slower
- ✅ Ensures roles are always available

## Security Considerations

### 1. Role Normalization

Case-insensitive matching prevents bypass attempts:
```typescript
// Attacker tries: @Roles('admin') but user has 'ADMIN'
// Guard normalizes both → 'admin' === 'admin' ✅
```

### 2. Guard Order Enforcement

`JwtAuthGuard` must run first to ensure user is authenticated before role check.

### 3. Explicit Role Requirements

Routes without `@Roles()` decorator are accessible to all authenticated users (if only `JwtAuthGuard` is used).

### 4. Multiple Role Support

Guard checks if user has **ANY** of the required roles (OR logic), not all (AND logic).

## Summary

1. **Execution Order**: `JwtAuthGuard` → `RolesGuard` → Route Handler
2. **Metadata Reading**: Uses `Reflector` to read `@Roles()` decorator
3. **Role Checking**: Compares `user.roles` with required roles (case-insensitive)
4. **Multiple Formats**: Supports new (`user.roles`) and legacy (`user.role`, `user.roleNames`) formats
5. **Error Handling**: Throws `ForbiddenException` with helpful error messages
6. **Performance**: Uses JWT roles (fast) with database fallback (slow, edge case only)

The `RolesGuard` provides a robust, flexible, and performant way to implement role-based access control in NestJS applications.

