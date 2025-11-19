# Entities Index - Auto-discovery Entry Point

This file serves as the entry point for entity auto-discovery. The metadata scanner will find and load all entities from this directory.

```typescript
// Export all entities for auto-discovery
export { User } from './User.js';
export { Post } from './Post.js';

// Note: In a real application, you might have:
// - User.ts
// - Post.ts
// - Comment.ts
// - Category.ts
// etc.
//
// All entities with @Entity decorators will be auto-discovered!
```

