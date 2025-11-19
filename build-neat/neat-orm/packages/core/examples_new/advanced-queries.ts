#!/usr/bin/env tsx

/**
 * ADVANCED QUERIES - Complex Database Operations
 *
 * Demonstrates advanced querying capabilities:
 * - Complex WHERE conditions
 * - JOIN operations (simulated)
 * - Aggregations and grouping
 * - Sorting and pagination
 * - Subqueries and relationships
 * - Raw SQL when needed
 */

import 'reflect-metadata';

// =============================================================================
// REUSABLE COMPONENTS
// =============================================================================

interface DatabaseResult {
  rows: any[];
  lastInsertRowid?: number;
}

interface DatabaseAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  execute(sql: string, params?: any[]): Promise<DatabaseResult>;
}

class SimpleSQLiteAdapter implements DatabaseAdapter {
  private db: any = null;

  constructor(private config: { database: string }) {}

  async connect(): Promise<void> {
    const sqlite3 = await import('sqlite3');
    const Database = (sqlite3 as any).Database || (sqlite3 as any).default?.Database || (sqlite3 as any).default;
    this.db = new Database(this.config.database);
  }

  async disconnect(): Promise<void> {
    if (this.db) {
      return new Promise((resolve, reject) => {
        this.db.close((err: any) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  }

  async execute(sql: string, params: any[] = []): Promise<DatabaseResult> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }

      if (sql.toLowerCase().trim().startsWith('select')) {
        this.db.all(sql, params, (err: any, rows: any[]) => {
          if (err) reject(err);
          else resolve({ rows: rows || [] });
        });
      } else {
        this.db.run(sql, params, function(this: any, err: any) {
          if (err) reject(err);
          else resolve({
            rows: [],
            lastInsertRowid: this.lastID
          });
        });
      }
    });
  }
}

interface Entity {
  id: number;
}

class SimpleRepository<T extends Entity> {
  constructor(
    private adapter: DatabaseAdapter,
    private tableName: string
  ) {}

  async create(data: Omit<T, 'id'>): Promise<T> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map(() => '?');

    const sql = `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;
    const result = await this.adapter.execute(sql, values);

    return { ...data, id: result.lastInsertRowid! } as T;
  }

  async findById(id: number): Promise<T | null> {
    const result = await this.adapter.execute(
      `SELECT * FROM ${this.tableName} WHERE id = ?`,
      [id]
    );
    
    return result.rows[0] || null;
  }

  async find(options: {
    where?: Record<string, any>;
    limit?: number;
    offset?: number;
    orderBy?: string;
    select?: string[];
  } = {}): Promise<T[]> {
    let sql = options.select
      ? `SELECT ${options.select.join(', ')} FROM ${this.tableName}`
      : `SELECT * FROM ${this.tableName}`;

    const params: any[] = [];

    if (options.where) {
      const conditions: string[] = [];
      for (const [key, value] of Object.entries(options.where)) {
        if (typeof value === 'object' && value !== null) {
          // Handle operators like { gt: 100 }, { like: '%test%' }, etc.
          const operator = Object.keys(value)[0];
          const operatorValue = value[operator];

          switch (operator) {
            case 'gt':
              conditions.push(`${key} > ?`);
              break;
            case 'gte':
              conditions.push(`${key} >= ?`);
              break;
            case 'lt':
              conditions.push(`${key} < ?`);
              break;
            case 'lte':
              conditions.push(`${key} <= ?`);
              break;
            case 'like':
              conditions.push(`${key} LIKE ?`);
              break;
            case 'in':
              conditions.push(`${key} IN (${operatorValue.map(() => '?').join(', ')})`);
              params.push(...operatorValue);
              continue;
            default:
              conditions.push(`${key} = ?`);
          }
          params.push(operatorValue);
        } else {
          conditions.push(`${key} = ?`);
          params.push(value);
        }
      }
      if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(' AND ')}`;
      }
    }

    if (options.orderBy) {
      sql += ` ORDER BY ${options.orderBy}`;
    }

    if (options.limit) {
      sql += ` LIMIT ?`;
      params.push(options.limit);
    }

    if (options.offset) {
      sql += ` OFFSET ?`;
      params.push(options.offset);
    }

    const result = await this.adapter.execute(sql, params);
    return result.rows;
  }

  async update(id: number, data: Partial<T>): Promise<void> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const setClause = columns.map(col => `${col} = ?`).join(', ');

    const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`;
    await this.adapter.execute(sql, [...values, id]);
  }

  async delete(id: number): Promise<void> {
    await this.adapter.execute(
      `DELETE FROM ${this.tableName} WHERE id = ?`,
      [id]
    );
  }

  async count(options: { where?: Record<string, any> } = {}): Promise<number> {
    let sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    const params: any[] = [];

    if (options.where) {
      const conditions: string[] = [];
      for (const [key, value] of Object.entries(options.where)) {
        conditions.push(`${key} = ?`);
        params.push(value);
      }
      if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(' AND ')}`;
      }
    }

    const result = await this.adapter.execute(sql, params);
    return result.rows[0]?.count || 0;
  }

  async sum(column: string, options: { where?: Record<string, any> } = {}): Promise<number> {
    let sql = `SELECT SUM(${column}) as total FROM ${this.tableName}`;
    const params: any[] = [];

    if (options.where) {
      const conditions: string[] = [];
      for (const [key, value] of Object.entries(options.where)) {
        conditions.push(`${key} = ?`);
        params.push(value);
      }
      if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(' AND ')}`;
      }
    }

    const result = await this.adapter.execute(sql, params);
    return result.rows[0]?.total || 0;
  }

  async avg(column: string, options: { where?: Record<string, any> } = {}): Promise<number> {
    let sql = `SELECT AVG(${column}) as average FROM ${this.tableName}`;
    const params: any[] = [];

    if (options.where) {
      const conditions: string[] = [];
      for (const [key, value] of Object.entries(options.where)) {
        conditions.push(`${key} = ?`);
        params.push(value);
      }
      if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(' AND ')}`;
      }
    }

    const result = await this.adapter.execute(sql, params);
    return result.rows[0]?.average || 0;
  }

  async rawQuery(sql: string, params: any[] = []): Promise<any[]> {
    const result = await this.adapter.execute(sql, params);
    return result.rows;
  }
}

