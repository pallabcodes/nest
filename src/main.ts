import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { AppBootstrapService } from '@common/bootstrap/app-bootstrap.service';
import { AppShutdownHandler } from '@common/bootstrap/app-shutdown.handler';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // configuration for the application
  const bootstrapService = AppBootstrapService.create(app, configService);
  bootstrapService.configure();

  // start server
  const port = bootstrapService.getPort();
  await app.listen(port);

  // log the startup information
  bootstrapService.logStartupInfo(port);

  // Setup graceful shutdown handlers
  AppShutdownHandler.handle(app);
}

void bootstrap();
