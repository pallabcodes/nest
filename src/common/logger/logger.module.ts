import { Module, Global } from '@nestjs/common';
import { LoggerService } from './logger.service';
import { LogCleanupService } from './services/log-cleanup.service';

@Global()
@Module({
  providers: [LoggerService, LogCleanupService],
  exports: [LoggerService],
})
export class LoggerModule {}
