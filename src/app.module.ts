import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppResponsePresenter } from './app/presenters/app-response.presenter';
import { DatabaseModule } from './database/database.module';
import { LoggerModule } from './common/logger/logger.module';
import { CacheModule } from './common/cache/cache.module';
import { HealthModule } from './common/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { CacheInterceptor } from './common/cache/cache.interceptor';
import configuration from './config/configuration';
import { UserModule } from '@modules/user/user.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { BusinessExceptionFilter } from './common/filters/business-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : '.env',
    }),
    LoggerModule,
    DatabaseModule,
    CacheModule,
    HealthModule,
    AuthModule,
    UserModule,
    PaymentsModule,
  ],
  controllers: [AppController],
  providers: [
    AppResponsePresenter,
    {
      provide: APP_FILTER,
      useClass: BusinessExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter, // global exception filter for all requests
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor, // global interceptor to transform any response before it goes to the client
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor, // global interceptor to log the request and response
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor, // cache the response
    },
  ],
})
export class AppModule {}
