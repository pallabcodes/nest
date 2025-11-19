# Neat Framework - Cursor IDE Development Rules

## Incremental Implementation Workflow

### One File Per Iteration
- Implement only ONE file at a time
- After completion, run validation checks:
  ```bash
  # Check TypeScript compilation
  npx tsc --noEmit --project tsconfig.json --skipLibCheck <file>

  # Check line count
  wc -l <file>  # Must be ≤ 300 lines
  ```
- Wait for explicit user confirmation before proceeding to next file
- Never implement multiple files without permission

### File Requirements
- **Maximum 300 lines per file**
- **Maximum 50 lines per method**
- **Zero `any` types** - use `unknown` with type guards
- **Comprehensive comments** explaining:
  - What the code does and why it exists
  - How TypeScript compiles decorators/metadata
  - Runtime execution flow
  - Framework integration points
  - Pain points addressed

### TypeScript Excellence Standards
- **Branded types** for nominal typing
- **Discriminated unions** for exhaustive checking
- **Conditional types** for complex transformations
- **Generic constraints** for type safety
- **Advanced patterns** that impress TypeScript team

### Validation Checklist (Run After Each File)
- [ ] Passes TypeScript compilation (`tsc --noEmit`)
- [ ] Line count ≤ 300 lines
- [ ] Zero `any` types, proper generics
- [ ] Comprehensive comments included
- [ ] Type safety excellence demonstrated
- [ ] Ready for user review and approval

## Quick Commands

### Validate Current File
```bash
# TypeScript check
npx tsc --noEmit packages/core/src/types/index.ts

# Line count check
wc -l packages/core/src/types/index.ts
```

### Framework Structure
```
packages/core/src/
├── decorators/     # Decorator implementations
├── container/      # DI container system
├── bootstrap/      # Startup and lifecycle
├── http/          # HTTP adapters
├── strategy/      # Strategy pattern
├── types/         # Type definitions
├── errors/        # Error classes
└── index.ts       # Public API
```

## Critical Rules Reminder
- **One file at a time** - no batch implementation
- **300 line limit** - split large files into modules
- **50 line methods** - extract complex logic
- **Zero any types** - god-moded TypeScript only
- **Comprehensive docs** - explain everything
- **Validation required** - check before proceeding

## Pain Points Addressed
- NestJS boilerplate complexity
- Performance overhead (Fastify default)
- TypeScript integration issues
- Complex module hierarchies

---
*Remember: Every line of code must demonstrate TypeScript mastery that would impress Anders Hejlsberg himself.*
