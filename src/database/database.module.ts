import { Module, Global, Logger } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getDatabaseConfig } from '../config/database.config';
import { TransactionUtil } from './utils/transaction.util';

/**
 * DatabaseModule - Global module for database connection
 * 
 * IMPORTANT: Do NOT register models here!
 * Models should be registered in feature modules where they're used.
 * 
 * Example in auth.module.ts:
 * ```typescript
 * @Module({
 *   imports: [
 *     SequelizeModule.forFeature([User, Role, UserRole]),
 *   ],
 * })
 * ```
 * 
 * This pattern:
 * - Makes dependencies explicit
 * - Follows NestJS best practices
 * - Prevents circular dependencies
 * - Matches interview-sandbox pattern
 */
@Global()
@Module({
  imports: [
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const logger = new Logger('DatabaseModule');
        const config = getDatabaseConfig(configService);
        const dialect = config.dialect || 'mysql';
        const dbName = dialect === 'postgres' ? 'PostgreSQL' : 'MySQL';

        // Log database connection attempt
        logger.log(
          `Attempting to connect to ${dbName} at ${config.host}:${config.port}/${config.database}`,
        );
        logger.log(`Database dialect: ${dialect}`);
        logger.log(`If connection fails, ensure ${dbName} is running:`);

        if (dialect === 'postgres') {
          logger.log(`  - Docker: docker-compose up -d postgres`);
          logger.log(`  - Or start PostgreSQL service locally`);
        } else {
          logger.log(`  - Docker: docker-compose up -d mysql`);
          logger.log(`  - Or start MySQL service locally`);
        }

        return config;
      },
      inject: [ConfigService],
    }),
  ],
  providers: [TransactionUtil],
  exports: [SequelizeModule, TransactionUtil],
})
export class DatabaseModule {}
