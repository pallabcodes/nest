# Neat Framework - Complete Middleware Demo

This example demonstrates the complete middleware ecosystem:
- Guards for authorization
- Pipes for validation and transformation
- Interceptors for request/response processing
- Exception Filters for error handling

Run with: npm run demo:middleware

```typescript
import 'reflect-metadata';
import { Injectable, Controller, Get, Post, Put, Delete, Query, Param, Body, OnModuleInit } from '@neat/core';
import {
  Guard,
  RolesRequired,
  PermissionsRequired,
  Public,
  UseGuards,
  Pipe,
  UsePipes,
  Interceptor,
  UseInterceptors,
  ExceptionFilter,
  UseExceptionFilters,
  ValidationException,
  AuthorizationException,
  RateLimitException,
  DatabaseException,
  AuthGuard,
  ValidationPipe,
  ParseIntPipe,
  LoggingInterceptor,
  CacheInterceptor,
  TimeoutInterceptor,
  HttpExceptionFilter,
  ValidationExceptionFilter,
  createMiddlewareRegistry
} from '@neat/middleware';

// ========================================
// ENTITIES
// ========================================

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: string[];
  isActive: boolean;
}

interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  stock: number;
  createdBy: number;
}

// ... rest of the middleware demo code ...
```

See the original file for complete implementation details.

