import { Module, Global, Logger } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getDatabaseConfig } from '../config/database.config';
import { TransactionUtil } from './utils/transaction.util';

@Global()
@Module({
  imports: [
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const logger = new Logger('DatabaseModule');
        const config = getDatabaseConfig(configService);
        const dialect = config.dialect ?? 'mysql';
        const dbName = dialect === 'postgres' ? 'PostgreSQL' : 'MySQL';
        logger.log(`Connecting to ${dbName} at ${config.host}:${config.port}/${config.database}`);
        return config;
      },
      inject: [ConfigService],
    }),
  ],
  providers: [TransactionUtil],
  exports: [SequelizeModule, TransactionUtil],
})
export class DatabaseModule {}
