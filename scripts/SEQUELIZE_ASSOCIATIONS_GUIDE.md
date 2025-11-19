# Sequelize Associations Guide - Complete Reference

## Table of Contents
1. [Association Types Overview](#association-types-overview)
2. [Circular Dependency Prevention](#circular-dependency-prevention)
3. [One-to-One (HasOne / BelongsTo)](#one-to-one-hasone--belongsto)
4. [One-to-Many (HasMany / BelongsTo)](#one-to-many-hasmany--belongsto)
5. [Many-to-Many (BelongsToMany)](#many-to-many-belongstomany)
6. [Self-Referencing Associations](#self-referencing-associations)
7. [Polymorphic Associations](#polymorphic-associations)
8. [Best Practices & Patterns](#best-practices--patterns)

---

## Association Types Overview

Sequelize supports 4 main association types:

| Association | Decorator | Use Case | Example |
|------------|-----------|----------|---------|
| **One-to-One** | `@HasOne` / `@BelongsTo` | User ↔ Profile | One user has one profile |
| **One-to-Many** | `@HasMany` / `@BelongsTo` | User ↔ Posts | One user has many posts |
| **Many-to-Many** | `@BelongsToMany` | User ↔ Role | Users have many roles, roles have many users |
| **Self-Referencing** | Any of above | Category ↔ Category | Categories with parent/child |

---

## Circular Dependency Prevention

### ⚠️ THE GOLDEN RULE

**ALWAYS use arrow functions `() => Model` in association decorators to prevent circular dependencies.**

### ❌ WRONG (Causes Circular Dependency)
```typescript
import { Role } from './role.model';

@BelongsToMany(Role, { ... }) // ❌ Direct reference - CIRCULAR DEPENDENCY!
```

### ✅ CORRECT (Prevents Circular Dependency)
```typescript
import { Role } from './role.model';

@BelongsToMany(() => Role, { ... }) // ✅ Arrow function - SAFE!
```

### Why Arrow Functions Work

Arrow functions **defer evaluation** until runtime, breaking the circular import chain:
- **Import time**: `Role` is just a reference, not evaluated
- **Runtime**: Sequelize calls the arrow function, then evaluates `Role`

---

## One-to-One (HasOne / BelongsTo)

### Pattern: User ↔ Profile

**Use Case:** One user has exactly one profile, one profile belongs to exactly one user.

### Implementation

#### User Model (Parent - HasOne)
```typescript
import { Table, Column, Model, DataType, HasOne } from 'sequelize-typescript';
import { Profile } from './profile.model'; // Direct import OK

@Table({ tableName: 'users' })
export class User extends Model<User> {
  @Column(DataType.STRING)
  email: string;

  // ✅ Use arrow function to prevent circular dependency
  @HasOne(() => Profile, { 
    foreignKey: 'userId', 
    as: 'profile' 
  })
  profile: Profile;
}
```

#### Profile Model (Child - BelongsTo)
```typescript
import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from './user.model'; // Direct import OK

@Table({ tableName: 'profiles' })
export class Profile extends Model<Profile> {
  @ForeignKey(() => User) // ✅ Arrow function
  @Column(DataType.INTEGER)
  userId: number;

  @Column(DataType.STRING)
  bio: string;

  // ✅ Use arrow function to prevent circular dependency
  @BelongsTo(() => User, { 
    foreignKey: 'userId', 
    as: 'user' 
  })
  user: User;
}
```

### Usage Examples

```typescript
// Create user with profile
const user = await User.create({ email: 'test@example.com' });
await Profile.create({ userId: user.id, bio: 'Developer' });

// Load user with profile
const userWithProfile = await User.findByPk(1, {
  include: [{ model: Profile, as: 'profile' }]
});

// Load profile with user
const profileWithUser = await Profile.findByPk(1, {
  include: [{ model: User, as: 'user' }]
});
```

---

## One-to-Many (HasMany / BelongsTo)

### Pattern: User ↔ Posts

**Use Case:** One user has many posts, each post belongs to one user.

### Implementation

#### User Model (Parent - HasMany)
```typescript
import { Table, Column, Model, DataType, HasMany } from 'sequelize-typescript';
import { Post } from './post.model'; // Direct import OK

@Table({ tableName: 'users' })
export class User extends Model<User> {
  @Column(DataType.STRING)
  email: string;

  // ✅ Use arrow function - prevents circular dependency
  @HasMany(() => Post, { 
    foreignKey: 'userId', 
    as: 'posts' 
  })
  posts: Post[];

  // You can have multiple HasMany associations
  @HasMany(() => Comment, { 
    foreignKey: 'userId', 
    as: 'comments' 
  })
  comments: Comment[];
}
```

#### Post Model (Child - BelongsTo)
```typescript
import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from './user.model'; // Direct import OK

@Table({ tableName: 'posts' })
export class Post extends Model<Post> {
  @ForeignKey(() => User) // ✅ Arrow function
  @Column(DataType.INTEGER)
  userId: number;

  @Column(DataType.STRING)
  title: string;

  @Column(DataType.TEXT)
  content: string;

  // ✅ Use arrow function - prevents circular dependency
  @BelongsTo(() => User, { 
    foreignKey: 'userId', 
    as: 'author' // Different alias for clarity
  })
  author: User;
}
```

### Usage Examples

```typescript
// Create user with posts
const user = await User.create({ email: 'author@example.com' });
await Post.bulkCreate([
  { userId: user.id, title: 'Post 1', content: '...' },
  { userId: user.id, title: 'Post 2', content: '...' },
]);

// Load user with all posts
const userWithPosts = await User.findByPk(1, {
  include: [{ model: Post, as: 'posts' }]
});

// Load post with author
const postWithAuthor = await Post.findByPk(1, {
  include: [{ model: User, as: 'author' }]
});

// Nested includes (user → posts → comments)
const userWithPostsAndComments = await User.findByPk(1, {
  include: [{
    model: Post,
    as: 'posts',
    include: [{
      model: Comment,
      as: 'comments'
    }]
  }]
});
```

---

## Many-to-Many (BelongsToMany)

### Pattern: User ↔ Role (through UserRole)

**Use Case:** Users have many roles, roles have many users. Requires a junction table.

### Implementation

#### User Model
```typescript
import { Table, Column, Model, DataType, BelongsToMany } from 'sequelize-typescript';
import { Role } from './role.model'; // Direct import OK
import { UserRole } from './user-role.model'; // Direct import OK

@Table({ tableName: 'users' })
export class User extends Model<User> {
  @Column(DataType.STRING)
  email: string;

  // ✅ Use arrow functions for BOTH Role and through model
  @BelongsToMany(() => Role, {
    through: () => UserRole, // ✅ Arrow function for junction table
    foreignKey: 'userId',
    otherKey: 'roleId',
    as: 'roles',
  })
  roles: Role[];
}
```

#### Role Model
```typescript
import { Table, Column, Model, DataType, BelongsToMany } from 'sequelize-typescript';
import { User } from './user.model'; // Direct import OK
import { UserRole } from './user-role.model'; // Direct import OK

@Table({ tableName: 'roles' })
export class Role extends Model<Role> {
  @Column(DataType.STRING)
  name: string;

  // ✅ Use arrow functions for BOTH User and through model
  @BelongsToMany(() => User, {
    through: () => UserRole, // ✅ Arrow function for junction table
    foreignKey: 'roleId',
    otherKey: 'userId',
    as: 'users',
  })
  users: User[];
}
```

#### UserRole Junction Model (Optional but Recommended)
```typescript
import { Table, Column, Model, DataType, ForeignKey, BelongsTo, PrimaryKey, AutoIncrement, CreatedAt } from 'sequelize-typescript';
import { User } from './user.model'; // Direct import OK
import { Role } from './role.model'; // Direct import OK

@Table({ tableName: 'user_roles' })
export class UserRole extends Model<UserRole> {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id: number;

  @ForeignKey(() => User) // ✅ Arrow function
  @Column(DataType.INTEGER)
  userId: number;

  @ForeignKey(() => Role) // ✅ Arrow function
  @Column(DataType.INTEGER)
  roleId: number;

  // Additional fields in junction table
  @Column(DataType.INTEGER)
  assignedBy: number;

  @CreatedAt
  assignedAt: Date;

  // ✅ BelongsTo associations to access related models
  @BelongsTo(() => User, { foreignKey: 'userId', as: 'user' })
  user: User;

  @BelongsTo(() => Role, { foreignKey: 'roleId', as: 'role' })
  role: Role;
}
```

### Usage Examples

```typescript
// Assign role to user
const user = await User.findByPk(1);
const adminRole = await Role.findOne({ where: { name: 'ADMIN' } });
await user.$add('roles', adminRole);

// Or create directly in junction table
await UserRole.create({
  userId: user.id,
  roleId: adminRole.id,
  assignedBy: 1,
});

// Load user with roles
const userWithRoles = await User.findByPk(1, {
  include: [{ model: Role, as: 'roles' }]
});

// Load role with users
const roleWithUsers = await Role.findByPk(1, {
  include: [{ model: User, as: 'users' }]
});

// Access junction table data
const userRole = await UserRole.findOne({
  where: { userId: 1, roleId: 1 },
  include: [
    { model: User, as: 'user' },
    { model: Role, as: 'role' }
  ]
});
```

---

## Self-Referencing Associations

### Pattern: Category ↔ Category (Parent/Child)

**Use Case:** Categories with parent categories, employees with managers, comments with replies.

### Implementation

#### Category Model (Self-Referencing)
```typescript
import { Table, Column, Model, DataType, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';

@Table({ tableName: 'categories' })
export class Category extends Model<Category> {
  @Column(DataType.STRING)
  name: string;

  @ForeignKey(() => Category) // ✅ Self-reference with arrow function
  @Column(DataType.INTEGER)
  parentId: number;

  // ✅ BelongsTo parent category
  @BelongsTo(() => Category, { 
    foreignKey: 'parentId', 
    as: 'parent' 
  })
  parent: Category;

  // ✅ HasMany child categories
  @HasMany(() => Category, { 
    foreignKey: 'parentId', 
    as: 'children' 
  })
  children: Category[];
}
```

### Usage Examples

```typescript
// Create parent category
const parent = await Category.create({ name: 'Electronics' });

// Create child categories
const child1 = await Category.create({ 
  name: 'Laptops', 
  parentId: parent.id 
});
const child2 = await Category.create({ 
  name: 'Phones', 
  parentId: parent.id 
});

// Load category with parent
const categoryWithParent = await Category.findByPk(child1.id, {
  include: [{ model: Category, as: 'parent' }]
});

// Load category with children
const categoryWithChildren = await Category.findByPk(parent.id, {
  include: [{ model: Category, as: 'children' }]
});

// Recursive loading (all descendants)
const loadCategoryTree = async (categoryId: number) => {
  return Category.findByPk(categoryId, {
    include: [{
      model: Category,
      as: 'children',
      include: [{ model: Category, as: 'children' }] // Nested
    }]
  });
};
```

---

## Polymorphic Associations

### Pattern: Comment ↔ (Post | Video | Article)

**Use Case:** Comments can belong to different types of entities (posts, videos, articles).

### Implementation

#### Comment Model (Polymorphic)
```typescript
import { Table, Column, Model, DataType, ForeignKey } from 'sequelize-typescript';

@Table({ tableName: 'comments' })
export class Comment extends Model<Comment> {
  @Column(DataType.TEXT)
  content: string;

  // Polymorphic foreign key
  @Column(DataType.INTEGER)
  commentableId: number;

  // Polymorphic type discriminator
  @Column(DataType.STRING)
  commentableType: string; // 'Post', 'Video', 'Article'

  // Note: Sequelize-TypeScript doesn't have built-in polymorphic support
  // You'll need to handle this manually or use a custom approach
}
```

### Alternative: Using Junction Tables (Recommended)

```typescript
// PostComment junction table
@Table({ tableName: 'post_comments' })
export class PostComment extends Model<PostComment> {
  @ForeignKey(() => Post)
  @Column(DataType.INTEGER)
  postId: number;

  @ForeignKey(() => Comment)
  @Column(DataType.INTEGER)
  commentId: number;

  @BelongsTo(() => Post, { foreignKey: 'postId', as: 'post' })
  post: Post;

  @BelongsTo(() => Comment, { foreignKey: 'commentId', as: 'comment' })
  comment: Comment;
}

// VideoComment junction table
@Table({ tableName: 'video_comments' })
export class VideoComment extends Model<VideoComment> {
  @ForeignKey(() => Video)
  @Column(DataType.INTEGER)
  videoId: number;

  @ForeignKey(() => Comment)
  @Column(DataType.INTEGER)
  commentId: number;

  @BelongsTo(() => Video, { foreignKey: 'videoId', as: 'video' })
  video: Video;

  @BelongsTo(() => Comment, { foreignKey: 'commentId', as: 'comment' })
  comment: Comment;
}
```

---

## Best Practices & Patterns

### 1. Always Use Arrow Functions in Decorators

```typescript
// ✅ CORRECT
@HasMany(() => Post, { foreignKey: 'userId', as: 'posts' })
@BelongsTo(() => User, { foreignKey: 'userId', as: 'user' })
@BelongsToMany(() => Role, { through: () => UserRole, ... })

// ❌ WRONG (Causes circular dependencies)
@HasMany(Post, { foreignKey: 'userId', as: 'posts' })
@BelongsTo(User, { foreignKey: 'userId', as: 'user' })
```

### 2. Use Descriptive Aliases

```typescript
// ✅ GOOD - Clear and descriptive
@BelongsTo(() => User, { foreignKey: 'authorId', as: 'author' })
@BelongsTo(() => User, { foreignKey: 'editorId', as: 'editor' })

// ❌ BAD - Ambiguous
@BelongsTo(() => User, { foreignKey: 'userId', as: 'user' })
```

### 3. Centralize Model Exports

```typescript
// models/index.ts
export { User } from './user.model';
export { Post } from './post.model';
export { Comment } from './comment.model';
export { Role } from './role.model';
export { UserRole } from './user-role.model';
```

### 4. Register Models Properly

```typescript
// database.module.ts
@Module({
  imports: [
    SequelizeModule.forRootAsync({...}),
    SequelizeModule.forFeature([User, Post, Comment, Role, UserRole]),
  ],
})
```

### 5. Use TypeScript Declare for Read-Only Fields

```typescript
@PrimaryKey
@AutoIncrement
@Column(DataType.INTEGER)
declare id: number; // ✅ Use 'declare' for auto-generated fields

@CreatedAt
declare createdAt: Date; // ✅ Use 'declare' for timestamps

@UpdatedAt
declare updatedAt: Date; // ✅ Use 'declare' for timestamps
```

### 6. Handle Optional Associations

```typescript
// Optional foreign key
@ForeignKey(() => User)
@Column({
  type: DataType.INTEGER,
  allowNull: true, // ✅ Optional association
})
userId: number;

@BelongsTo(() => User, { 
  foreignKey: 'userId', 
  as: 'user',
  required: false // ✅ Optional in queries
})
user?: User; // ✅ Optional type
```

### 7. Cascade Deletes

```typescript
// In migration
await queryInterface.createTable('posts', {
  userId: {
    type: Sequelize.INTEGER,
    references: {
      model: 'users',
      key: 'id',
    },
    onDelete: 'CASCADE', // ✅ Delete posts when user is deleted
    onUpdate: 'CASCADE',
  },
});
```

### 8. Eager Loading Best Practices

```typescript
// ✅ Load only what you need
const users = await User.findAll({
  include: [{
    model: Post,
    as: 'posts',
    where: { published: true }, // ✅ Filter included data
    required: false, // ✅ LEFT JOIN (include users without posts)
  }]
});

// ✅ Use attributes to limit fields
const users = await User.findAll({
  attributes: ['id', 'email'], // ✅ Only load needed fields
  include: [{
    model: Post,
    as: 'posts',
    attributes: ['id', 'title'], // ✅ Only load needed fields
  }]
});
```

---

## Association Cheat Sheet

| Scenario | Parent Model | Child Model | Junction Model |
|----------|--------------|-------------|----------------|
| **User ↔ Profile** | `@HasOne(() => Profile)` | `@BelongsTo(() => User)` | N/A |
| **User ↔ Posts** | `@HasMany(() => Post)` | `@BelongsTo(() => User)` | N/A |
| **User ↔ Roles** | `@BelongsToMany(() => Role, { through: () => UserRole })` | `@BelongsToMany(() => User, { through: () => UserRole })` | `@BelongsTo(() => User)`, `@BelongsTo(() => Role)` |
| **Category ↔ Category** | `@HasMany(() => Category, { foreignKey: 'parentId' })` | `@BelongsTo(() => Category, { foreignKey: 'parentId' })` | N/A |

---

## Common Pitfalls & Solutions

### ❌ Pitfall 1: Forgetting Arrow Functions
```typescript
@HasMany(Post, {...}) // ❌ Circular dependency!
```
**Solution:** Always use `() => Model`

### ❌ Pitfall 2: Direct Import in Through Model
```typescript
// In UserRole model
import { User, Role } from './index'; // ❌ Can cause issues
```
**Solution:** Import directly from model files, use arrow functions

### ❌ Pitfall 3: Missing Foreign Key Decorator
```typescript
@Column(DataType.INTEGER)
userId: number; // ❌ Missing @ForeignKey decorator
```
**Solution:** Always use `@ForeignKey(() => Model)`

### ❌ Pitfall 4: Wrong Association Direction
```typescript
// Post model
@HasMany(() => User, {...}) // ❌ Wrong! Post doesn't have many users
```
**Solution:** Think about the relationship: Post belongs to User, User has many Posts

---

## Summary

✅ **Always use arrow functions** `() => Model` in association decorators
✅ **Use descriptive aliases** (`as: 'author'` not `as: 'user'`)
✅ **Centralize exports** in `models/index.ts`
✅ **Register models** in `SequelizeModule.forFeature()`
✅ **Use `declare`** for auto-generated fields
✅ **Handle optional associations** with `allowNull: true` and `required: false`

This guide covers **all association patterns** you'll need for any domain model!

---

## Advanced Includes & Eager Loading

### Basic Include

```typescript
// Load user with posts
const user = await User.findByPk(1, {
  include: [{ model: Post, as: 'posts' }]
});

// Multiple includes
const user = await User.findByPk(1, {
  include: [
    { model: Post, as: 'posts' },
    { model: Comment, as: 'comments' },
    { model: Profile, as: 'profile' }
  ]
});
```

### Nested Includes (Multi-Level)

```typescript
// User → Posts → Comments → Author
const user = await User.findByPk(1, {
  include: [{
    model: Post,
    as: 'posts',
    include: [{
      model: Comment,
      as: 'comments',
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'name', 'email'] // Limit nested fields
      }]
    }]
  }]
});

// User → Roles → Permissions
const user = await User.findByPk(1, {
  include: [{
    model: Role,
    as: 'roles',
    include: [{
      model: Permission,
      as: 'permissions'
    }]
  }]
});
```

### Conditional Includes (Filtering)

#### ⚠️ IMPORTANT: Understanding `where` vs `required` in Includes

**Key Concept:**
- **`required: false`** = LEFT JOIN (returns ALL users, even without posts)
- **`required: true`** = INNER JOIN (returns ONLY users who have posts)
- **`where` in include** = Filters which posts to include, BUT can affect join behavior

#### ⚠️ WARNING: `where` Can Change Join Behavior

When you use `where` in an include, Sequelize may convert it to an INNER JOIN even with `required: false`:

```typescript
// ❌ PROBLEMATIC: This might exclude users without published posts!
const users = await User.findAll({
  include: [{
    model: Post,
    as: 'posts',
    where: { published: true }, // ⚠️ This can make it INNER JOIN!
    required: false // ⚠️ May be ignored when 'where' is present
  }]
});
// Result: Only users WITH published posts (INNER JOIN behavior)
```

#### ✅ CORRECT: Filter Posts After Join (Recommended)

```typescript
// ✅ CORRECT: Filter posts AFTER the join (true LEFT JOIN)
const user = await User.findByPk(1, {
  include: [{
    model: Post,
    as: 'posts',
    required: false, // ✅ LEFT JOIN - user returned even if no posts
    // Filter in JavaScript after loading
  }]
});

// Then filter in JavaScript
if (user.posts) {
  user.posts = user.posts.filter(post => post.published === true);
}
```

#### ✅ CORRECT: Use `on` for Join Conditions (Better)

```typescript
// ✅ CORRECT: Use 'on' for join conditions (doesn't affect join type)
const users = await User.findAll({
  include: [{
    model: Post,
    as: 'posts',
    on: {
      '$posts.published$': true // ✅ Filter in ON clause
    },
    required: false // ✅ LEFT JOIN - all users returned
  }]
});
```

#### ✅ CORRECT: Filter with `where` Only When You Want INNER JOIN

```typescript
// ✅ CORRECT: Use 'where' when you ONLY want users with published posts
const users = await User.findAll({
  include: [{
    model: Post,
    as: 'posts',
    where: { published: true }, // ✅ Filter posts
    required: true // ✅ INNER JOIN - only users WITH published posts
  }]
});
// Result: Only users who have at least one published post
```

#### Examples: Understanding the Difference

```typescript
// Scenario 1: Get ALL users, include only their published posts
const users = await User.findAll({
  include: [{
    model: Post,
    as: 'posts',
    on: { '$posts.published$': true }, // ✅ Filter in ON clause
    required: false // ✅ LEFT JOIN - ALL users returned
  }]
});
// Result: 
// - User 1 (has 2 published posts) → returns User 1 with 2 posts
// - User 2 (has 0 published posts) → returns User 2 with empty posts array
// - User 3 (has 1 published, 1 unpublished) → returns User 3 with 1 post

// Scenario 2: Get ONLY users who have published posts
const users = await User.findAll({
  include: [{
    model: Post,
    as: 'posts',
    where: { published: true }, // ✅ Filter posts
    required: true // ✅ INNER JOIN - only users WITH published posts
  }]
});
// Result:
// - User 1 (has 2 published posts) → returns User 1 with 2 posts
// - User 2 (has 0 published posts) → EXCLUDED (not returned)
// - User 3 (has 1 published, 1 unpublished) → returns User 3 with 1 post

// Scenario 3: Get ALL users, filter posts in application
const users = await User.findAll({
  include: [{
    model: Post,
    as: 'posts',
    required: false // ✅ LEFT JOIN - ALL users returned
  }]
});
// Then filter in JavaScript
users.forEach(user => {
  if (user.posts) {
    user.posts = user.posts.filter(post => post.published === true);
  }
});
```

#### Multiple Conditions

```typescript
// Filter posts with multiple conditions (using 'on')
const user = await User.findByPk(1, {
  include: [{
    model: Post,
    as: 'posts',
    on: {
      '$posts.published$': true,
      '$posts.createdAt$': {
        [Op.gte]: new Date('2024-01-01')
      }
    },
    required: false // ✅ LEFT JOIN - user returned even if no matching posts
  }]
});
```

### Include with Attributes (Field Selection)

```typescript
// Select specific fields from included model
const user = await User.findByPk(1, {
  attributes: ['id', 'email', 'name'], // ✅ User fields
  include: [{
    model: Post,
    as: 'posts',
    attributes: ['id', 'title', 'createdAt'], // ✅ Post fields only
    required: false
  }]
});

// Exclude fields
const user = await User.findByPk(1, {
  attributes: { exclude: ['password', 'token'] }, // ✅ Exclude sensitive fields
  include: [{
    model: Post,
    as: 'posts',
    attributes: { exclude: ['content'] } // ✅ Exclude large content field
  }]
});
```

### Include with Ordering

```typescript
// Order included data
const user = await User.findByPk(1, {
  include: [{
    model: Post,
    as: 'posts',
    order: [['createdAt', 'DESC']], // ✅ Order posts by date
    limit: 10 // ✅ Limit number of posts
  }]
});

// Multiple order criteria
const user = await User.findByPk(1, {
  include: [{
    model: Post,
    as: 'posts',
    order: [
      ['published', 'DESC'],
      ['createdAt', 'DESC']
    ],
    limit: 20
  }]
});
```

### Include with Separated Queries (Performance)

```typescript
// Use separate: true to run separate queries (better for large datasets)
const user = await User.findByPk(1, {
  include: [{
    model: Post,
    as: 'posts',
    separate: true, // ✅ Runs separate query
    limit: 10,
    order: [['createdAt', 'DESC']]
  }]
});
```

### Include with Subqueries

```typescript
// Count related records without loading them
const users = await User.findAll({
  attributes: {
    include: [
      [
        Sequelize.literal(`(
          SELECT COUNT(*)
          FROM posts
          WHERE posts.userId = User.id
        )`),
        'postsCount'
      ]
    ]
  }
});
```

### Include with Aggregations

```typescript
// Include with count
const users = await User.findAll({
  include: [{
    model: Post,
    as: 'posts',
    attributes: [], // ✅ Don't load post data
    required: false
  }],
  attributes: {
    include: [
      [Sequelize.fn('COUNT', Sequelize.col('posts.id')), 'postsCount']
    ]
  },
  group: ['User.id']
});
```

---

## ⚠️ CRITICAL: Using Generated/Aggregated Columns in Nested Includes

### The Problem

When you create computed/aggregated columns in a parent query and try to use them in nested includes or subsequent queries, MySQL 8+ has strict rules about referencing these columns.

**Common Issues:**
1. Can't reference computed columns directly in nested `where` clauses
2. Can't use computed columns from parent in child includes
3. MySQL 8+ requires proper subquery handling for computed columns

### Solution 1: Use Subqueries for Computed Columns in Nested Includes

```typescript
// ❌ PROBLEMATIC: Trying to use computed column in nested include
const users = await User.findAll({
  attributes: {
    include: [
      [Sequelize.fn('COUNT', Sequelize.col('posts.id')), 'postsCount']
    ]
  },
  include: [{
    model: Post,
    as: 'posts',
    include: [{
      model: Comment,
      as: 'comments',
      where: {
        // ❌ Can't reference 'postsCount' here - it doesn't exist yet!
        userId: Sequelize.col('User.postsCount') // ❌ ERROR
      }
    }]
  }],
  group: ['User.id']
});

// ✅ CORRECT: Use subquery in nested include
const users = await User.findAll({
  attributes: {
    include: [
      [Sequelize.fn('COUNT', Sequelize.col('posts.id')), 'postsCount']
    ]
  },
  include: [{
    model: Post,
    as: 'posts',
    include: [{
      model: Comment,
      as: 'comments',
      where: {
        // ✅ Use subquery to get postsCount
        userId: {
          [Op.in]: Sequelize.literal(`(
            SELECT userId FROM (
              SELECT userId, COUNT(*) as count
              FROM posts
              GROUP BY userId
            ) AS post_counts
            WHERE count > 5
          )`)
        }
      }
    }]
  }],
  group: ['User.id']
});
```

### Solution 2: Filter After Loading (Application Layer)

```typescript
// ✅ CORRECT: Compute in query, filter in application
const users = await User.findAll({
  attributes: {
    include: [
      [Sequelize.fn('COUNT', Sequelize.col('posts.id')), 'postsCount']
    ]
  },
  include: [{
    model: Post,
    as: 'posts',
    include: [{
      model: Comment,
      as: 'comments',
      required: false
    }]
  }],
  group: ['User.id']
});

// Filter in JavaScript using computed column
const filteredUsers = users
  .filter(user => {
    const postsCount = user.getDataValue('postsCount'); // ✅ Get computed value
    return postsCount > 5;
  })
  .map(user => {
    // Filter nested comments based on parent's postsCount
    if (user.posts) {
      user.posts = user.posts.map(post => {
        if (post.comments) {
          const postsCount = user.getDataValue('postsCount');
          post.comments = post.comments.filter(comment => {
            // Use computed column value in filter
            return postsCount > 5 && comment.userId === user.id;
          });
        }
        return post;
      });
    }
    return user;
  });
```

### Solution 3: Use CTE (Common Table Expression) for Complex Cases

```typescript
// ✅ CORRECT: Use CTE for complex computed columns (MySQL 8.0+)
const users = await sequelize.query(`
  WITH user_post_counts AS (
    SELECT 
      u.id,
      u.email,
      COUNT(p.id) as postsCount
    FROM users u
    LEFT JOIN posts p ON p.userId = u.id
    GROUP BY u.id, u.email
  )
  SELECT 
    upc.*,
    p.id as post_id,
    p.title,
    c.id as comment_id,
    c.content
  FROM user_post_counts upc
  LEFT JOIN posts p ON p.userId = upc.id AND upc.postsCount > 5
  LEFT JOIN comments c ON c.postId = p.id
  WHERE upc.postsCount > 5
  ORDER BY upc.postsCount DESC
`, {
  type: QueryTypes.SELECT,
  nest: true // ✅ Nest results by association
});
```

### Solution 4: Separate Queries for Computed Columns

```typescript
// ✅ CORRECT: Compute first, then use in subsequent query
// Step 1: Get users with post counts
const usersWithCounts = await User.findAll({
  attributes: {
    include: [
      [Sequelize.fn('COUNT', Sequelize.col('posts.id')), 'postsCount']
    ]
  },
  include: [{
    model: Post,
    as: 'posts',
    attributes: [],
    required: false
  }],
  group: ['User.id'],
  having: Sequelize.where(
    Sequelize.fn('COUNT', Sequelize.col('posts.id')),
    { [Op.gt]: 5 }
  )
});

// Step 2: Extract user IDs with high post counts
const userIds = usersWithCounts.map(u => u.id);

// Step 3: Load full data with nested includes for those users
const users = await User.findAll({
  where: {
    id: { [Op.in]: userIds } // ✅ Use computed result
  },
  include: [{
    model: Post,
    as: 'posts',
    include: [{
      model: Comment,
      as: 'comments',
      where: {
        // ✅ Now we can filter based on the computed column
        userId: { [Op.in]: userIds }
      }
    }]
  }]
});
```

### Solution 5: Using Computed Columns in Parent WHERE Clauses

```typescript
// ❌ PROBLEMATIC: Can't use computed column directly in WHERE
const users = await User.findAll({
  attributes: {
    include: [
      [Sequelize.fn('COUNT', Sequelize.col('posts.id')), 'postsCount']
    ]
  },
  where: {
    postsCount: { [Op.gt]: 5 } // ❌ ERROR: postsCount doesn't exist in WHERE
  },
  include: [{
    model: Post,
    as: 'posts',
    attributes: []
  }],
  group: ['User.id']
});

// ✅ CORRECT: Use HAVING for computed columns
const users = await User.findAll({
  attributes: {
    include: [
      [Sequelize.fn('COUNT', Sequelize.col('posts.id')), 'postsCount']
    ]
  },
  include: [{
    model: Post,
    as: 'posts',
    attributes: [],
    required: false
  }],
  group: ['User.id'],
  having: Sequelize.where(
    Sequelize.fn('COUNT', Sequelize.col('posts.id')),
    { [Op.gt]: 5 } // ✅ Use HAVING instead of WHERE
  )
});

// ✅ ALTERNATIVE: Use subquery in WHERE
const users = await User.findAll({
  where: Sequelize.where(
    Sequelize.literal(`(
      SELECT COUNT(*) FROM posts WHERE posts.userId = User.id
    )`),
    { [Op.gt]: 5 }
  ),
  include: [{
    model: Post,
    as: 'posts'
  }]
});
```

### Solution 6: Referencing Parent Computed Columns in Nested Includes

```typescript
// ✅ CORRECT: Use subquery to reference parent computed column
const users = await User.findAll({
  attributes: {
    include: [
      [Sequelize.fn('COUNT', Sequelize.col('posts.id')), 'postsCount'],
      [Sequelize.fn('SUM', Sequelize.col('posts.likes')), 'totalLikes']
    ]
  },
  include: [{
    model: Post,
    as: 'posts',
    attributes: [],
    required: false
  }, {
    model: Comment,
    as: 'comments',
    where: Sequelize.where(
      Sequelize.literal(`(
        SELECT COUNT(*) FROM posts WHERE posts.userId = User.id
      )`),
      { [Op.gt]: 5 } // ✅ Reference computed column via subquery
    ),
    required: false
  }],
  group: ['User.id']
});
```

#### 📖 Detailed Explanation

**What This Query Does:**
1. **Computes aggregated columns** for each user (`postsCount` and `totalLikes`)
2. **Includes Posts** (but doesn't load post data, just for counting/aggregation)
3. **Includes Comments** but only for users who have more than 5 posts
4. **Groups by User.id** to aggregate the counts

**Breaking Down Each Part:**

**PART 1: Computing Aggregated Columns**
```typescript
attributes: {
  include: [
    [Sequelize.fn('COUNT', Sequelize.col('posts.id')), 'postsCount'],
    // ↑ Counts how many posts each user has
    // Example: User 1 → postsCount: 10, User 2 → postsCount: 3
    
    [Sequelize.fn('SUM', Sequelize.col('posts.likes')), 'totalLikes']
    // ↑ Sums up all likes from all posts for each user
    // Example: User 1 → totalLikes: 150, User 2 → totalLikes: 45
  ]
}
```
**What happens:** For each user, Sequelize counts their posts and sums their post likes. These are **computed during query execution**, not stored in the database.

**PART 2: Including Posts (For Aggregation Only)**
```typescript
include: [{
  model: Post,
  as: 'posts',
  attributes: [], // ✅ Empty = don't load post data, just use for COUNT/SUM
  required: false // ✅ LEFT JOIN - include users even without posts
}]
```
**What happens:** 
- `attributes: []` means "don't load post fields, just use the join for aggregation"
- `required: false` means LEFT JOIN (all users returned, even if they have 0 posts)
- This join is needed so `COUNT(posts.id)` and `SUM(posts.likes)` can work

**PART 3: Including Comments (Filtered by postsCount)**
```typescript
include: [{
  model: Comment,
  as: 'comments',
  where: Sequelize.where(
    Sequelize.literal(`(
      SELECT COUNT(*) FROM posts WHERE posts.userId = User.id
    )`),
    { [Op.gt]: 5 } // ✅ Only include comments for users with > 5 posts
  ),
  required: false // ✅ LEFT JOIN - include users even without comments
}]
```
**What happens:**
- We want to include comments, but **only for users who have more than 5 posts**
- The `where` clause filters which comments to include
- `required: false` means LEFT JOIN (users without comments are still returned)

**PART 4: Grouping**
```typescript
group: ['User.id']
```
**What happens:** Required when using aggregations (COUNT, SUM). Groups results by user so aggregations work correctly.

#### ⚠️ Why Use a Subquery Instead of Direct Reference?

**The Problem:**
```typescript
// ❌ THIS DOESN'T WORK:
where: {
  postsCount: { [Op.gt]: 5 } // ❌ ERROR: postsCount doesn't exist yet!
}
```

**Why It Fails:**
1. `postsCount` is computed in the SELECT clause
2. MySQL evaluates WHERE clauses **before** SELECT aggregations
3. At WHERE evaluation time, `postsCount` doesn't exist yet
4. You can't reference a computed column that hasn't been computed yet

**The Solution:**
```typescript
where: Sequelize.where(
  Sequelize.literal(`(
    SELECT COUNT(*) FROM posts WHERE posts.userId = User.id
  )`),
  { [Op.gt]: 5 }
)
```

**Why This Works:**
- The subquery **recomputes** the count independently in the WHERE clause
- It runs **before** the main SELECT aggregation
- MySQL can evaluate this subquery and use it to filter comments
- Even though it's redundant (we're counting posts twice), it's necessary

#### 🔍 Generated SQL (Conceptual)

```sql
SELECT 
  User.id,
  User.email,
  COUNT(posts.id) as postsCount,     -- Computed here
  SUM(posts.likes) as totalLikes      -- Computed here
FROM users User
LEFT JOIN posts ON posts.userId = User.id
LEFT JOIN comments ON comments.userId = User.id 
  AND (
    SELECT COUNT(*) 
    FROM posts 
    WHERE posts.userId = User.id
  ) > 5  -- ✅ Subquery filters comments
GROUP BY User.id
```

#### 📊 Example Results

```javascript
[
  {
    id: 1,
    email: 'user1@example.com',
    postsCount: 10,        // ✅ Computed: COUNT(posts.id)
    totalLikes: 150,       // ✅ Computed: SUM(posts.likes)
    comments: [            // ✅ Included because subquery returned > 5
      { id: 1, content: 'Great post!' },
      { id: 2, content: 'Nice work!' }
    ]
  },
  {
    id: 2,
    email: 'user2@example.com',
    postsCount: 3,         // ✅ Computed: COUNT(posts.id)
    totalLikes: 45,         // ✅ Computed: SUM(posts.likes)
    comments: []           // ✅ Empty because subquery returned <= 5
  },
  {
    id: 3,
    email: 'user3@example.com',
    postsCount: 8,         // ✅ Computed: COUNT(posts.id)
    totalLikes: 120,       // ✅ Computed: SUM(posts.likes)
    comments: [            // ✅ Included because subquery returned > 5
      { id: 5, content: 'Awesome!' }
    ]
  }
]
```

#### 🎯 Key Takeaways

1. **`attributes: []`** in Posts include = Don't load post data, just use for aggregation
2. **Subquery in WHERE** = Recomputes the count to filter Comments (can't reference computed column directly)
3. **`required: false`** = LEFT JOIN (all users returned, even without posts/comments)
4. **`group: ['User.id']`** = Required when using COUNT/SUM aggregations
5. **Subquery pattern** = Workaround for referencing computed columns in nested includes
6. **Performance note**: The subquery runs for each row, so it's not the most efficient. Consider Solution 4 (separate queries) for better performance with large datasets.

### Solution 7: Using Generated Columns in Application Layer Then Querying

```typescript
// ✅ CORRECT: Compute → Filter → Query pattern
async function getUsersWithHighPostCount() {
  // Step 1: Compute aggregated columns
  const usersWithStats = await User.findAll({
    attributes: {
      include: [
        [Sequelize.fn('COUNT', Sequelize.col('posts.id')), 'postsCount'],
        [Sequelize.fn('AVG', Sequelize.col('posts.rating')), 'avgRating']
      ]
    },
    include: [{
      model: Post,
      as: 'posts',
      attributes: [],
      required: false
    }],
    group: ['User.id']
  });

  // Step 2: Filter based on computed columns
  const highPostUsers = usersWithStats.filter(user => {
    const postsCount = user.getDataValue('postsCount');
    const avgRating = user.getDataValue('avgRating');
    return postsCount > 10 && avgRating > 4.0;
  });

  // Step 3: Get IDs of filtered users
  const userIds = highPostUsers.map(u => u.id);

  // Step 4: Load full nested data for filtered users
  const users = await User.findAll({
    where: { id: { [Op.in]: userIds } },
    include: [{
      model: Post,
      as: 'posts',
      include: [{
        model: Comment,
        as: 'comments',
        include: [{
          model: User,
          as: 'author'
        }]
      }]
    }]
  });

  // Step 5: Attach computed values back
  return users.map(user => {
    const stats = highPostUsers.find(s => s.id === user.id);
    return {
      ...user.toJSON(),
      postsCount: stats?.getDataValue('postsCount'),
      avgRating: stats?.getDataValue('avgRating')
    };
  });
}
```

### MySQL 8+ Specific: Window Functions in Nested Includes

```typescript
// ✅ CORRECT: Use window functions for computed columns (MySQL 8.0+)
const users = await sequelize.query(`
  SELECT 
    u.id,
    u.email,
    COUNT(p.id) OVER (PARTITION BY u.id) as postsCount,
    AVG(p.rating) OVER (PARTITION BY u.id) as avgRating,
    p.id as post_id,
    p.title,
    c.id as comment_id,
    c.content
  FROM users u
  LEFT JOIN posts p ON p.userId = u.id
  LEFT JOIN comments c ON c.postId = p.id
  WHERE COUNT(p.id) OVER (PARTITION BY u.id) > 5
`, {
  type: QueryTypes.SELECT,
  nest: true
});

// ⚠️ Note: Window functions can't be used directly in WHERE
// Use CTE or subquery instead
const users = await sequelize.query(`
  WITH user_stats AS (
    SELECT 
      u.id,
      u.email,
      COUNT(p.id) OVER (PARTITION BY u.id) as postsCount,
      AVG(p.rating) OVER (PARTITION BY u.id) as avgRating
    FROM users u
    LEFT JOIN posts p ON p.userId = u.id
  )
  SELECT 
    us.*,
    p.id as post_id,
    p.title,
    c.id as comment_id,
    c.content
  FROM user_stats us
  LEFT JOIN posts p ON p.userId = us.id
  LEFT JOIN comments c ON c.postId = p.id
  WHERE us.postsCount > 5 AND us.avgRating > 4.0
`, {
  type: QueryTypes.SELECT,
  nest: true
});
```

### Best Practices Summary

1. **Use HAVING instead of WHERE** for aggregated columns
2. **Use subqueries** when referencing computed columns in nested includes
3. **Filter in application layer** after computing aggregated columns
4. **Use CTEs** for complex computed column scenarios (MySQL 8.0+)
5. **Separate queries** when computed columns are needed in multiple places
6. **Use window functions** for efficient computed columns (MySQL 8.0+)
7. **Get computed values** using `getDataValue()` in application layer

### Common Pitfalls

```typescript
// ❌ PITFALL 1: Using computed column in WHERE
where: { postsCount: { [Op.gt]: 5 } } // ❌ Use HAVING instead

// ❌ PITFALL 2: Referencing computed column in nested where
include: [{
  model: Post,
  where: { userId: Sequelize.col('User.postsCount') } // ❌ Doesn't exist
}]

// ❌ PITFALL 3: Using computed column before it's computed
attributes: ['postsCount'], // ❌ postsCount doesn't exist yet
include: [{ model: Post, where: { count: Sequelize.col('postsCount') } }]

// ✅ CORRECT: Use subquery or filter after
```

### Dynamic Includes (Conditional)

```typescript
// Build includes conditionally
const buildIncludes = (includePosts: boolean, includeComments: boolean) => {
  const includes: any[] = [];
  
  if (includePosts) {
    includes.push({
      model: Post,
      as: 'posts',
      required: false
    });
  }
  
  if (includeComments) {
    includes.push({
      model: Comment,
      as: 'comments',
      required: false
    });
  }
  
  return includes;
};

const user = await User.findByPk(1, {
  include: buildIncludes(true, false)
});
```

### Include with Raw SQL

```typescript
// Include with custom SQL
const user = await User.findByPk(1, {
  include: [{
    model: Post,
    as: 'posts',
    where: Sequelize.literal('posts.createdAt > DATE_SUB(NOW(), INTERVAL 7 DAY)')
  }]
});
```

---

## ⚠️ CRITICAL: Using `$` Syntax with Aliases

### Understanding the `$` Prefix

The `$` prefix is used to reference **aliased columns** in Sequelize queries, especially in:
- `on` clauses (join conditions)
- `where` clauses (filtering)
- Nested includes
- Junction table references

**Key Rule:** Use `$alias.column$` when referencing columns from included models!

### Why `$` Syntax is Needed

When you use aliases (`as: 'posts'`), Sequelize needs a way to distinguish between:
- Columns from the primary table (`User.email`)
- Columns from included tables (`posts.title`)

The `$` syntax tells Sequelize: "This is a column from an aliased/included table."

### Basic `$` Syntax Patterns

#### Pattern 1: Single-Level Include

```typescript
// ✅ CORRECT: Use $alias.column$ in 'on' clause
const users = await User.findAll({
  include: [{
    model: Post,
    as: 'posts',
    on: {
      '$posts.published$': true // ✅ $posts = alias, published = column
    },
    required: false
  }]
});

// ❌ WRONG: Without $ syntax (won't work with aliases)
const users = await User.findAll({
  include: [{
    model: Post,
    as: 'posts',
    on: {
      'published': true // ❌ Sequelize doesn't know which table!
    },
    required: false
  }]
});
```

#### Pattern 2: Nested Includes (Multi-Level)

```typescript
// ✅ CORRECT: Use $alias.column$ for nested includes
const users = await User.findAll({
  include: [{
    model: Post,
    as: 'posts',
    required: false,
    include: [{
      model: Comment,
      as: 'comments',
      on: {
        '$comments.approved$': true, // ✅ $comments = nested alias
        '$posts.published$': true     // ✅ Can reference parent alias too
      },
      required: false
    }]
  }]
});
```

#### Pattern 3: Junction Table References

```typescript
// ✅ CORRECT: Reference junction table columns with $
const users = await User.findAll({
  include: [{
    model: Role,
    as: 'roles',
    through: {
      attributes: ['assignedAt', 'assignedBy'],
      where: {
        '$user_roles.assignedAt$': { // ✅ $user_roles = junction table alias
          [Op.gte]: new Date('2024-01-01')
        }
      }
    },
    required: false
  }]
});
```

### Common `$` Syntax Patterns

#### 1. Filtering in `on` Clause (Preserves LEFT JOIN)

```typescript
// ✅ CORRECT: Filter posts by published status
const users = await User.findAll({
  include: [{
    model: Post,
    as: 'posts',
    on: {
      '$posts.published$': true,           // ✅ Boolean
      '$posts.createdAt$': {                // ✅ With operators
        [Op.gte]: new Date('2024-01-01')
      },
      '$posts.userId$': Sequelize.col('User.id') // ✅ Column reference
    },
    required: false // ✅ LEFT JOIN preserved
  }]
});
```

#### 2. Filtering in `where` Clause (Becomes INNER JOIN)

```typescript
// ✅ CORRECT: Use $ syntax in where (but note: becomes INNER JOIN)
const users = await User.findAll({
  include: [{
    model: Post,
    as: 'posts',
    where: {
      '$posts.published$': true, // ✅ Still need $ syntax
      '$posts.title$': {
        [Op.like]: '%tutorial%'
      }
    },
    required: true // ✅ INNER JOIN - only users WITH matching posts
  }]
});
```

#### 3. Ordering by Included Table Columns

```typescript
// ✅ CORRECT: Order by included table column
const users = await User.findAll({
  include: [{
    model: Post,
    as: 'posts',
    required: false
  }],
  order: [
    ['email', 'ASC'],                    // ✅ Primary table column
    [{ model: Post, as: 'posts' }, 'createdAt', 'DESC'] // ✅ Included table column
  ]
});

// Alternative: Order within include
const users = await User.findAll({
  include: [{
    model: Post,
    as: 'posts',
    order: [['createdAt', 'DESC']], // ✅ Order posts
    required: false
  }]
});
```

#### 4. Nested `$` References (Deep Includes)

```typescript
// ✅ CORRECT: Deep nesting with $ syntax
const users = await User.findAll({
  include: [{
    model: Post,
    as: 'posts',
    required: false,
    include: [{
      model: Comment,
      as: 'comments',
      on: {
        '$comments.approved$': true,        // ✅ Level 2 alias
        '$posts.published$': true            // ✅ Level 1 alias (parent)
      },
      include: [{
        model: User,
        as: 'author',
        on: {
          '$author.isActive$': true          // ✅ Level 3 alias
        },
        required: false
      }]
    }]
  }]
});
```

#### 5. Junction Table with `$` Syntax

```typescript
// ✅ CORRECT: Reference junction table columns
const users = await User.findAll({
  include: [{
    model: Role,
    as: 'roles',
    through: {
      attributes: ['assignedAt', 'assignedBy', 'reason'],
      where: {
        '$user_roles.assignedAt$': {        // ✅ Junction table reference
          [Op.gte]: new Date('2024-01-01')
        },
        '$user_roles.assignedBy$': {
          [Op.ne]: null
        }
      }
    },
    on: {
      '$roles.isActive$': true               // ✅ Role table reference
    },
    required: false
  }]
});
```

### Common Errors & Solutions

#### ❌ Error 1: Missing `$` Prefix

```typescript
// ❌ WRONG: Missing $ prefix
const users = await User.findAll({
  include: [{
    model: Post,
    as: 'posts',
    on: {
      'published': true // ❌ Error: Column 'published' is ambiguous
    }
  }]
});

// ✅ CORRECT: Use $ prefix
const users = await User.findAll({
  include: [{
    model: Post,
    as: 'posts',
    on: {
      '$posts.published$': true // ✅ Clear reference to posts.published
    }
  }]
});
```

#### ❌ Error 2: Wrong Alias Name

```typescript
// ❌ WRONG: Alias doesn't match
const users = await User.findAll({
  include: [{
    model: Post,
    as: 'posts', // ✅ Alias is 'posts'
    on: {
      '$post.published$': true // ❌ Wrong: 'post' instead of 'posts'
    }
  }]
});

// ✅ CORRECT: Match alias exactly
const users = await User.findAll({
  include: [{
    model: Post,
    as: 'posts', // ✅ Alias
    on: {
      '$posts.published$': true // ✅ Matches alias
    }
  }]
});
```

#### ❌ Error 3: Missing `$` at End

```typescript
// ❌ WRONG: Missing closing $
const users = await User.findAll({
  include: [{
    model: Post,
    as: 'posts',
    on: {
      '$posts.published': true // ❌ Missing closing $
    }
  }]
});

// ✅ CORRECT: Both $ symbols required
const users = await User.findAll({
  include: [{
    model: Post,
    as: 'posts',
    on: {
      '$posts.published$': true // ✅ Both $ symbols
    }
  }]
});
```

#### ❌ Error 4: Wrong Junction Table Alias

```typescript
// ❌ WRONG: Wrong junction table alias
const users = await User.findAll({
  include: [{
    model: Role,
    as: 'roles',
    through: {
      where: {
        '$UserRole.assignedAt$': { // ❌ Wrong alias
          [Op.gte]: new Date()
        }
      }
    }
  }]
});

// ✅ CORRECT: Use table name (lowercase, snake_case)
const users = await User.findAll({
  include: [{
    model: Role,
    as: 'roles',
    through: {
      where: {
        '$user_roles.assignedAt$': { // ✅ Table name: user_roles
          [Op.gte]: new Date()
        }
      }
    }
  }]
});
```

#### ❌ Error 5: Nested Alias Reference Error

```typescript
// ❌ WRONG: Can't reference nested alias from parent level
const users = await User.findAll({
  include: [{
    model: Post,
    as: 'posts',
    on: {
      '$comments.approved$': true // ❌ 'comments' not available at this level
    },
    include: [{
      model: Comment,
      as: 'comments'
    }]
  }]
});

// ✅ CORRECT: Reference nested alias in nested include
const users = await User.findAll({
  include: [{
    model: Post,
    as: 'posts',
    required: false,
    include: [{
      model: Comment,
      as: 'comments',
      on: {
        '$comments.approved$': true // ✅ Correct level
      },
      required: false
    }]
  }]
});
```

### `$` Syntax Cheat Sheet

| Scenario | Syntax | Example |
|----------|--------|---------|
| **Single include** | `$alias.column$` | `$posts.published$` |
| **Nested include** | `$nestedAlias.column$` | `$comments.approved$` |
| **Junction table** | `$tableName.column$` | `$user_roles.assignedAt$` |
| **Parent reference** | `$parentAlias.column$` | `$posts.published$` (from comments level) |
| **With operators** | `$alias.column$: { [Op.gte]: value }` | `$posts.createdAt$: { [Op.gte]: date }` |
| **Column reference** | `$alias.column$: Sequelize.col(...)` | `$posts.userId$: Sequelize.col('User.id')` |

### Best Practices

#### ✅ DO: Always Use `$` with Aliases

```typescript
// ✅ CORRECT: Always use $ when referencing aliased columns
on: {
  '$posts.published$': true,
  '$posts.createdAt$': { [Op.gte]: date }
}
```

#### ✅ DO: Match Alias Names Exactly

```typescript
// ✅ CORRECT: Alias matches $ reference
include: [{
  model: Post,
  as: 'posts',        // ✅ Alias
  on: {
    '$posts.published$': true // ✅ Matches alias
  }
}]
```

#### ✅ DO: Use Table Name for Junction Tables

```typescript
// ✅ CORRECT: Use actual table name (snake_case)
through: {
  where: {
    '$user_roles.assignedAt$': { [Op.gte]: date }
  }
}
```

#### ❌ DON'T: Use `$` for Primary Table Columns

```typescript
// ❌ WRONG: Don't use $ for primary table
where: {
  '$User.email$': 'test@example.com' // ❌ Unnecessary
}

// ✅ CORRECT: Direct reference for primary table
where: {
  email: 'test@example.com' // ✅ Simple reference
}
```

#### ❌ DON'T: Mix `$` Syntax with Direct Column Names

```typescript
// ❌ WRONG: Inconsistent
on: {
  '$posts.published$': true,
  'createdAt': { [Op.gte]: date } // ❌ Missing $ syntax
}

// ✅ CORRECT: Consistent $ syntax
on: {
  '$posts.published$': true,
  '$posts.createdAt$': { [Op.gte]: date } // ✅ Both use $
}
```

### Real-World Examples

#### Example 1: User with Active Roles Only

```typescript
const users = await User.findAll({
  include: [{
    model: Role,
    as: 'roles',
    on: {
      '$roles.isActive$': true // ✅ Filter active roles
    },
    through: {
      attributes: ['assignedAt'],
      where: {
        '$user_roles.assignedAt$': { // ✅ Filter recent assignments
          [Op.gte]: new Date('2024-01-01')
        }
      }
    },
    required: false // ✅ LEFT JOIN - all users returned
  }]
});
```

#### Example 2: Posts with Approved Comments Only

```typescript
const posts = await Post.findAll({
  include: [{
    model: Comment,
    as: 'comments',
    on: {
      '$comments.approved$': true,        // ✅ Only approved comments
      '$comments.createdAt$': {            // ✅ Recent comments
        [Op.gte]: new Date('2024-01-01')
      }
    },
    include: [{
      model: User,
      as: 'author',
      on: {
        '$author.isActive$': true          // ✅ Only active authors
      },
      required: false
    }],
    required: false
  }]
});
```

#### Example 3: Complex Nested Query

```typescript
const users = await User.findAll({
  where: {
    isActive: true // ✅ Primary table - no $ needed
  },
  include: [{
    model: Post,
    as: 'posts',
    on: {
      '$posts.published$': true,           // ✅ Level 1: posts
      '$posts.createdAt$': { [Op.gte]: date }
    },
    include: [{
      model: Comment,
      as: 'comments',
      on: {
        '$comments.approved$': true,       // ✅ Level 2: comments
        '$posts.published$': true           // ✅ Can reference parent
      },
      include: [{
        model: User,
        as: 'author',
        on: {
          '$author.isActive$': true         // ✅ Level 3: author
        },
        required: false
      }],
      required: false
    }],
    required: false
  }]
});
```

### Summary: `$` Syntax Rules

✅ **Always use `$alias.column$`** when referencing columns from included models
✅ **Match alias names exactly** (`as: 'posts'` → `$posts.column$`)
✅ **Use table name for junction tables** (`$user_roles.column$`)
✅ **Both `$` symbols required** (opening and closing)
✅ **Reference parent aliases** from nested includes
❌ **Don't use `$`** for primary table columns
❌ **Don't mix** `$` syntax with direct column names in same clause

**Remember:** The `$` syntax is your friend when working with aliases - it prevents ambiguous column errors and makes your queries explicit and clear!

---

## Join Types (LEFT, RIGHT, INNER, FULL, CROSS, SELF)

### ⚠️ CRITICAL: Understanding `required` Flag

**Simple Rule:**
- **`required: false`** = **LEFT JOIN** (returns ALL rows from left/primary table)
- **`required: true`** = **INNER JOIN** (returns ONLY matching rows from both tables)

**Remember:** `required: false` means the included table is NOT required, so ALL rows from the primary table are returned!

### Understanding Join Types

| Join Type | Sequelize Option | Behavior | Use Case |
|-----------|------------------|----------|----------|
| **INNER JOIN** | `required: true` (default) | Only matching records | Get users who have posts |
| **LEFT JOIN** | `required: false` | All left + matching right | Get all users, include posts if exist |
| **RIGHT JOIN** | Not directly supported | All right + matching left | Use reverse include |
| **FULL OUTER JOIN** | Not directly supported | All records from both | Use UNION query |
| **CROSS JOIN** | Not directly supported | Cartesian product | Use raw query |
| **SELF JOIN** | Self-referencing model | Join table to itself | Categories with parents |

### Quick Reference

```typescript
// LEFT JOIN: Get ALL users, include posts if they exist
required: false  // ✅ LEFT JOIN - "posts are NOT required"

// INNER JOIN: Get ONLY users who have posts
required: true   // ✅ INNER JOIN - "posts ARE required"
```

### INNER JOIN (`required: true` - Default)

```typescript
// Only users who have posts (INNER JOIN)
const users = await User.findAll({
  include: [{
    model: Post,
    as: 'posts',
    required: true // ✅ INNER JOIN - "posts ARE required"
  }]
});

// Equivalent SQL:
// SELECT * FROM users
// INNER JOIN posts ON posts.userId = users.id

// Result:
// - User 1 (has posts) → ✅ Returned
// - User 2 (no posts) → ❌ NOT returned
```

### LEFT JOIN (`required: false`)

```typescript
// All users, include posts if they exist (LEFT JOIN)
const users = await User.findAll({
  include: [{
    model: Post,
    as: 'posts',
    required: false // ✅ LEFT JOIN - "posts are NOT required"
  }]
});

// Equivalent SQL:
// SELECT * FROM users
// LEFT JOIN posts ON posts.userId = users.id

// Result:
// - User 1 (has posts) → ✅ Returned with posts
// - User 2 (no posts) → ✅ Returned with empty posts array
```

### Memory Trick

Think of `required` as asking: "Is the included table REQUIRED for the result?"
- `required: false` = "No, posts are NOT required" → LEFT JOIN (all users returned)
- `required: true` = "Yes, posts ARE required" → INNER JOIN (only users with posts)

### Multiple Joins (Complex Queries)

```typescript
// User → Posts (LEFT) → Comments (LEFT)
const users = await User.findAll({
  include: [{
    model: Post,
    as: 'posts',
    required: false, // ✅ LEFT JOIN
    include: [{
      model: Comment,
      as: 'comments',
      required: false // ✅ LEFT JOIN
    }]
  }]
});
```

### RIGHT JOIN (Workaround)

```typescript
// RIGHT JOIN: Get all posts, include users if exist
// Workaround: Reverse the include direction
const posts = await Post.findAll({
  include: [{
    model: User,
    as: 'author',
    required: false // ✅ LEFT JOIN from Post perspective = RIGHT JOIN from User perspective
  }]
});

// Or use raw query
const users = await sequelize.query(`
  SELECT users.*, posts.*
  FROM posts
  RIGHT JOIN users ON posts.userId = users.id
`, { type: QueryTypes.SELECT });
```

### FULL OUTER JOIN (Workaround)

```typescript
// FULL OUTER JOIN: All users and all posts
// Workaround: Use UNION
const result = await sequelize.query(`
  SELECT users.*, posts.*
  FROM users
  LEFT JOIN posts ON posts.userId = users.id
  UNION
  SELECT users.*, posts.*
  FROM posts
  LEFT JOIN users ON posts.userId = users.id
`, { type: QueryTypes.SELECT });
```

### CROSS JOIN (Cartesian Product)

```typescript
// CROSS JOIN: Every user with every role (cartesian product)
const result = await sequelize.query(`
  SELECT users.*, roles.*
  FROM users
  CROSS JOIN roles
`, { type: QueryTypes.SELECT });

// Or use raw query with Sequelize
const users = await User.findAll({
  include: [{
    model: Role,
    as: 'roles',
    required: false,
    where: {} // Empty where creates CROSS JOIN effect
  }]
});
```

### SELF JOIN (Self-Referencing)

```typescript
// SELF JOIN: Categories with parent categories
const categories = await Category.findAll({
  include: [{
    model: Category,
    as: 'parent', // ✅ Self-referencing association
    required: false // ✅ LEFT JOIN
  }]
});

// Multiple self-joins
const categories = await Category.findAll({
  include: [
    {
      model: Category,
      as: 'parent',
      required: false
    },
    {
      model: Category,
      as: 'children',
      required: false
    }
  ]
});
```

### Join with Conditions

#### Understanding `on` vs `where` in Joins

**Key Difference:**
- **`on`**: Conditions in the JOIN clause (doesn't affect join type)
- **`where`**: Conditions in the WHERE clause (can convert to INNER JOIN)

```typescript
// ✅ CORRECT: Use 'on' for join conditions (preserves LEFT JOIN)
const users = await User.findAll({
  include: [{
    model: Post,
    as: 'posts',
    on: {
      // ✅ Additional join conditions in ON clause
      '$posts.published$': true,
      '$posts.createdAt$': {
        [Op.gte]: new Date('2024-01-01')
      }
    },
    required: false // ✅ LEFT JOIN - ALL users returned
  }]
});
// Result: ALL users, but only published posts from 2024+ are included

// ⚠️ WARNING: Using 'where' can convert to INNER JOIN
const users = await User.findAll({
  include: [{
    model: Post,
    as: 'posts',
    where: { // ⚠️ This moves condition to WHERE clause
      published: true
    },
    required: false // ⚠️ May be ignored!
  }]
});
// Result: Only users WITH published posts (INNER JOIN behavior)
```

#### Visual Explanation

```typescript
// LEFT JOIN with 'on' (what you want)
// SQL: SELECT * FROM users LEFT JOIN posts ON posts.userId = users.id AND posts.published = true
// Result: ALL users, posts filtered by published=true

// INNER JOIN with 'where' (what happens with 'where')
// SQL: SELECT * FROM users INNER JOIN posts ON posts.userId = users.id WHERE posts.published = true
// Result: ONLY users who have published posts
```

### Join Performance Tips

```typescript
// ✅ Use separate: true for large datasets
const users = await User.findAll({
  include: [{
    model: Post,
    as: 'posts',
    separate: true, // ✅ Runs separate query (faster for large datasets)
    limit: 10
  }]
});

// ✅ Use attributes to limit fields
const users = await User.findAll({
  attributes: ['id', 'email'], // ✅ Only needed fields
  include: [{
    model: Post,
    as: 'posts',
    attributes: ['id', 'title'], // ✅ Only needed fields
    required: false
  }]
});

// ✅ Use indexes on foreign keys
// Ensure userId has index in posts table for faster joins
```

---

## Date Handling

### Date Column Types

```typescript
import { DataType } from 'sequelize-typescript';

@Table({ tableName: 'events' })
export class Event extends Model<Event> {
  // DATE - Date only (YYYY-MM-DD)
  @Column({
    type: DataType.DATEONLY,
    allowNull: false
  })
  eventDate: Date;

  // DATETIME - Date and time (YYYY-MM-DD HH:mm:ss)
  @Column({
    type: DataType.DATE,
    allowNull: false
  })
  startTime: Date;

  // TIMESTAMP - Auto-updated timestamp
  @Column({
    type: DataType.DATE,
    defaultValue: DataType.NOW
  })
  createdAt: Date;

  // TIME - Time only (HH:mm:ss)
  @Column({
    type: DataType.TIME,
    allowNull: true
  })
  duration: Date;
}
```

### Date Queries

```typescript
import { Op } from 'sequelize';

// Find records by date
const todayEvents = await Event.findAll({
  where: {
    eventDate: new Date() // ✅ Exact date match
  }
});

// Date range queries
const upcomingEvents = await Event.findAll({
  where: {
    startTime: {
      [Op.gte]: new Date(), // ✅ Greater than or equal to now
      [Op.lte]: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // ✅ Next 7 days
    }
  }
});

// Date comparisons
const pastEvents = await Event.findAll({
  where: {
    startTime: {
      [Op.lt]: new Date() // ✅ Less than now
    }
  }
});

// Extract date parts
const eventsThisMonth = await Event.findAll({
  where: Sequelize.where(
    Sequelize.fn('MONTH', Sequelize.col('startTime')),
    new Date().getMonth() + 1
  )
});
```

### Date Formatting

```typescript
// Format dates in queries
const events = await Event.findAll({
  attributes: [
    'id',
    'title',
    [
      Sequelize.fn('DATE_FORMAT', Sequelize.col('startTime'), '%Y-%m-%d %H:%i:%s'),
      'formattedDate'
    ]
  ]
});

// Format dates in JavaScript
const event = await Event.findByPk(1);
const formattedDate = event.startTime.toISOString().split('T')[0]; // YYYY-MM-DD
const formattedDateTime = event.startTime.toLocaleString(); // Local format
```

### Timezone Handling

```typescript
// Store UTC dates
@Column({
  type: DataType.DATE,
  allowNull: false,
  defaultValue: DataType.NOW
})
createdAt: Date;

// Convert to timezone in query
const events = await Event.findAll({
  attributes: [
    'id',
    'title',
    [
      Sequelize.fn('CONVERT_TZ', 
        Sequelize.col('startTime'), 
        '+00:00', 
        '+05:30'
      ),
      'localTime'
    ]
  ]
});

// Handle timezones in JavaScript
const event = await Event.findByPk(1);
const utcDate = event.startTime; // UTC
const localDate = new Date(event.startTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
```

### Date Arithmetic

```typescript
// Add/subtract time
const events = await Event.findAll({
  where: Sequelize.where(
    Sequelize.fn('DATE_ADD', 
      Sequelize.col('startTime'), 
      Sequelize.literal('INTERVAL 1 DAY')
    ),
    {
      [Op.gte]: new Date()
    }
  )
});

// Calculate difference
const events = await Event.findAll({
  attributes: [
    'id',
    'title',
    [
      Sequelize.fn('DATEDIFF', 
        Sequelize.col('endTime'), 
        Sequelize.col('startTime')
      ),
      'durationDays'
    ]
  ]
});
```

### Auto-Generated Timestamps

```typescript
import { CreatedAt, UpdatedAt } from 'sequelize-typescript';

@Table({ tableName: 'posts' })
export class Post extends Model<Post> {
  // ✅ Auto-set on creation
  @CreatedAt
  declare createdAt: Date;

  // ✅ Auto-update on modification
  @UpdatedAt
  declare updatedAt: Date;

  // Custom timestamp (manual)
  @Column({
    type: DataType.DATE,
    defaultValue: DataType.NOW
  })
  publishedAt: Date;
}
```

### Date Validation

```typescript
@Column({
  type: DataType.DATE,
  validate: {
    isDate: true, // ✅ Must be valid date
    isAfter: new Date().toISOString() // ✅ Must be in future
  }
})
eventDate: Date;

// Custom validation
@Column({
  type: DataType.DATE,
  validate: {
    isFutureDate(value: Date) {
      if (value <= new Date()) {
        throw new Error('Event date must be in the future');
      }
    }
  }
})
eventDate: Date;
```

---

## Generated Columns

### Virtual Columns (Computed in Application)

```typescript
import { DataType, Virtual } from 'sequelize-typescript';

@Table({ tableName: 'users' })
export class User extends Model<User> {
  @Column(DataType.STRING)
  firstName: string;

  @Column(DataType.STRING)
  lastName: string;

  // ✅ Virtual column (computed in JavaScript)
  @Virtual
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  // Virtual with data type
  @Virtual(DataType.STRING)
  get displayName(): string {
    return this.email.split('@')[0];
  }
}

// Usage
const user = await User.findByPk(1);
console.log(user.fullName); // ✅ Computed property
```

### Database-Generated Columns (MySQL 5.7+, PostgreSQL 12+)

#### MySQL Generated Columns

```typescript
// In migration
await queryInterface.createTable('users', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  firstName: {
    type: Sequelize.STRING,
    allowNull: false
  },
  lastName: {
    type: Sequelize.STRING,
    allowNull: false
  },
  fullName: {
    type: Sequelize.VIRTUAL, // ✅ Virtual (stored)
    type: 'VARCHAR(255) GENERATED ALWAYS AS (CONCAT(firstName, " ", lastName)) STORED',
    allowNull: false
  }
});

// In model
@Table({ tableName: 'users' })
export class User extends Model<User> {
  @Column(DataType.STRING)
  firstName: string;

  @Column(DataType.STRING)
  lastName: string;

  // ✅ Generated column (read-only)
  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  declare fullName: string; // ✅ Use 'declare' for generated columns
}
```

#### PostgreSQL Generated Columns

```typescript
// In migration
await queryInterface.createTable('products', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  price: {
    type: Sequelize.DECIMAL(10, 2),
    allowNull: false
  },
  tax: {
    type: Sequelize.DECIMAL(10, 2),
    allowNull: false
  },
  totalPrice: {
    type: 'DECIMAL(10, 2) GENERATED ALWAYS AS (price + tax) STORED',
    allowNull: false
  }
});
```

### Computed Columns with Sequelize Literal

```typescript
// Add computed column in query
const users = await User.findAll({
  attributes: [
    'id',
    'firstName',
    'lastName',
    [
      Sequelize.literal('CONCAT(firstName, " ", lastName)'),
      'fullName'
    ]
  ]
});

// Complex computed column
const products = await Product.findAll({
  attributes: [
    'id',
    'name',
    'price',
    'quantity',
    [
      Sequelize.literal('price * quantity'),
      'totalValue'
    ],
    [
      Sequelize.literal('CASE WHEN quantity > 0 THEN "In Stock" ELSE "Out of Stock" END'),
      'stockStatus'
    ]
  ]
});
```

### JSON Generated Columns

```typescript
// Extract from JSON column
const users = await User.findAll({
  attributes: [
    'id',
    'email',
    [
      Sequelize.literal('JSON_EXTRACT(metadata, "$.age")'),
      'age'
    ],
    [
      Sequelize.literal('JSON_EXTRACT(metadata, "$.address.city")'),
      'city'
    ]
  ]
});
```

### Conditional Generated Columns

```typescript
// Conditional logic in generated column
const orders = await Order.findAll({
  attributes: [
    'id',
    'amount',
    'status',
    [
      Sequelize.literal(`
        CASE 
          WHEN status = 'COMPLETED' THEN amount * 0.1
          WHEN status = 'PENDING' THEN amount * 0.05
          ELSE 0
        END
      `),
      'commission'
    ]
  ]
});
```

### Indexed Generated Columns

```typescript
// Create index on generated column (MySQL)
await queryInterface.addIndex('users', ['fullName'], {
  name: 'idx_users_full_name'
});

// Use generated column in WHERE clause
const users = await User.findAll({
  where: Sequelize.where(
    Sequelize.literal('CONCAT(firstName, " ", lastName)'),
    'John Doe'
  )
});
```

---

## Generated Columns in Includes & Joins

### Overview: MySQL 8+ Generated Columns

MySQL 8+ supports **STORED** and **VIRTUAL** generated columns that can be used seamlessly in includes, joins, and queries.

**Types:**
- **STORED**: Computed and stored on disk (faster reads, uses storage)
- **VIRTUAL**: Computed on-the-fly (no storage, slower reads)

### Using Generated Columns in Includes

#### Basic: Include Generated Columns

```typescript
// User model with generated column
@Table({ tableName: 'users' })
export class User extends Model<User> {
  @Column(DataType.STRING)
  firstName: string;

  @Column(DataType.STRING)
  lastName: string;

  // Generated column (defined in migration)
  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  declare fullName: string; // ✅ Generated column
}

// Include users with their generated columns
const users = await User.findAll({
  attributes: ['id', 'firstName', 'lastName', 'fullName'], // ✅ Include generated column
  include: [{
    model: Post,
    as: 'posts',
    required: false
  }]
});
```

#### Filter by Generated Column in Include

```typescript
// Filter users by generated column in WHERE clause
const users = await User.findAll({
  where: {
    fullName: 'John Doe' // ✅ Can filter by generated column
  },
  include: [{
    model: Post,
    as: 'posts',
    required: false
  }]
});

// Filter included posts by user's generated column
const users = await User.findAll({
  include: [{
    model: Post,
    as: 'posts',
    on: {
      // ✅ Reference parent's generated column in join condition
      '$User.fullName$': Sequelize.literal('CONCAT("John", " ", "Doe")')
    },
    required: false
  }]
});
```

### Generated Columns in Nested Includes

#### Multi-Level Includes with Generated Columns

```typescript
// User → Posts → Comments (with generated columns at each level)

// Post model with generated column
@Table({ tableName: 'posts' })
export class Post extends Model<Post> {
  @Column(DataType.DECIMAL(10, 2))
  price: number;

  @Column(DataType.DECIMAL(10, 2))
  tax: number;

  // Generated column: totalPrice = price + tax
  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false
  })
  declare totalPrice: number; // ✅ Generated column
}

// Nested include with generated columns
const users = await User.findAll({
  attributes: ['id', 'fullName'], // ✅ User's generated column
  include: [{
    model: Post,
    as: 'posts',
    attributes: ['id', 'title', 'price', 'tax', 'totalPrice'], // ✅ Post's generated column
    required: false,
    include: [{
      model: Comment,
      as: 'comments',
      required: false
    }]
  }]
});
```

### Filtering Includes by Generated Columns

#### Filter Included Data by Generated Column

```typescript
// Filter posts where totalPrice > 100 (generated column)
const users = await User.findAll({
  include: [{
    model: Post,
    as: 'posts',
    where: {
      totalPrice: {
        [Op.gt]: 100 // ✅ Filter by generated column
      }
    },
    required: false
  }]
});

// Using ON clause (preserves LEFT JOIN)
const users = await User.findAll({
  include: [{
    model: Post,
    as: 'posts',
    on: {
      '$posts.totalPrice$': {
        [Op.gt]: 100 // ✅ Filter in ON clause
      }
    },
    required: false // ✅ LEFT JOIN preserved
  }]
});
```

### Generated Columns in Join Conditions

#### Join Using Generated Columns

```typescript
// Join users and posts based on generated columns
const users = await User.findAll({
  include: [{
    model: Post,
    as: 'posts',
    on: {
      // ✅ Join condition using generated column
      '$User.fullName$': Sequelize.col('posts.authorName')
    },
    required: false
  }]
});
```

### Aggregations with Generated Columns

#### Count/Sum Generated Columns

```typescript
// Aggregate on generated columns
const users = await User.findAll({
  attributes: [
    'id',
    'fullName',
    [
      Sequelize.fn('SUM', Sequelize.col('posts.totalPrice')),
      'totalPostsValue'
    ]
  ],
  include: [{
    model: Post,
    as: 'posts',
    attributes: [], // ✅ Don't load post data, just aggregate
    required: false
  }],
  group: ['User.id']
});
```

### Ordering by Generated Columns

#### Sort by Generated Column

```typescript
// Order users by generated column
const users = await User.findAll({
  order: [
    ['fullName', 'ASC'] // ✅ Order by generated column
  ],
  include: [{
    model: Post,
    as: 'posts',
    order: [
      ['totalPrice', 'DESC'] // ✅ Order included posts by generated column
    ],
    required: false
  }]
});
```

### Complex Generated Columns in Includes

#### JSON-Based Generated Columns

```typescript
// User model with JSON metadata
@Table({ tableName: 'users' })
export class User extends Model<User> {
  @Column(DataType.JSON)
  metadata: {
    age: number;
    address: {
      city: string;
      country: string;
    };
  };

  // Generated column extracting from JSON
  // Migration: city VARCHAR(100) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.address.city'))) STORED
  @Column({
    type: DataType.STRING
  })
  declare city: string; // ✅ Generated from JSON
}

// Use generated column in includes
const users = await User.findAll({
  where: {
    city: 'New York' // ✅ Filter by JSON-generated column
  },
  include: [{
    model: Post,
    as: 'posts',
    required: false
  }]
});
```

### Conditional Generated Columns in Includes

#### CASE-Based Generated Columns

```typescript
// Order model with conditional generated column
@Table({ tableName: 'orders' })
export class Order extends Model<Order> {
  @Column(DataType.DECIMAL(10, 2))
  amount: number;

  @Column(DataType.STRING)
  status: string;

  // Generated column: commission based on status
  // Migration: commission DECIMAL(10,2) GENERATED ALWAYS AS (
  //   CASE 
  //     WHEN status = 'COMPLETED' THEN amount * 0.1
  //     WHEN status = 'PENDING' THEN amount * 0.05
  //     ELSE 0
  //   END
  // ) STORED
  @Column({
    type: DataType.DECIMAL(10, 2)
  })
  declare commission: number; // ✅ Conditional generated column
}

// Include orders with generated commission
const users = await User.findAll({
  include: [{
    model: Order,
    as: 'orders',
    attributes: ['id', 'amount', 'status', 'commission'], // ✅ Include generated column
    where: {
      commission: {
        [Op.gt]: 0 // ✅ Filter by generated column
      }
    },
    required: false
  }]
});
```

### Performance Considerations

#### Indexed Generated Columns

```typescript
// Create index on generated column (in migration)
await queryInterface.addIndex('users', ['fullName'], {
  name: 'idx_users_full_name',
  using: 'BTREE'
});

// Use indexed generated column in includes (fast!)
const users = await User.findAll({
  where: {
    fullName: 'John Doe' // ✅ Uses index on generated column
  },
  include: [{
    model: Post,
    as: 'posts',
    required: false
  }]
});
```

#### STORED vs VIRTUAL in Includes

```typescript
// STORED generated column (faster, uses storage)
// Migration: fullName VARCHAR(255) GENERATED ALWAYS AS (...) STORED
const users = await User.findAll({
  attributes: ['fullName'], // ✅ Fast - stored on disk
  include: [{
    model: Post,
    as: 'posts',
    required: false
  }]
});

// VIRTUAL generated column (slower, computed on-the-fly)
// Migration: displayName VARCHAR(255) GENERATED ALWAYS AS (...) VIRTUAL
const users = await User.findAll({
  attributes: ['displayName'], // ⚠️ Slower - computed each time
  include: [{
    model: Post,
    as: 'posts',
    required: false
  }]
});
```

### Advanced: Generated Columns Across Multiple Tables

#### Cross-Table Generated Column References

```typescript
// User has generated column: fullName
// Post has generated column: totalPrice
// Join and filter using both generated columns

const users = await User.findAll({
  attributes: ['id', 'fullName'],
  include: [{
    model: Post,
    as: 'posts',
    attributes: ['id', 'title', 'totalPrice'],
    where: Sequelize.where(
      Sequelize.col('User.fullName'),
      Sequelize.literal('CONCAT("John", " ", "Doe")')
    ),
    required: false
  }]
});
```

### Real-World Example: E-Commerce

```typescript
// Product model with generated columns
@Table({ tableName: 'products' })
export class Product extends Model<Product> {
  @Column(DataType.DECIMAL(10, 2))
  basePrice: number;

  @Column(DataType.DECIMAL(5, 2))
  discountPercent: number;

  // Generated: finalPrice = basePrice * (1 - discountPercent/100)
  @Column({
    type: DataType.DECIMAL(10, 2)
  })
  declare finalPrice: number; // ✅ Generated column

  // Generated: isOnSale = discountPercent > 0
  @Column({
    type: DataType.BOOLEAN
  })
  declare isOnSale: boolean; // ✅ Generated column
}

// Category → Products (with generated columns)
const categories = await Category.findAll({
  include: [{
    model: Product,
    as: 'products',
    attributes: ['id', 'name', 'basePrice', 'discountPercent', 'finalPrice', 'isOnSale'],
    where: {
      isOnSale: true, // ✅ Filter by generated column
      finalPrice: {
        [Op.between]: [10, 100] // ✅ Filter by generated column
      }
    },
    order: [['finalPrice', 'ASC']], // ✅ Order by generated column
    required: false
  }]
});
```

### Best Practices

#### ✅ DO:

```typescript
// ✅ Use STORED for frequently queried generated columns
// ✅ Index generated columns used in WHERE/ORDER BY
// ✅ Include generated columns in attributes explicitly
// ✅ Use generated columns in ON clauses for filtering
// ✅ Filter by generated columns in WHERE clauses
```

#### ❌ DON'T:

```typescript
// ❌ Don't use VIRTUAL for frequently accessed columns in includes
// ❌ Don't create generated columns that depend on other generated columns (complex)
// ❌ Don't use generated columns in JOIN conditions without indexes
// ❌ Don't compute in JavaScript what can be a generated column
```

### Migration Example: Creating Generated Column

```typescript
// Migration: Add generated column
await queryInterface.addColumn('users', 'fullName', {
  type: 'VARCHAR(255) GENERATED ALWAYS AS (CONCAT(firstName, " ", lastName)) STORED',
  allowNull: false
});

// Add index for performance
await queryInterface.addIndex('users', ['fullName'], {
  name: 'idx_users_full_name'
});
```

---

## Advanced Query Patterns

### Subqueries

```typescript
// Subquery in WHERE clause
const users = await User.findAll({
  where: {
    id: {
      [Op.in]: Sequelize.literal(`(
        SELECT userId FROM posts
        WHERE published = true
        GROUP BY userId
        HAVING COUNT(*) > 5
      )`)
    }
  }
});

// Subquery in SELECT
const users = await User.findAll({
  attributes: [
    'id',
    'email',
    [
      Sequelize.literal(`(
        SELECT COUNT(*) FROM posts
        WHERE posts.userId = User.id
      )`),
      'postsCount'
    ]
  ]
});
```

### Union Queries

```typescript
// UNION: Combine results from multiple queries
const allContent = await sequelize.query(`
  SELECT id, title, 'post' as type, createdAt
  FROM posts
  UNION ALL
  SELECT id, title, 'video' as type, createdAt
  FROM videos
  ORDER BY createdAt DESC
`, { type: QueryTypes.SELECT });
```

### Window Functions

```typescript
// ROW_NUMBER, RANK, DENSE_RANK
const rankedPosts = await sequelize.query(`
  SELECT 
    id,
    title,
    userId,
    ROW_NUMBER() OVER (PARTITION BY userId ORDER BY createdAt DESC) as rank
  FROM posts
`, { type: QueryTypes.SELECT });
```

---

## Summary

### Includes & Eager Loading
✅ Use `include` for related data
✅ Use `required: false` for LEFT JOIN
✅ Use `separate: true` for large datasets
✅ Use `attributes` to limit fields
✅ Use nested includes for multi-level relationships

### Join Types
✅ **INNER JOIN**: `required: true` (default)
✅ **LEFT JOIN**: `required: false`
✅ **RIGHT JOIN**: Reverse include direction
✅ **FULL OUTER JOIN**: Use UNION query
✅ **CROSS JOIN**: Use raw query
✅ **SELF JOIN**: Self-referencing associations

### Date Handling
✅ Use `DataType.DATE` for datetime
✅ Use `DataType.DATEONLY` for date only
✅ Use `Op.gte`, `Op.lte` for date ranges
✅ Handle timezones properly
✅ Use `@CreatedAt` and `@UpdatedAt` decorators

### Generated Columns
✅ Use `@Virtual` for computed properties
✅ Use database-generated columns for performance
✅ Use `Sequelize.literal()` for complex computations
✅ Use `declare` for read-only generated columns

### Generated & Aggregated Columns in Includes
✅ Use subqueries for counts and aggregations
✅ Use window functions (ROW_NUMBER, RANK) for ranking
✅ Use JSON functions for JSON data extraction
✅ Use GROUP_CONCAT for concatenated values
✅ Optimize with indexes on foreign keys
✅ Consider separate queries for heavy aggregations

This comprehensive guide covers **all advanced Sequelize patterns** you'll need!

---

## Generated & Aggregated Columns in Includes (MySQL 8+)

### Overview

MySQL 8+ provides powerful features for computed columns, aggregations, and window functions that can be used within includes and nested includes for advanced querying patterns.

### Generated Columns in Includes

#### Basic Generated Column in Include

```typescript
// Include with generated column (full name from first + last name)
const users = await User.findAll({
  attributes: ['id', 'email'],
  include: [{
    model: Post,
    as: 'posts',
    attributes: [
      'id',
      'title',
      [
        Sequelize.literal('CONCAT(users.firstName, " ", users.lastName)'),
        'authorFullName'
      ]
    ],
    required: false
  }]
});
```

#### Generated Column from JSON Data

```typescript
// Extract from JSON column in included model
const users = await User.findAll({
  include: [{
    model: Post,
    as: 'posts',
    attributes: [
      'id',
      'title',
      [
        Sequelize.literal('JSON_EXTRACT(metadata, "$.category")'),
        'category'
      ],
      [
        Sequelize.literal('JSON_EXTRACT(metadata, "$.tags[0]")'),
        'firstTag'
      ]
    ],
    required: false
  }]
});
```

### Aggregated Columns in Includes

#### Count Related Records

```typescript
// Count posts per user without loading posts
const users = await User.findAll({
  attributes: [
    'id',
    'email',
    'name',
    [
      Sequelize.literal(`(
        SELECT COUNT(*)
        FROM posts
        WHERE posts.userId = User.id
      )`),
      'postsCount'
    ]
  ]
});
```

#### Sum/Average in Includes

```typescript
// Include with aggregated sum
const users = await User.findAll({
  attributes: [
    'id',
    'email',
    [
      Sequelize.literal(`(
        SELECT SUM(amount)
        FROM payments
        WHERE payments.userId = User.id
      )`),
      'totalSpent'
    ],
    [
      Sequelize.literal(`(
        SELECT AVG(amount)
        FROM payments
        WHERE payments.userId = User.id
      )`),
      'averagePayment'
    ]
  ]
});
```

#### Aggregated Columns in Nested Includes

```typescript
// User → Posts → Comments (with counts)
const users = await User.findAll({
  attributes: [
    'id',
    'email',
    [
      Sequelize.literal(`(
        SELECT COUNT(*)
        FROM posts
        WHERE posts.userId = User.id
      )`),
      'postsCount'
    ]
  ],
  include: [{
    model: Post,
    as: 'posts',
    attributes: [
      'id',
      'title',
      [
        Sequelize.literal(`(
          SELECT COUNT(*)
          FROM comments
          WHERE comments.postId = Post.id
        )`),
        'commentsCount'
      ],
      [
        Sequelize.literal(`(
          SELECT AVG(rating)
          FROM comments
          WHERE comments.postId = Post.id
        )`),
        'averageRating'
      ]
    ],
    required: false
  }]
});
```

### Window Functions in Includes (MySQL 8+)

#### ROW_NUMBER for Ranking

```typescript
// Rank posts by creation date per user
const users = await User.findAll({
  include: [{
    model: Post,
    as: 'posts',
    attributes: [
      'id',
      'title',
      'createdAt',
      [
        Sequelize.literal(`ROW_NUMBER() OVER (
          PARTITION BY posts.userId 
          ORDER BY posts.createdAt DESC
        )`),
        'postRank'
      ]
    ],
    required: false
  }]
});
```

#### RANK and DENSE_RANK

```typescript
// Rank users by post count
const users = await User.findAll({
  attributes: [
    'id',
    'email',
    [
      Sequelize.literal(`(
        SELECT COUNT(*)
        FROM posts
        WHERE posts.userId = User.id
      )`),
      'postsCount'
    ],
    [
      Sequelize.literal(`RANK() OVER (
        ORDER BY (
          SELECT COUNT(*)
          FROM posts
          WHERE posts.userId = User.id
        ) DESC
      )`),
      'userRank'
    ]
  ]
});
```

#### Running Totals with Window Functions

```typescript
// Running total of payments per user
const users = await User.findAll({
  include: [{
    model: Payment,
    as: 'payments',
    attributes: [
      'id',
      'amount',
      'createdAt',
      [
        Sequelize.literal(`SUM(amount) OVER (
          PARTITION BY payments.userId
          ORDER BY payments.createdAt
          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        )`),
        'runningTotal'
      ]
    ],
    required: false,
    order: [['createdAt', 'ASC']]
  }]
});
```

### Conditional Aggregations in Includes

#### CASE Statements in Aggregations

```typescript
// Count posts by status per user
const users = await User.findAll({
  attributes: [
    'id',
    'email',
    [
      Sequelize.literal(`(
        SELECT COUNT(*)
        FROM posts
        WHERE posts.userId = User.id
          AND posts.status = 'published'
      )`),
      'publishedPostsCount'
    ],
    [
      Sequelize.literal(`(
        SELECT COUNT(*)
        FROM posts
        WHERE posts.userId = User.id
          AND posts.status = 'draft'
      )`),
      'draftPostsCount'
    ],
    [
      Sequelize.literal(`(
        SELECT SUM(
          CASE 
            WHEN posts.status = 'published' THEN 1
            ELSE 0
          END
        )
        FROM posts
        WHERE posts.userId = User.id
      )`),
      'totalPublished'
    ]
  ]
});
```

#### Conditional Aggregations with Multiple Conditions

```typescript
// Complex conditional aggregation
const users = await User.findAll({
  attributes: [
    'id',
    'email',
    [
      Sequelize.literal(`(
        SELECT SUM(
          CASE 
            WHEN posts.status = 'published' 
              AND posts.createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            THEN 1
            ELSE 0
          END
        )
        FROM posts
        WHERE posts.userId = User.id
      )`),
      'recentPublishedPosts'
    ]
  ]
});
```

### JSON Functions in Includes (MySQL 8+)

#### JSON Aggregation

```typescript
// Aggregate related data as JSON array
const users = await User.findAll({
  attributes: [
    'id',
    'email',
    [
      Sequelize.literal(`(
        SELECT JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', posts.id,
            'title', posts.title,
            'createdAt', posts.createdAt
          )
        )
        FROM posts
        WHERE posts.userId = User.id
      )`),
      'postsJson'
    ]
  ]
});
```

#### JSON Object Aggregation

```typescript
// Aggregate as JSON object with key-value pairs
const users = await User.findAll({
  attributes: [
    'id',
    'email',
    [
      Sequelize.literal(`(
        SELECT JSON_OBJECTAGG(
          posts.id,
          JSON_OBJECT(
            'title', posts.title,
            'status', posts.status
          )
        )
        FROM posts
        WHERE posts.userId = User.id
      )`),
      'postsMap'
    ]
  ]
});
```

### GROUP_CONCAT in Includes

```typescript
// Concatenate related values
const users = await User.findAll({
  attributes: [
    'id',
    'email',
    [
      Sequelize.literal(`(
        SELECT GROUP_CONCAT(posts.title SEPARATOR ', ')
        FROM posts
        WHERE posts.userId = User.id
        ORDER BY posts.createdAt DESC
        LIMIT 5
      )`),
      'recentPostTitles'
    ],
    [
      Sequelize.literal(`(
        SELECT GROUP_CONCAT(DISTINCT posts.category SEPARATOR ', ')
        FROM posts
        WHERE posts.userId = User.id
      )`),
      'userCategories'
    ]
  ]
});
```

### Advanced: Generated Columns in Nested Includes

```typescript
// Multi-level includes with generated columns
const users = await User.findAll({
  attributes: [
    'id',
    'email',
    [
      Sequelize.literal(`(
        SELECT COUNT(*)
        FROM posts
        WHERE posts.userId = User.id
      )`),
      'totalPosts'
    ]
  ],
  include: [{
    model: Post,
    as: 'posts',
    attributes: [
      'id',
      'title',
      [
        Sequelize.literal(`(
          SELECT COUNT(*)
          FROM comments
          WHERE comments.postId = Post.id
        )`),
        'commentsCount'
      ],
      [
        Sequelize.literal(`(
          SELECT AVG(rating)
          FROM comments
          WHERE comments.postId = Post.id
        )`),
        'averageRating'
      ]
    ],
    include: [{
      model: Comment,
      as: 'comments',
      attributes: [
        'id',
        'content',
        [
          Sequelize.literal(`CONCAT(
            (SELECT name FROM users WHERE users.id = comments.userId),
            ' - ',
            comments.createdAt
          )`),
          'authorAndDate'
        ]
      ],
      required: false
    }],
    required: false
  }]
});
```

### Performance Optimization Tips

#### Use Indexes for Generated Columns

```typescript
// In migration - create index on generated column
await queryInterface.addIndex('users', [
  Sequelize.literal('(SELECT COUNT(*) FROM posts WHERE posts.userId = users.id)')
], {
  name: 'idx_users_posts_count'
});
```

#### Limit Aggregation Scope

```typescript
// ✅ GOOD: Limit aggregation with WHERE clause
const users = await User.findAll({
  attributes: [
    'id',
    'email',
    [
      Sequelize.literal(`(
        SELECT COUNT(*)
        FROM posts
        WHERE posts.userId = User.id
          AND posts.status = 'published'
          AND posts.createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      )`),
      'recentPublishedCount'
    ]
  ]
});

// ❌ BAD: Aggregating all records
const users = await User.findAll({
  attributes: [
    'id',
    'email',
    [
      Sequelize.literal(`(
        SELECT COUNT(*)
        FROM posts
        WHERE posts.userId = User.id
      )`),
      'allPostsCount'
    ]
  ]
});
```

#### Use Separate Queries for Heavy Aggregations

```typescript
// For complex aggregations, consider separate queries
const users = await User.findAll({
  attributes: ['id', 'email', 'name']
});

// Then fetch aggregated data separately
const userIds = users.map(u => u.id);
const postCounts = await Post.findAll({
  attributes: [
    'userId',
    [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
  ],
  where: { userId: { [Op.in]: userIds } },
  group: ['userId']
});

// Merge results
users.forEach(user => {
  const count = postCounts.find(pc => pc.userId === user.id);
  user.setDataValue('postsCount', count?.get('count') || 0);
});
```

### MySQL 8+ Specific Features

#### Common Table Expressions (CTEs) in Includes

```typescript
// Using CTE for complex aggregations
const users = await sequelize.query(`
  WITH user_stats AS (
    SELECT 
      userId,
      COUNT(*) as postsCount,
      AVG(rating) as avgRating
    FROM posts
    GROUP BY userId
  )
  SELECT 
    users.*,
    COALESCE(user_stats.postsCount, 0) as postsCount,
    COALESCE(user_stats.avgRating, 0) as avgRating
  FROM users
  LEFT JOIN user_stats ON users.id = user_stats.userId
`, {
  type: QueryTypes.SELECT,
  model: User,
  mapToModel: true
});
```

#### JSON Table Functions

```typescript
// Extract data from JSON column and join
const users = await User.findAll({
  include: [{
    model: Post,
    as: 'posts',
    attributes: [
      'id',
      'title',
      [
        Sequelize.literal(`JSON_EXTRACT(metadata, '$.author.name')`),
        'authorName'
      ]
    ],
    required: false
  }]
});
```

### Best Practices

#### ✅ DO: Use Indexes

```typescript
// Create indexes on foreign keys used in aggregations
await queryInterface.addIndex('posts', ['userId'], {
  name: 'idx_posts_user_id'
});
```

#### ✅ DO: Limit Aggregation Results

```typescript
// Use LIMIT in subqueries when possible
Sequelize.literal(`(
  SELECT COUNT(*)
  FROM posts
  WHERE posts.userId = User.id
  LIMIT 1000
)`)
```

#### ✅ DO: Cache Expensive Aggregations

```typescript
// Store frequently accessed aggregations in a materialized view or cache
// Example: Store post counts in a user_stats table
```

#### ❌ DON'T: Overuse Aggregations in Includes

```typescript
// ❌ BAD: Too many aggregations in one query
const users = await User.findAll({
  attributes: [
    // 10+ subquery aggregations here
  ]
});
// This can be slow - consider separate queries or materialized views
```

#### ❌ DON'T: Aggregate Without WHERE Clauses

```typescript
// ❌ BAD: Aggregating all records
Sequelize.literal(`(SELECT COUNT(*) FROM posts)`)

// ✅ GOOD: Aggregating filtered records
Sequelize.literal(`(SELECT COUNT(*) FROM posts WHERE posts.userId = User.id)`)
```