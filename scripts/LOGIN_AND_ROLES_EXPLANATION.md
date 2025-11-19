# Login Flow and Role Management Explanation

## Overview

This document explains how authentication and role-based authorization works in the sandbox application, including how roles are fetched, stored, and used throughout the system.

## Login Flow

### 1. User Login Request

When a user submits login credentials:

```typescript
POST /auth/login
{
  "email": "user@example.com",
  "password": "password123"
}
```

### 2. Authentication Service (`auth.service.ts`)

The `login()` method performs the following steps:

#### Step 1: Find User by Email
```typescript
const user = await this.authRepository.findUserByEmail(loginDto.email);
```
- Queries the `users` table by email
- Includes password field for verification

#### Step 2: Verify Password
```typescript
const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
```
- Uses bcrypt to compare plain text password with hashed password
- Throws `UnauthorizedException` if invalid

#### Step 3: Fetch User with Roles
```typescript
const userWithRoles = await this.authRepository.findUserByIdWithRoles(user.id);
```
- Queries user with associated roles using Sequelize `include`
- Joins through `user_roles` junction table to `roles` table
- Returns user with `roles` array containing Role objects

#### Step 4: Extract Role Names
```typescript
const roleNames = userWithRoles?.roles?.map((r) => r.name) || ['USER'];
```
- Extracts role names from Role objects
- Defaults to `['USER']` if no roles found
- Example: `['ADMIN', 'USER']` or `['TEACHER']`

#### Step 5: Generate JWT Tokens
```typescript
const tokens = await this.generateTokens(user.id, user.email, roleNames);
```

### 3. Token Generation (`generateTokens()`)

Creates JWT payload and signs tokens:

```typescript
const payload = { 
  sub: userId,      // User ID
  email,            // User email
  roles: roleNames  // Array of role names: ['ADMIN', 'USER']
};

const accessToken = this.jwtService.sign(payload, {
  expiresIn: '15m'  // Short-lived token
});

const refreshToken = this.jwtService.sign(payload, {
  expiresIn: '7d'   // Long-lived token
});
```

**Key Point**: Roles are embedded directly in the JWT payload as an array of strings.

### 4. Set HTTP-Only Cookies

```typescript
this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
```

- Sets `accessToken` and `refreshToken` as HTTP-only cookies
- Prevents XSS attacks (JavaScript cannot access cookies)
- Cookies are sent automatically with subsequent requests

### 5. Return Response

```typescript
return {
  user: {
    id: user.id,
    email: user.email,
    name: user.name,
    isEmailVerified: user.isEmailVerified,
  },
  tokens,  // Not included in response body (sent as cookies)
};
```

## Role Storage Architecture

### Database Structure

```
users table
├── id (PK)
├── email
├── password (hashed)
└── ...

roles table
├── id (PK)
├── name (e.g., 'ADMIN', 'USER', 'TEACHER')
└── ...

user_roles table (Junction Table)
├── id (PK)
├── userId (FK → users.id)
├── roleId (FK → roles.id)
├── assignedBy (FK → users.id, optional)
└── assignedAt (timestamp)
```

### Many-to-Many Relationship

- **User** ↔ **UserRole** ↔ **Role**
- One user can have multiple roles
- One role can be assigned to multiple users
- Junction table (`user_roles`) tracks assignments with audit trail

### Role Fetching Process

1. **During Login**: 
   - `findUserByIdWithRoles()` performs JOIN query
   - Returns user with populated `roles` array

2. **In JWT Token**:
   - Role names extracted: `['ADMIN', 'USER']`
   - Embedded in JWT payload
   - Token is stateless (no DB lookup needed for validation)

3. **During Request Validation**:
   - JWT Strategy extracts roles from token payload
   - Roles are normalized to uppercase
   - Attached to `request.user` object

## JWT Strategy (`jwt.strategy.ts`)

### Token Extraction

Tokens can come from two sources:
1. **HTTP-Only Cookie**: `req.cookies['accessToken']`
2. **Authorization Header**: `Bearer <token>`

### Payload Validation

```typescript
async validate(payload: { sub: number; email: string; roles?: string[] }) {
  // 1. Load user from database for additional info (name, etc.)
  const user = await this.authRepository.findUserById(payload.sub);
  
  // 2. Extract roles from JWT payload (PRIMARY SOURCE)
  let roleNames: string[] = [];
  if (payload.roles && Array.isArray(payload.roles)) {
    roleNames = payload.roles
      .filter((r) => typeof r === 'string')
      .map((r) => r.trim().toUpperCase());
  }
  
  // 3. Fallback to database if JWT has no roles (shouldn't happen)
  if (roleNames.length === 0 && user) {
    const userWithRoles = await this.authRepository.findUserByIdWithRoles(payload.sub);
    roleNames = userWithRoles?.roles?.map((r) => r.name.toUpperCase()) || [];
  }
  
  // 4. Return authenticated user object
  return {
    id: payload.sub,
    email: payload.email,
    name: user?.name || 'User',
    roles: roleNames,  // Normalized to uppercase
  };
}
```

**Key Points**:
- JWT payload roles are the **primary source** (fast, no DB lookup)
- Database lookup is **fallback only** (for edge cases)
- Roles are normalized to uppercase for consistency

## Role-Based Authorization

### Roles Guard (`roles.guard.ts`)

Protects routes based on required roles:

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Put(':id')
async update(...) { ... }
```

**How it works**:
1. `JwtAuthGuard` runs first → validates JWT → sets `request.user`
2. `RolesGuard` runs second → checks if `user.roles` includes required roles
3. Case-insensitive matching: `'admin'` matches `'ADMIN'`

### Current User Decorator

```typescript
@Get('me')
async getCurrentUser(@CurrentUser() user: AuthenticatedUser) {
  // user.roles is guaranteed to be string[]
  // user.id, user.email, user.name are available
}
```

## Role Update Flow

### When Roles Change

**Important**: JWT tokens contain roles at generation time. If user roles change:

1. **Old tokens still valid** until expiration (roles in token don't update)
2. **Solution**: User must re-login or refresh token to get new roles
3. **Refresh token** also contains roles, so refresh will get updated roles

### Refresh Token Flow

```typescript
POST /auth/refresh
// Extracts refreshToken from cookie
// Validates token
// Generates NEW tokens with CURRENT roles from database
```

## Security Considerations

1. **HTTP-Only Cookies**: Prevents XSS attacks
2. **Role Normalization**: All roles stored/compared in uppercase
3. **JWT Expiration**: Short-lived access tokens (15m) limit exposure
4. **Database Fallback**: Ensures roles are always available even if JWT corrupted
5. **Case-Insensitive Matching**: Prevents role bypass via case manipulation

## Summary

1. **Login**: User credentials → Verify password → Fetch roles from DB → Embed in JWT → Set cookies
2. **Request**: Extract JWT from cookie/header → Validate → Extract roles from payload → Attach to request
3. **Authorization**: Check `request.user.roles` against required roles
4. **Storage**: Roles stored in DB (many-to-many), embedded in JWT (for performance), attached to request (for guards)

The system uses a **hybrid approach**: Database is source of truth, JWT provides fast access, and guards enforce authorization.

