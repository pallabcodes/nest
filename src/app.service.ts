import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    @Optional() @Inject(getConnectionToken()) private readonly sequelize?: Sequelize,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  async checkReadiness(): Promise<{
    status: string;
    database: string;
    timestamp: string;
  }> {
    try {
      if (this.sequelize && typeof this.sequelize.authenticate === 'function') {
        await this.sequelize.authenticate();
        return {
          status: 'ready',
          database: 'connected',
          timestamp: new Date().toISOString(),
        };
      }

      this.logger.warn('Sequelize instance not available');
      return {
        status: 'ready',
        database: 'unknown',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.warn('Database readiness check failed:', error);
      return {
        status: 'not ready',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
      };
    }
  }
}
