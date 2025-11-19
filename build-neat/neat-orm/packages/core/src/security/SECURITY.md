# NeatOrm Security Guide

## Enterprise-Grade Security Features

NeatOrm provides comprehensive security features designed for production environments and enterprise adoption.

## Security Features Overview

### 1. SQL Injection Prevention

**Status**: ✅ **IMPLEMENTED**

- **Parameterized Queries**: All queries use parameterized statements with placeholders (`$1`, `$2` for PostgreSQL, `?` for MySQL/SQLite)
- **Identifier Escaping**: Table and column names are properly escaped using database-specific escaping
- **Input Validation**: Input validator checks for SQL injection patterns before processing

**Example**:
```typescript
// ✅ Safe: Uses parameterized queries
await query<User>()
  .select('id', 'name')
  .from('users')
  .where('email', '=', userEmail)  // Parameterized, safe
  .execute();

// ❌ Dangerous: Never do this
const sql = `SELECT * FROM users WHERE email = '${userEmail}'`;  // SQL injection risk!
```

### 2. Input Validation & Sanitization

**Status**: ✅ **IMPLEMENTED**

- **String Validation**: Validates and sanitizes string inputs, removes control characters
- **Type Validation**: Ensures correct types (string, number, date, boolean, array)
- **Size Limits**: Prevents DoS attacks through size limits (max length, max array size)
- **Pattern Detection**: Detects SQL injection patterns in user input
- **Identifier Validation**: Validates table/column names to prevent injection

**Example**:
```typescript
import { InputValidator } from '@neat-orm/core/security';

// Validate user input
const result = InputValidator.validateString(userInput, {
  maxLength: 1000,
});

if (!result.valid) {
  throw new Error(result.error);
}

// Use sanitized value
const sanitized = result.sanitized;
```

### 3. Secure Error Handling

**Status**: ✅ **IMPLEMENTED**

- **Error Sanitization**: Masks sensitive information (passwords, tokens, connection strings)
- **Production-Safe Messages**: Generic error messages in production, detailed in development
- **Stack Trace Protection**: Prevents stack trace leakage in production
- **Error Classification**: Categorizes errors by severity and type

**Example**:
```typescript
import { SecureErrorHandler } from '@neat-orm/core/security';

try {
  await query.execute();
} catch (error) {
  const sanitized = SecureErrorHandler.sanitizeError(error, {
    isProduction: process.env.NODE_ENV === 'production',
    logDetails: true,
    sensitivePatterns: [],
  });

  // Log securely
  SecureErrorHandler.logErrorSecurely(error, { userId: 123 }, config);

  // Return safe error to client
  return { error: sanitized.message };
}
```

### 4. Query Limits & Timeouts

**Status**: ✅ **IMPLEMENTED**

- **Result Set Limits**: Maximum rows returned per query (default: 10,000)
- **Query Timeouts**: Maximum query execution time (default: 30 seconds)
- **Complexity Limits**: Maximum joins, WHERE conditions, SELECT columns
- **Parameter Limits**: Maximum number of parameters per query

**Example**:
```typescript
import { QueryLimits } from '@neat-orm/core/security';

// Validate query before execution
QueryLimits.validateQuery(query, {
  maxRows: 5000,
  maxJoins: 5,
  maxWhereConditions: 20,
});

// Execute with timeout
const result = await QueryLimits.withTimeout(
  query.execute(),
  { maxQueryTime: 10000 }
);
```

### 5. Audit Logging

**Status**: ✅ **IMPLEMENTED**

- **Query Logging**: Logs all data modifications (INSERT, UPDATE, DELETE)
- **Access Tracking**: Tracks data access events
- **Security Events**: Logs security-related events
- **Compliance Ready**: Structured logging format for compliance

**Example**:
```typescript
import { AuditLogger } from '@neat-orm/core/security';

// Configure audit logging
AuditLogger.configure({
  enabled: true,
  logSuccessfulQueries: false,
  logSelectQueries: false,
  handler: async (entry) => {
    // Send to your logging service (e.g., ELK, Splunk, CloudWatch)
    await sendToLoggingService(entry);
  },
});

// Log data modifications automatically
await AuditLogger.logDataModification('UPDATE', 'users', userId, {
  affectedRows: 1,
});
```

## Security Best Practices

### 1. Always Use Parameterized Queries

✅ **DO**:
```typescript
.where('email', '=', userEmail)  // Parameterized
```

❌ **DON'T**:
```typescript
.where(`email = '${userEmail}'`)  // SQL injection risk!
```

### 2. Validate All User Input

✅ **DO**:
```typescript
const validation = InputValidator.validateString(userInput);
if (!validation.valid) {
  throw new Error(validation.error);
}
```

❌ **DON'T**:
```typescript
// Trust user input without validation
const query = userInput;  // Dangerous!
```

### 3. Use Query Limits

✅ **DO**:
```typescript
QueryLimits.validateQuery(query, {
  maxRows: 1000,
  maxQueryTime: 5000,
});
```

❌ **DON'T**:
```typescript
// Allow unlimited query size
const result = await query.execute();  // Could cause DoS
```

### 4. Enable Audit Logging in Production

✅ **DO**:
```typescript
AuditLogger.configure({
  enabled: true,
  handler: async (entry) => {
    await sendToComplianceSystem(entry);
  },
});
```

### 5. Sanitize Errors in Production

✅ **DO**:
```typescript
const sanitized = SecureErrorHandler.sanitizeError(error, {
  isProduction: true,
});
```

❌ **DON'T**:
```typescript
// Expose raw errors to clients
throw error;  // Could leak sensitive information
```

## Security Checklist

Before deploying to production, ensure:

- [ ] All queries use parameterized statements
- [ ] Input validation is enabled for all user inputs
- [ ] Query limits are configured appropriately
- [ ] Error handling sanitizes sensitive information
- [ ] Audit logging is enabled for data modifications
- [ ] Connection strings are stored securely (environment variables, secrets manager)
- [ ] Database connections use SSL/TLS in production
- [ ] Database user has minimal required permissions
- [ ] Rate limiting is implemented at the application level
- [ ] Regular security audits are performed

## Compliance

NeatOrm's security features support compliance with:

- **GDPR**: Audit logging for data access and modifications
- **HIPAA**: Secure error handling and audit trails
- **SOC 2**: Comprehensive security controls and logging
- **PCI DSS**: Input validation and secure error handling

## Reporting Security Issues

If you discover a security vulnerability, please report it responsibly:

1. **DO NOT** create a public GitHub issue
2. Email security concerns to: [security@neat-orm.dev]
3. Include detailed information about the vulnerability
4. Allow time for the issue to be addressed before public disclosure

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [SQL Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [Database Security Best Practices](https://cheatsheetseries.owasp.org/cheatsheets/Database_Security_Cheat_Sheet.html)

