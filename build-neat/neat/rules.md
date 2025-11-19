# Neat Framework Development Rules

## Overview

The Neat framework represents the pinnacle of TypeScript excellence, designed to impress TypeScript creators and core maintainers with god-moded type safety, advanced patterns, and zero-compromise development practices. This document outlines the comprehensive rules that govern all development activities.

## 1. Code Size Constraints (Critical)

### File Size Standards
- **Standard**: 150 lines per file
- **Maximum**: 300 lines per file
- **Method Size**: Maximum 50 lines per method

### Enforcement Strategy
- Split large files into focused, single-responsibility modules
- Extract complex methods into pure helper functions
- Use composition over monolithic classes
- Create utility modules for shared logic
- Methods exceeding 50 lines must be refactored or justified with detailed comments

## 2. Incremental Implementation Workflow (Critical)

### One File Per Iteration
1. **Single File Focus**: Implement only ONE file at a time
2. **Comprehensive Comments**: Each file must include extensive documentation:
   - What the code does and why it exists
   - How TypeScript compiles decorators/metadata to JavaScript
   - Runtime execution flow and behavior
   - Framework integration points and dependencies
   - Pain points addressed by this implementation
3. **Automated Validation**: Each file must pass validation checks:
   - **TypeScript Compilation**: `tsc --noEmit --project <file>` to check for errors
   - **Line Count Validation**: Verify file is ≤ 300 lines using `wc -l <file>`
   - **Type Safety**: Ensure zero `any` types, proper generics, exhaustive checking
4. **Stop and Ask**: After each file completion and validation:
   - Display the completed file content
   - Show validation results (compilation success, line count)
   - Ask: "Should I proceed to [next file name]?"
   - Wait for explicit user confirmation before continuing
5. **No Batch Implementation**: Never implement multiple files without permission
6. **File Completion Checklist**:
   - ✅ TypeScript source with full types
   - ✅ Comprehensive comments explaining all aspects
   - ✅ Follows size constraints (max 300 lines, methods max 50 lines)
   - ✅ Passes TypeScript compilation check (`tsc --noEmit`)
   - ✅ Validated line count (≤ 300 lines)
   - ✅ Zero `any` types, proper generics, exhaustive type checking
   - ✅ Ready for review and validation

### Workflow Validation
- Each file must demonstrate TypeScript mastery
- Comments must explain decorator compilation and metadata storage
- Runtime behavior must be clearly documented
- Integration points must be explicitly stated

## 3. Pain Points Validation & Research (Critical)

### Full Clarity on Pain Points
Every pain point addressed by Neat must be:
- **Validated with Sources**: Document exact source (URL, DOI, paper title)
- **Quantified**: Include specific examples, code snippets, statistics
- **Evidence-Based**: Show quotes or direct evidence from sources
- **Demonstrated**: Prove how Neat solves the problem better

### Validation Requirements
- **Minimum Sources**: Each pain point must have 2-3 independent sources
- **Diverse Sources**: Include research papers, GitHub issues, Reddit discussions, Medium articles
- **Evidence Types**: Quotes, code examples, performance metrics, user complaints
- **Comparison**: Before/after demonstrations showing Neat's superiority

### Unlimited Research Sources
- **Academic Research**: ACM, IEEE, arXiv papers on frameworks, type systems, metaprogramming
- **Programming Languages**: Java/Spring, C#/ASP.NET, Python/Django, Ruby/Rails, Clojure, Haskell implementations
- **Open Source**: GitHub repositories analysis, issue discussions, PR reviews
- **Community**: Reddit (r/node, r/typescript, r/javascript), Stack Overflow
- **Technical Writing**: Medium articles, conference talks, framework documentation
- **Industry**: Production codebase analysis, performance benchmarks

### Documented Pain Points Addressed

