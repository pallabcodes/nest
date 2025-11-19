/**
 * SQL Server Example for NeatORM
 *
 * Demonstrates basic usage of NeatORM with SQL Server database.
 * This example shows how to connect to SQL Server, create tables,
 * perform CRUD operations, and handle transactions.
 *
 * Prerequisites:
 * - SQL Server instance running
 * - Database created
 * - User with appropriate permissions
 */

import {
  createAdapter,
  Entity,
  Column,
  PrimaryKey,
  Generated,
  Repository,
  BaseRepository,
} from '../src/index.js';

// =============================================================================
// ENTITY DEFINITIONS
// =============================================================================

/**
 * User entity for SQL Server
 */
@Entity('users')
class User {
  @PrimaryKey()
  @Generated()
  @Column({ type: 'int', generated: 'identity' })
  id!: number;

  @Column({ type: 'nvarchar', length: 100 })
  name!: string;

  @Column({ type: 'nvarchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'int', default: 0 })
  age!: number;

  @Column({ type: 'datetime2', default: 'GETDATE()' })
  createdAt!: Date;
}

/**
 * Product entity for SQL Server
 */
@Entity('products')
class Product {
  @PrimaryKey()
  @Generated()
  @Column({ type: 'int', generated: 'identity' })
  id!: number;

  @Column({ type: 'nvarchar', length: 200 })
  name!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price!: number;

  @Column({ type: 'int', default: 0 })
  stock!: number;

  @Column({ type: 'datetime2', default: 'GETDATE()' })
  createdAt!: Date;
}

// =============================================================================
// REPOSITORY DEFINITIONS
// =============================================================================

@Repository(User)
class UserRepository extends BaseRepository<User> {
  async findByEmail(email: string): Promise<User | null> {
    const result = await this.find({
      where: { email },
      limit: 1,
    });
    return result[0] || null;
  }

  async findAdults(): Promise<User[]> {
    return this.find({
      where: { age: { $gte: 18 } },
    });
  }
}

@Repository(Product)
class ProductRepository extends BaseRepository<Product> {
  async findInStock(): Promise<Product[]> {
    return this.find({
      where: { stock: { $gt: 0 } },
    });
  }

  async findByPriceRange(min: number, max: number): Promise<Product[]> {
    return this.find({
      where: {
        price: { $gte: min, $lte: max },
      },
    });
  }
}

// =============================================================================
// MAIN APPLICATION
// =============================================================================

async function main() {
  console.log('🚀 NeatORM SQL Server Example\n');

  try {
    // Create SQL Server adapter
    const adapter = createAdapter({
      dialect: 'sqlserver',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '1433'),
      database: process.env.DB_NAME || 'neatorm_test',
      user: process.env.DB_USER || 'sa',
      password: process.env.DB_PASSWORD || 'YourStrong!Passw0rd',
      ssl: false, // Disable SSL for local development
    });

    console.log('✅ SQL Server adapter created');

    // Connect to database
    await adapter.connect();
    console.log('✅ Connected to SQL Server database');

    // Initialize repositories
    const userRepo = new UserRepository(adapter);
    const productRepo = new ProductRepository(adapter);
    console.log('✅ Repositories initialized');

    // Create tables
    console.log('\n📝 Creating tables...');

    await adapter.execute(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users' AND xtype='U')
      CREATE TABLE users (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(100) NOT NULL,
        email NVARCHAR(255) UNIQUE NOT NULL,
        age INT DEFAULT 0,
        createdAt DATETIME2 DEFAULT GETDATE()
      )
    `);

    await adapter.execute(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='products' AND xtype='U')
      CREATE TABLE products (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(200) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        stock INT DEFAULT 0,
        createdAt DATETIME2 DEFAULT GETDATE()
      )
    `);

    console.log('✅ Tables created');

    // CRUD Operations - Users
    console.log('\n👥 User CRUD Operations:');

    // Create users
    const user1 = await userRepo.create({
      name: 'Alice Johnson',
      email: 'alice@example.com',
      age: 28,
    });

    const user2 = await userRepo.create({
      name: 'Bob Smith',
      email: 'bob@example.com',
      age: 35,
    });

    const user3 = await userRepo.create({
      name: 'Charlie Brown',
      email: 'charlie@example.com',
      age: 16,
    });

    console.log(`✅ Created users: ${user1.name}, ${user2.name}, ${user3.name}`);

    // Read operations
    const allUsers = await userRepo.find();
    console.log(`✅ Total users: ${allUsers.length}`);

    const adults = await userRepo.findAdults();
    console.log(`✅ Adult users: ${adults.length}`);

    const alice = await userRepo.findByEmail('alice@example.com');
    console.log(`✅ Found Alice: ${alice?.name}`);

    // Update operation
    if (alice) {
      await userRepo.update(alice.id, { age: 29 });
      console.log('✅ Updated Alice age to 29');
    }

    // CRUD Operations - Products
    console.log('\n📦 Product CRUD Operations:');

    // Create products
    const product1 = await productRepo.create({
      name: 'Wireless Headphones',
      price: 199.99,
      stock: 50,
    });

    const product2 = await productRepo.create({
      name: 'Bluetooth Speaker',
      price: 79.99,
      stock: 25,
    });

    const product3 = await productRepo.create({
      name: 'USB Cable',
      price: 9.99,
      stock: 0, // Out of stock
    });

    console.log(`✅ Created products: ${product1.name}, ${product2.name}, ${product3.name}`);

    // Product queries
    const inStockProducts = await productRepo.findInStock();
    console.log(`✅ Products in stock: ${inStockProducts.length}`);

    const midRangeProducts = await productRepo.findByPriceRange(50, 150);
    console.log(`✅ Mid-range products ($50-$150): ${midRangeProducts.length}`);

    // Transaction Example
    console.log('\n🔄 Transaction Example:');

    const transaction = await adapter.beginTransaction();

    try {
      // Simulate a business transaction
      const orderTotal = product1.price + product2.price;

      await transaction.execute(`
        INSERT INTO orders (userId, total, status, createdAt)
        VALUES (@p0, @p1, @p2, GETDATE())
      `, [user1.id, orderTotal, 'pending']);

      // Update stock levels
      await transaction.execute(`
        UPDATE products SET stock = stock - 1 WHERE id = @p0
      `, [product1.id]);

      await transaction.execute(`
        UPDATE products SET stock = stock - 1 WHERE id = @p0
      `, [product2.id]);

      await transaction.commit();
      console.log('✅ Transaction completed successfully');

    } catch (error) {
      await transaction.rollback();
      console.log('❌ Transaction rolled back:', error);
    }

    // Advanced Queries
    console.log('\n🔍 Advanced Queries:');

    // Complex WHERE with multiple conditions
    const result = await adapter.execute(`
      SELECT u.name, u.email, COUNT(o.id) as orderCount
      FROM users u
      LEFT JOIN orders o ON u.id = o.userId
      WHERE u.age >= @p0 AND u.createdAt >= DATEADD(day, -30, GETDATE())
      GROUP BY u.id, u.name, u.email
      HAVING COUNT(o.id) > 0
      ORDER BY orderCount DESC
    `, [18]);

    console.log(`✅ Complex query found ${result.rows.length} results`);

    // Cleanup (optional - comment out for persistent data)
    console.log('\n🧹 Cleanup:');
    await adapter.execute('DROP TABLE IF EXISTS orders');
    await adapter.execute('DELETE FROM products');
    await adapter.execute('DELETE FROM users');
    console.log('✅ Test data cleaned up');

    // Disconnect
    await adapter.disconnect();
    console.log('✅ Disconnected from SQL Server');

    console.log('\n🎉 SQL Server example completed successfully!');
    console.log('✅ Demonstrated: Connection, CRUD operations, transactions, complex queries');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the example
main();
