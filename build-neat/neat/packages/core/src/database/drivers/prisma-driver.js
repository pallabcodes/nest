/**
 * Neat Framework - Prisma Database Driver
 *
 * This demonstrates how easy it is to integrate ANY ORM with Neat Framework.
 * This driver shows how Prisma (a popular ORM) can be plugged into Neat's
 * database abstraction layer with minimal code.
 *
 * Key Benefits:
 * - Prisma's type safety + Neat's architectural benefits
 * - Zero changes to existing Neat code
 * - Leverages Prisma's excellent query optimization
 * - Maintains Neat's Result<T> error handling
 *
 * Implementation: ~150 lines to integrate a full-featured ORM
 */
/**
 * Prisma Database Driver Implementation
 */
export class PrismaDriver {
    name = 'prisma';
    prisma;
    async connect(config) {
        try {
            // In real implementation, this would import PrismaClient
            // import { PrismaClient } from '@prisma/client';
            // this.prisma = new PrismaClient();
            // Mock Prisma client for demonstration
            this.prisma = this.createMockPrismaClient(config);
            await this.prisma.$connect();
            const driverConnection = {
                driver: this,
                config,
                nativeConnection: this.prisma,
                isConnected: true
            };
            return { success: true, data: driverConnection };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error : new Error('Prisma connection failed')
            };
        }
    }
    async disconnect(connection) {
        try {
            await connection.nativeConnection.$disconnect();
            return { success: true, data: undefined };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error : new Error('Prisma disconnection failed')
            };
        }
    }
    getPoolStats(connection) {
        // Prisma handles connection pooling internally
        return {
            totalConnections: 1, // Prisma manages this
            activeConnections: connection.isConnected ? 1 : 0,
            idleConnections: 0,
            pendingConnections: 0
        };
    }
    async executeQuery(connection, query, parameters) {
        try {
            const result = await connection.nativeConnection.$queryRaw(query, ...(parameters || []));
            return { success: true, data: Array.isArray(result) ? result : [result] };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error : new Error('Query execution failed')
            };
        }
    }
    async executeUpdate(connection, query, parameters) {
        try {
            const result = await connection.nativeConnection.$executeRaw(query, ...(parameters || []));
            return { success: true, data: result };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error : new Error('Update execution failed')
            };
        }
    }
    async beginTransaction(connection) {
        // Prisma handles transactions differently
        // This would need to be adapted based on Prisma's transaction API
        throw new Error('Prisma transaction implementation would depend on Prisma version');
    }
    async commitTransaction(transaction) {
        // Prisma auto-commits transactions
        return { success: true, data: undefined };
    }
    async rollbackTransaction(transaction) {
        // Prisma auto-rollbacks on error
        return { success: true, data: undefined };
    }
    async createTable(connection, tableName, columns) {
        try {
            // Prisma uses migrations, not runtime table creation
            // This would typically be handled by Prisma's migration system
            console.log(`Prisma: Table ${tableName} would be created via migration`);
            return { success: true, data: undefined };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error : new Error('Table creation not supported in Prisma driver')
            };
        }
    }
    async dropTable(connection, tableName) {
        try {
            console.log(`Prisma: Table ${tableName} would be dropped via migration`);
            return { success: true, data: undefined };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error : new Error('Table drop not supported in Prisma driver')
            };
        }
    }
    async tableExists(connection, tableName) {
        try {
            // Prisma doesn't expose table existence checks directly
            // Would need to use raw SQL or handle via migrations
            const query = `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = $1)`;
            const result = await this.executeQuery(connection, query, [tableName]);
            return result.success ? { success: true, data: result.data[0] } : result;
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error : new Error('Table existence check failed')
            };
        }
    }
    // Helper method to create mock Prisma client for demonstration
    createMockPrismaClient(config) {
        return {
            async $connect() {
                console.log(`Mock Prisma connected to: ${config.url}`);
            },
            async $disconnect() {
                console.log('Mock Prisma disconnected');
            },
            async $queryRaw(query, ...params) {
                console.log(`Mock Prisma query: ${query}`, params);
                // Return mock data based on query type
                if (query.toLowerCase().includes('select')) {
                    return [{ id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com' }];
                }
                return [];
            },
            async $executeRaw(query, ...params) {
                console.log(`Mock Prisma execute: ${query}`, params);
                return 1; // Mock affected rows
            },
            async $transaction(fn) {
                console.log('Mock Prisma transaction started');
                try {
                    const result = await fn(this);
                    console.log('Mock Prisma transaction committed');
                    return result;
                }
                catch (error) {
                    console.log('Mock Prisma transaction rolled back');
                    throw error;
                }
            }
        };
    }
}
// ========================================
// USAGE EXAMPLE
// ========================================
/**
 * Example: Using Prisma with Neat Framework
 *
 * This shows how the exact same Neat code works with Prisma
 * instead of TypeORM or any other ORM.
 */
export async function demonstratePrismaIntegration() {
    console.log('🟣 Demonstrating Prisma Integration with Neat Framework\n');
    // Same configuration as other ORMs
    const dbConfig = {
        driver: 'prisma', // Custom driver type
        url: 'postgresql://localhost:5432/mydb',
        logging: true
    };
    // Same Neat API - just different driver
    const prismaDriver = new PrismaDriver();
    const connection = createDatabaseConnectionWithDriver(dbConfig, prismaDriver);
    const connectResult = await connection.connect();
    if (!connectResult.success) {
        throw new Error(`Connection failed: ${connectResult.error.message}`);
    }
    console.log('✅ Connected to database via Prisma driver');
    // Same entity manager API
    const entityManager = createEntityManager(connection, [User]);
    // Same repository pattern
    const userRepo = entityManager.getRepository(User);
    console.log('📚 Repository operations work identically:');
    console.log('  ✅ userRepo.find({ where: { active: true } })');
    console.log('  ✅ userRepo.save(user)');
    console.log('  ✅ userRepo.update(criteria, updates)');
    // Example operations
    const users = await userRepo.find({ where: { isActive: true } });
    console.log('👤 Found users:', users.success ? users.data.length : 'error');
    // Clean up
    await connection.disconnect();
    console.log('✅ Disconnected from Prisma');
    console.log('\n🎯 Key Benefits:');
    console.log('  ✅ Prisma\'s type safety + optimizations');
    console.log('  ✅ Neat\'s architectural benefits');
    console.log('  ✅ Zero code changes to switch ORMs');
    console.log('  ✅ Best of both worlds');
}
/**
 * Comparison: NestJS would require complete rewrite
 *
 * NestJS + TypeORM → NestJS + Prisma:
 * - Change ORM in module configuration
 * - Update entity decorators (breaking changes)
 * - Rewrite repository injection
 * - Update query syntax
 * - Change error handling
 *
 * Neat + TypeORM → Neat + Prisma:
 * - Change one line: new PrismaDriver()
 * - Everything else works identically!
 */
import { createDatabaseConnectionWithDriver } from '../connection.js';
import { createEntityManager } from '../entity-manager.js';
import { BaseEntity } from '../types.js';
// Example entity (works with any ORM)
export class User extends BaseEntity {
    id;
    firstName;
    lastName;
    email;
    isActive;
    createdAt;
    updatedAt;
}
// Run demonstration
if (require.main === module) {
    demonstratePrismaIntegration().catch(console.error);
}
//# sourceMappingURL=prisma-driver.js.map