// =============================================================================
// ENTITY TYPES
// =============================================================================

interface User {
  id: number;
  name: string;
  email: string;
  age: number;
  department: string;
  salary: number;
  active: boolean;
  created_at: string;
}

interface Post {
  id: number;
  title: string;
  content: string;
  user_id: number;
  category: string;
  published: boolean;
  views: number;
  likes: number;
  created_at: string;
}

interface Comment {
  id: number;
  content: string;
  user_id: number;
  post_id: number;
  rating: number;
  created_at: string;
}

// =============================================================================
// QUERY SERVICE - Advanced Query Demonstrations
// =============================================================================

class AdvancedQueryService {
  constructor(
    private userRepo: SimpleRepository<User>,
    private postRepo: SimpleRepository<Post>,
    private commentRepo: SimpleRepository<Comment>
  ) {}

  // Complex WHERE conditions with multiple operators
  async findUsersWithComplexConditions(): Promise<User[]> {
    return this.userRepo.find({
      where: {
        active: true,
        age: { gte: 25 },
        department: { in: ['Engineering', 'Sales', 'Marketing'] },
        salary: { gt: 50000 }
      },
      orderBy: 'salary DESC',
      limit: 10
    });
  }

  // Aggregation queries
  async getDepartmentStats(): Promise<Array<{
    department: string;
    userCount: number;
    avgSalary: number;
    totalSalary: number;
    minAge: number;
    maxAge: number;
  }>> {
    // Note: In a real ORM, this would be done with GROUP BY
    // For this demo, we'll simulate it with multiple queries
    const departments = ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance'];

    const stats: Array<{
      department: string;
      userCount: number;
      avgSalary: number;
      totalSalary: number;
      minAge: number;
      maxAge: number;
    }> = [];

    for (const dept of departments) {
      const userCount = await this.userRepo.count({ where: { department: dept } });
      if (userCount > 0) {
        const totalSalary = await this.userRepo.sum('salary', { where: { department: dept } });
        const avgSalary = totalSalary / userCount;

        // Get age range (simplified - would need MIN/MAX in real SQL)
        const deptUsers = await this.userRepo.find({
          where: { department: dept },
          orderBy: 'age ASC'
        });

        const minAge = deptUsers[0]?.age || 0;
        const maxAge = deptUsers[deptUsers.length - 1]?.age || 0;

        stats.push({
          department: dept,
          userCount,
          avgSalary: Math.round(avgSalary),
          totalSalary,
          minAge,
          maxAge
        });
      }
    }

    return stats;
  }