#### 1. Boilerplate Complexity in NestJS
**Sources**:
- Reddit: "About Nest.js drawbacks" (https://www.reddit.com/r/node/comments/15jn4ry/about_nestjs_drawbacks_and_perfect_nonexistent/)
- Medium: "Nest.js — Architectural Pattern, Controllers, Providers, and Modules" (https://medium.com/geekculture/nest-js-architectural-pattern-controllers-providers-and-modules-406d9b192a3a)
- GitHub Issues: NestJS repository issues on module complexity

**Evidence**: Users report 200+ lines of boilerplate for simple CRUD operations, complex module hierarchies, mandatory @Module decorators.

**Neat Solution**: Single @StartupApplication decorator, auto-discovery, zero module files.

#### 2. Performance Overhead
**Sources**:
- NestJS Performance Docs: Fastify vs Express benchmarks (https://docs.nestjs.com/techniques/performance)
- Research: "Node.js Framework Performance Analysis" (various benchmarks)

**Evidence**: Express can be 2x slower than Fastify in benchmarks.

**Neat Solution**: Fastify default, optimized container, minimal abstraction layers.

#### 3. TypeScript Integration Issues
**Sources**:
- TypeScript Issues: Decorator metadata limitations
- Framework Comparisons: Type safety across Node.js frameworks

**Evidence**: Many frameworks force JavaScript usage or have incomplete TypeScript support.

**Neat Solution**: Full TypeScript-first design, advanced type patterns, zero `any` usage.

## 4. TypeScript Excellence Standard (Critical)

### Goal
Every line of TypeScript must be "ingenious, top-tier, god-moded" - code that would impress TypeScript creators (Anders Hejlsberg, Ryan Cavanaugh) and core maintainers.

### Advanced Type System Usage
- **Conditional Types**: Complex type transformations and inference
- **Mapped Types**: Type manipulation for API design
- **Template Literal Types**: String manipulation at type level
- **Branded Types**: Nominal typing for type safety
- **Discriminated Unions**: Exhaustive type checking
- **Utility Types**: Proper usage of `Partial`, `Required`, `Pick`, `Omit`, `Record`

### Type Safety Excellence
- **Zero `any` Types**: Use `unknown` with proper type guards
- **Exhaustive Checking**: No implicit `any`, full type coverage
- **Type Inference**: Leveraged appropriately, explicit when needed
- **Generic Constraints**: Proper bounds for type safety
- **Type Guards**: Runtime type checking with type narrowing
- **Const Assertions**: Literal types where appropriate

### Advanced Patterns
- **Higher-Order Types**: Types that operate on other types
- **Phantom Types**: Additional safety through type parameters
- **Nominal Typing**: Preventing primitive type confusion
- **Type-Level Programming**: Where beneficial for API design
- **Generic Decorators**: Type-safe decorator factories
- **Metaclass Patterns**: Advanced class manipulation

### Production-Grade Practices
- **Compile-Time Error Catching**: Types prevent runtime errors
- **No Type Assertions**: Unless absolutely necessary with justification
- **Discriminated Error Types**: Union types for error handling
- **Type-Safe DI**: Dependency injection with full type safety
- **Metadata Reflection**: Type-safe runtime metadata access
- **Strategy Patterns**: Type-safe polymorphic implementations

### Validation Criteria
Each file must demonstrate TypeScript mastery that would impress:
- **TypeScript Team**: Anders Hejlsberg, Ryan Cavanaugh, Daniel Rosenwasser
- **Core Maintainers**: Contributors to TypeScript compiler
- **Framework Authors**: Creators of advanced TypeScript frameworks
- **Type Safety Experts**: Community leaders in TypeScript best practices

## 5. File Organization and Structure

### Directory Structure
```
build-neat/
├── neat/
│   ├── packages/
│   │   └── core/
│   │       ├── src/
│   │       │   ├── decorators/     # All decorator implementations
│   │       │   ├── container/      # DI container system
│   │       │   ├── bootstrap/      # Startup and lifecycle
│   │       │   ├── http/          # HTTP adapters
│   │       │   ├── strategy/      # Strategy pattern system
│   │       │   ├── types/         # Type definitions
│   │       │   ├── errors/        # Error classes
│   │       │   └── index.ts       # Public API exports
│   │       ├── examples/          # Example applications
│   │       ├── package.json
│   │       ├── tsconfig.json
│   │       └── README.md
│   ├── rules.md                   # This file
│   ├── package.json               # Root configuration
│   ├── tsconfig.json              # Root TypeScript config
│   ├── .gitignore
│   └── README.md
└── references/                    # NestJS reference code
```

### Naming Conventions
- **Files**: kebab-case (`injectable.decorator.ts`)
- **Classes**: PascalCase (`Container`, `DependencyInjector`)
- **Functions**: camelCase (`bootstrap`, `registerRoute`)
- **Constants**: UPPER_SNAKE_CASE (`METADATA_KEY`)
- **Types**: PascalCase with descriptive names (`StartupOptions`, `RouteDefinition`)

### Import Organization
- Group imports: Node.js built-ins, external packages, internal modules
- Use absolute imports within monorepo
- Prefer named imports over default imports
- No wildcard imports (`import *`)

## 6. Development Workflow

### Git Workflow
- Feature branches from `main`
- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`
- Pull requests with detailed descriptions
- Code review required for all changes

### Testing Strategy
- Unit tests for all functions and classes
- Integration tests for framework features
- End-to-end tests for examples
- 100% type coverage requirement
- Performance benchmarks for critical paths

### Documentation Requirements
- JSDoc comments for all public APIs
- README files for all modules
- Example code with explanations
- Architecture decision records (ADRs)

## 7. Quality Standards

### Code Quality
- ESLint with TypeScript rules enabled
- Prettier for consistent formatting
- Husky pre-commit hooks
- Lint-staged for pre-commit checks

### Performance Standards
- Minimal runtime overhead
- Optimized bundle sizes
- Fast startup times
- Memory-efficient patterns

### Security Considerations
- Input validation and sanitization
- Secure defaults for HTTP adapters
- No unsafe eval or dynamic code generation
- Proper error handling without information leakage

## 8. Framework-Specific Guidelines

### Dependency Injection
- Constructor injection preferred
- Circular dependency detection and prevention
- Singleton scope by default
- Proper lifecycle management

### Decorators
- Type-safe decorator factories
- Proper metadata storage and retrieval
- Runtime type information preservation
- No runtime performance impact

### HTTP Adapters
- Fastify as default for performance
- Express as fallback option
- Consistent API across adapters
- Proper middleware integration

### Strategy Pattern
- Type-safe strategy registration
- Runtime strategy selection
- Lazy loading and caching
- Error handling and fallbacks

## 9. Research and Validation Methodology

### Source Evaluation Criteria
- **Authority**: Official documentation, research papers, core maintainer statements
- **Recency**: Current best practices (within 2-3 years)
- **Evidence**: Concrete examples, benchmarks, user reports
- **Consensus**: Multiple sources confirming the same pain point

### Documentation of Research
- **Source Citations**: Full URLs, DOIs, or specific references
- **Evidence Extraction**: Direct quotes or code examples
- **Context Preservation**: Original context of complaints/improvements
- **Solution Validation**: How Neat addresses each validated issue

### Continuous Research
- Monitor new TypeScript releases and features
- Track framework evolution in the ecosystem
- Update pain points based on new evidence
- Validate solutions against emerging best practices

## 10. Implementation Order and Dependencies

### Phase 1: Foundation (Current)
1. Project structure and configuration files
2. Type definitions and error classes
3. Decorator implementations (one at a time)
4. Container system development
5. Bootstrap and lifecycle management
6. HTTP adapters and routing
7. Strategy pattern support
8. Example applications and documentation

### Phase 2: Enhancement (Future)
- Additional HTTP adapters
- Database integrations
- Testing utilities
- CLI tooling
- Plugin system

## Compliance and Enforcement

All code must comply with these rules. Exceptions require:
1. Detailed justification with research backing
2. Alternative solutions considered
3. Performance impact analysis
4. Type safety implications documented
5. Explicit approval from framework maintainers

## Validation Checklist

Before marking any file as complete:
- [ ] TypeScript excellence: Would impress TypeScript team?
- [ ] Size constraints: Under 300 lines, methods under 50?
- [ ] Comprehensive comments: Explains compilation, runtime, integration?
- [ ] Pain points addressed: Research-backed solutions documented?
- [ ] Type safety: Zero `any`, proper generics, exhaustive checking?
- [ ] Research validation: Sources cited, evidence provided?
- [ ] Framework goals: Reduces boilerplate, improves DX, maximizes performance?

---

*These rules ensure Neat represents the absolute pinnacle of TypeScript framework development, with every line demonstrating god-moded type safety and architectural excellence.*
