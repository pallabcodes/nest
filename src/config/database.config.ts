import { SequelizeModuleOptions } from '@nestjs/sequelize';
import { ConfigService } from '@nestjs/config';

export const getDatabaseConfig = (configService: ConfigService): SequelizeModuleOptions => {
  const dialect = configService.get<string>('database.dialect') || 'mysql';
  const retryConfig = configService.get('database.retry');
  const isPostgres = dialect === 'postgres';
  
  const baseConfig: SequelizeModuleOptions = {
    dialect: dialect as 'mysql' | 'postgres',
    host: configService.get<string>('database.host'),
    port: configService.get<number>('database.port'),
    username: configService.get<string>('database.username'),
    password: configService.get<string>('database.password'),
    database: configService.get<string>('database.database'),
    autoLoadModels: true,
    synchronize: false, // Use migrations in production
    logging: configService.get<string>('app.env') === 'development' ? console.log : false,
    pool: configService.get('database.pool'),
    retry: {
      max: retryConfig?.max || 10,
      match: [
        /ETIMEDOUT/,
        /EHOSTUNREACH/,
        /ECONNRESET/,
        /ECONNREFUSED/,
        /ETIMEDOUT/,
        /ESOCKETTIMEDOUT/,
        /EHOSTUNREACH/,
        /EPIPE/,
        /EAI_AGAIN/,
        /SequelizeConnectionError/,
        /SequelizeConnectionRefusedError/,
        /SequelizeHostNotFoundError/,
        /SequelizeHostNotReachableError/,
        /SequelizeInvalidConnectionError/,
        /SequelizeConnectionTimedOutError/,
      ],
    },
    dialectOptions: {
      connectTimeout: 10000,
    },
  };

  // PostgreSQL-specific configuration
  if (isPostgres) {
    baseConfig.dialectOptions = {
      ...baseConfig.dialectOptions,
      ssl: configService.get<string>('database.ssl') === 'true' ? {
        rejectUnauthorized: false,
      } : false,
    };
  }

  return baseConfig;
};