  // JOIN-like operations (simulated with multiple queries)
  async getPostsWithAuthors(limit = 20): Promise<Array<{
    post: Post;
    author: User;
    commentCount: number;
    avgRating: number;
  }>> {
    const posts = await this.postRepo.find({
      where: { published: true },
      orderBy: 'created_at DESC',
      limit
    });

    const result: Array<{
      post: Post;
      author: User;
      commentCount: number;
      avgRating: number;
    }> = [];

    for (const post of posts) {
      const author = await this.userRepo.findById(post.user_id);
      if (author) {
        const commentCount = await this.commentRepo.count({ where: { post_id: post.id } });
        const avgRating = commentCount > 0
          ? await this.commentRepo.rawQuery(
              'SELECT AVG(rating) as avg FROM comments WHERE post_id = ?',
              [post.id]
            ).then(rows => rows[0]?.avg || 0)
          : 0;

        result.push({
          post,
          author,
          commentCount,
          avgRating: Math.round(avgRating * 10) / 10
        });
      }
    }

    return result;
  }

  // Pagination with metadata
  async getPostsPaginated(page = 1, pageSize = 10): Promise<{
    posts: Post[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  }> {
    const offset = (page - 1) * pageSize;
    const total = await this.postRepo.count({ where: { published: true } });
    const posts = await this.postRepo.find({
      where: { published: true },
      orderBy: 'created_at DESC',
      limit: pageSize,
      offset
    });

    const totalPages = Math.ceil(total / pageSize);

    return {
      posts,
      total,
      page,
      pageSize,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    };
  }

  // Search functionality
  async searchPosts(query: string, category?: string): Promise<Post[]> {
    const where: Record<string, any> = {
      published: true
    };

    if (category) {
      where.category = category;
    }

    // Get all posts and filter in memory (would be LIKE query in real SQL)
    const posts = await this.postRepo.find({
      where,
      orderBy: 'views DESC',
      limit: 50
    });

    return posts.filter(post =>
      post.title.toLowerCase().includes(query.toLowerCase()) ||
      post.content.toLowerCase().includes(query.toLowerCase())
    );
  }

  // Analytics and reporting
  async getAnalytics(): Promise<{
    totalUsers: number;
    totalPosts: number;
    totalComments: number;
    avgPostsPerUser: number;
    avgCommentsPerPost: number;
    topCategories: Array<{ category: string; count: number }>;
    mostActiveUsers: Array<{ user: User; postCount: number }>;
    trendingPosts: Post[];
  }> {
    const [totalUsers, totalPosts, totalComments] = await Promise.all([
      this.userRepo.count(),
      this.postRepo.count({ where: { published: true } }),
      this.commentRepo.count()
    ]);

    const avgPostsPerUser = totalUsers > 0 ? totalPosts / totalUsers : 0;
    const avgCommentsPerPost = totalPosts > 0 ? totalComments / totalPosts : 0;

    // Top categories
    const categoryStats: Record<string, number> = {};
    const allPosts = await this.postRepo.find();
    allPosts.forEach(post => {
      categoryStats[post.category] = (categoryStats[post.category] || 0) + 1;
    });

    const topCategories = Object.entries(categoryStats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([category, count]) => ({ category, count }));

    // Most active users
    const mostActiveUsers: Array<{ user: User; postCount: number }> = [];
    const users = await this.userRepo.find({ where: { active: true } });

    for (const user of users.slice(0, 10)) {
      const postCount = await this.postRepo.count({ where: { user_id: user.id } });
      if (postCount > 0) {
        mostActiveUsers.push({ user, postCount });
      }
    }

    mostActiveUsers.sort((a, b) => b.postCount - a.postCount);

    // Trending posts (most viewed in last N posts)
    const trendingPosts = await this.postRepo.find({
      where: { published: true },
      orderBy: 'views DESC',
      limit: 10
    });

    return {
      totalUsers,
      totalPosts,
      totalComments,
      avgPostsPerUser: Math.round(avgPostsPerUser * 10) / 10,
      avgCommentsPerPost: Math.round(avgCommentsPerPost * 10) / 10,
      topCategories,
      mostActiveUsers,
      trendingPosts
    };
  }

  // Raw SQL for complex operations
  async getPostsWithComplexAggregations(): Promise<any[]> {
    // This would be a complex SQL query in a real ORM
    // For demo purposes, we'll simulate with multiple queries
    const posts = await this.postRepo.find({
      where: { published: true },
      orderBy: 'created_at DESC',
      limit: 20
    });

    const results: any[] = [];
    for (const post of posts) {
      const author = await this.userRepo.findById(post.user_id);
      const commentCount = await this.commentRepo.count({ where: { post_id: post.id } });
      const avgRating = await this.commentRepo.rawQuery(
        'SELECT AVG(rating) as avg FROM comments WHERE post_id = ?',
        [post.id]
      ).then(rows => rows[0]?.avg || 0);

      results.push({
        postId: post.id,
        title: post.title,
        authorName: author?.name,
        category: post.category,
        views: post.views,
        likes: post.likes,
        commentCount,
        avgRating: Math.round(avgRating * 10) / 10,
        engagement: post.likes + commentCount * 2 // Simple engagement score
      });
    }

    return results.sort((a, b) => b.engagement - a.engagement);
  }
}

// =============================================================================
// DATABASE SETUP
// =============================================================================

async function setupDatabase(adapter: DatabaseAdapter): Promise<void> {
  // Users table
  await adapter.execute(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      age INTEGER NOT NULL,
      department TEXT NOT NULL,
      salary INTEGER NOT NULL,
      active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Posts table
  await adapter.execute(`
    CREATE TABLE posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      category TEXT NOT NULL,
      published BOOLEAN DEFAULT 1,
      views INTEGER DEFAULT 0,
      likes INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Comments table
  await adapter.execute(`
    CREATE TABLE comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      post_id INTEGER NOT NULL,
      rating INTEGER DEFAULT 5,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (post_id) REFERENCES posts(id)
    )
  `);
}

async function seedSampleData(
  userRepo: SimpleRepository<User>,
  postRepo: SimpleRepository<Post>,
  commentRepo: SimpleRepository<Comment>
): Promise<void> {
  // Create users
  const users = [
    { name: 'Alice Johnson', email: 'alice@company.com', age: 28, department: 'Engineering', salary: 75000 },
    { name: 'Bob Smith', email: 'bob@company.com', age: 32, department: 'Sales', salary: 65000 },
    { name: 'Charlie Brown', email: 'charlie@company.com', age: 25, department: 'Engineering', salary: 70000 },
    { name: 'Diana Prince', email: 'diana@company.com', age: 30, department: 'Marketing', salary: 60000 },
    { name: 'Eve Wilson', email: 'eve@company.com', age: 27, department: 'Engineering', salary: 72000 },
    { name: 'Frank Miller', email: 'frank@company.com', age: 35, department: 'Sales', salary: 68000 },
    { name: 'Grace Lee', email: 'grace@company.com', age: 29, department: 'HR', salary: 55000 },
    { name: 'Henry Ford', email: 'henry@company.com', age: 40, department: 'Finance', salary: 80000 },
  ];

  const createdUsers: User[] = [];
  for (const user of users) {
    const created = await userRepo.create({
      ...user,
      active: true,
      created_at: new Date().toISOString(),
    });
    createdUsers.push(created);
  }

  // Create posts
  const posts = [
    { title: 'Getting Started with TypeScript', content: 'TypeScript is great for large applications...', user_id: createdUsers[0].id, category: 'Programming', views: 150, likes: 25 },
    { title: 'Database Design Principles', content: 'Good database design is crucial...', user_id: createdUsers[1].id, category: 'Database', views: 200, likes: 40 },
    { title: 'React Best Practices', content: 'Building maintainable React applications...', user_id: createdUsers[2].id, category: 'Frontend', views: 300, likes: 60 },
    { title: 'API Security Fundamentals', content: 'Securing your APIs is essential...', user_id: createdUsers[3].id, category: 'Security', views: 180, likes: 35 },
    { title: 'Microservices Architecture', content: 'Breaking down monolithic applications...', user_id: createdUsers[4].id, category: 'Architecture', views: 250, likes: 50 },
    { title: 'DevOps Culture', content: 'Building a DevOps culture in your team...', user_id: createdUsers[5].id, category: 'DevOps', views: 120, likes: 20 },
    { title: 'Machine Learning Basics', content: 'Introduction to ML concepts...', user_id: createdUsers[0].id, category: 'AI', views: 400, likes: 80 },
    { title: 'Cloud Migration Strategies', content: 'Moving to the cloud safely...', user_id: createdUsers[6].id, category: 'Cloud', views: 175, likes: 30 },
    { title: 'Team Leadership', content: 'Leading technical teams effectively...', user_id: createdUsers[7].id, category: 'Management', views: 90, likes: 15 },
    { title: 'Code Review Best Practices', content: 'Making code reviews valuable...', user_id: createdUsers[2].id, category: 'Development', views: 220, likes: 45 },
  ];

  const createdPosts: Post[] = [];
  for (const post of posts) {
    const created = await postRepo.create({
      ...post,
      published: true,
      created_at: new Date().toISOString(),
    });
    createdPosts.push(created);
  }

  // Create comments
  const comments: Array<{
    content: string;
    user_id: number;
    post_id: number;
    rating: number;
    created_at: string;
  }> = [];

  for (let i = 0; i < 50; i++) {
    const randomUser = createdUsers[Math.floor(Math.random() * createdUsers.length)];
    const randomPost = createdPosts[Math.floor(Math.random() * createdPosts.length)];

    comments.push({
      content: `This is comment ${i + 1}. Great insights!`,
      user_id: randomUser.id,
      post_id: randomPost.id,
      rating: Math.floor(Math.random() * 5) + 1,
      created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(), // Random date within last 30 days
    });
  }

  for (const comment of comments) {
    await commentRepo.create(comment);
  }
}

// =============================================================================
// MAIN APPLICATION
// =============================================================================

async function main(): Promise<void> {
  console.log('🔍 NeatORM Advanced Queries Example\n');

  try {
    // Setup database
    const adapter = new SimpleSQLiteAdapter({ database: ':memory:' });
    await adapter.connect();
    await setupDatabase(adapter);

    console.log('✅ Database setup complete');

    // Initialize repositories and services
    const userRepo = new SimpleRepository<User>(adapter, 'users');
    const postRepo = new SimpleRepository<Post>(adapter, 'posts');
    const commentRepo = new SimpleRepository<Comment>(adapter, 'comments');

    const queryService = new AdvancedQueryService(userRepo, postRepo, commentRepo);

    console.log('✅ Services initialized');

    // Seed sample data
    console.log('\n🌱 Seeding sample data...');
    await seedSampleData(userRepo, postRepo, commentRepo);
    console.log('✅ Sample data seeded');

    // ========================================
    // COMPLEX WHERE CONDITIONS
    // ========================================

    console.log('\n🎯 Complex WHERE Conditions:');

    const complexUsers = await queryService.findUsersWithComplexConditions();
    console.log(`✅ Found ${complexUsers.length} users matching complex criteria:`);
    complexUsers.forEach(user => {
      console.log(`   ${user.name} (${user.department}) - $${user.salary}, Age: ${user.age}`);
    });

    // ========================================
    // AGGREGATION QUERIES
    // ========================================

    console.log('\n📊 Aggregation Queries - Department Statistics:');

    const deptStats = await queryService.getDepartmentStats();
    deptStats.forEach(stat => {
      console.log(`🏢 ${stat.department}:`);
      console.log(`   👥 ${stat.userCount} users, 💰 Avg Salary: $${stat.avgSalary}`);
      console.log(`   📈 Total Salary: $${stat.totalSalary}, 🎂 Age Range: ${stat.minAge}-${stat.maxAge}`);
    });

    // ========================================
    // JOIN-LIKE OPERATIONS
    // ========================================

    console.log('\n🔗 Join-like Operations - Posts with Authors:');

    const postsWithAuthors = await queryService.getPostsWithAuthors(5);
    postsWithAuthors.forEach(({ post, author, commentCount, avgRating }) => {
      console.log(`📄 "${post.title}" by ${author.name} (${post.category})`);
      console.log(`   👁️ ${post.views} views, 👍 ${post.likes} likes, 💬 ${commentCount} comments, ⭐ ${avgRating}/5 avg rating`);
    });

    // ========================================
    // PAGINATION
    // ========================================

    console.log('\n📄 Pagination Example:');

    const page1 = await queryService.getPostsPaginated(1, 3);
    console.log(`📖 Page 1 of ${page1.totalPages} (${page1.total} total posts):`);
    console.log(`   Has prev: ${page1.hasPrev}, Has next: ${page1.hasNext}`);
    page1.posts.forEach(post => {
      console.log(`   "${post.title}" (${post.views} views)`);
    });

    const page2 = await queryService.getPostsPaginated(2, 3);
    console.log(`\n📖 Page 2 of ${page2.totalPages}:`);
    console.log(`   Has prev: ${page2.hasPrev}, Has next: ${page2.hasNext}`);
    page2.posts.forEach(post => {
      console.log(`   "${post.title}" (${post.views} views)`);
    });

    // ========================================
    // SEARCH FUNCTIONALITY
    // ========================================

    console.log('\n🔍 Search Functionality:');

    const searchResults = await queryService.searchPosts('typescript');
    console.log(`✅ Found ${searchResults.length} posts matching "typescript":`);
    searchResults.slice(0, 3).forEach(post => {
      console.log(`   "${post.title}" (${post.views} views)`);
    });

    const categorySearch = await queryService.searchPosts('best', 'Frontend');
    console.log(`\n✅ Found ${categorySearch.length} posts matching "best" in Frontend category:`);
    categorySearch.forEach(post => {
      console.log(`   "${post.title}" (${post.category})`);
    });

    // ========================================
    // ANALYTICS & REPORTING
    // ========================================

    console.log('\n📈 Analytics & Reporting:');

    const analytics = await queryService.getAnalytics();
    console.log('📊 Platform Overview:');
    console.log(`   👥 ${analytics.totalUsers} users`);
    console.log(`   📝 ${analytics.totalPosts} posts`);
    console.log(`   💬 ${analytics.totalComments} comments`);
    console.log(`   📈 ${analytics.avgPostsPerUser} posts per user`);
    console.log(`   💬 ${analytics.avgCommentsPerPost} comments per post`);

    console.log('\n🏆 Top Categories:');
    analytics.topCategories.slice(0, 3).forEach(cat => {
      console.log(`   ${cat.category}: ${cat.count} posts`);
    });

    console.log('\n👑 Most Active Users:');
    analytics.mostActiveUsers.slice(0, 3).forEach(({ user, postCount }) => {
      console.log(`   ${user.name}: ${postCount} posts`);
    });

    console.log('\n🔥 Trending Posts:');
    analytics.trendingPosts.slice(0, 3).forEach(post => {
      console.log(`   "${post.title}": ${post.views} views, ${post.likes} likes`);
    });

    // ========================================
    // COMPLEX AGGREGATIONS
    // ========================================

    console.log('\n⚡ Complex Aggregations - Posts with Engagement Scores:');

    const complexAggregations = await queryService.getPostsWithComplexAggregations();
    complexAggregations.slice(0, 5).forEach(result => {
      console.log(`📈 "${result.title}" by ${result.authorName}`);
      console.log(`   📊 Engagement: ${result.engagement}, 💬 ${result.commentCount} comments, ⭐ ${result.avgRating} avg rating`);
    });

    // ========================================
    // RAW SQL DEMONSTRATION
    // ========================================

    console.log('\n💻 Raw SQL Queries:');

    // Custom analytics query
    const rawResults = await commentRepo.rawQuery(`
      SELECT
        strftime('%Y-%m', created_at) as month,
        COUNT(*) as comment_count,
        AVG(rating) as avg_rating
      FROM comments
      WHERE created_at >= date('now', '-30 days')
      GROUP BY strftime('%Y-%m', created_at)
      ORDER BY month DESC
    `);

    console.log('📅 Monthly comment analytics:');
    rawResults.forEach(row => {
      console.log(`   ${row.month}: ${row.comment_count} comments, ⭐ ${Math.round(row.avg_rating * 10) / 10} avg rating`);
    });

    // Cleanup
    await adapter.disconnect();
    console.log('\n✅ Database disconnected');

    console.log('\n🎉 Advanced queries example completed successfully!');
    console.log('✅ Demonstrated: Complex WHERE conditions with operators');
    console.log('✅ Demonstrated: Aggregation and grouping');
    console.log('✅ Demonstrated: Join-like operations');
    console.log('✅ Demonstrated: Pagination with metadata');
    console.log('✅ Demonstrated: Search functionality');
    console.log('✅ Demonstrated: Analytics and reporting');
    console.log('✅ Demonstrated: Raw SQL queries');

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// =============================================================================
// RUN THE EXAMPLE
// =============================================================================

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
