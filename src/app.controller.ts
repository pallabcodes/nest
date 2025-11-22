import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './common/health/health.service';
import {
  AppResponsePresenter,
  type ApiInfo,
  type MetricsData,
} from './app/presenters/app-response.presenter';
import { Public } from './common/decorators/public.decorator';
import type { HealthResponse, ReadinessResponse, ControllerResponse } from './types/api';

@ApiTags('App')
@Controller()
export class AppController {
  constructor(
    private readonly healthService: HealthService,
    private readonly responsePresenter: AppResponsePresenter,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get API information' })
  @ApiResponse({ status: 200, description: 'API information' })
  getHello(): ControllerResponse<ApiInfo> {
    return this.responsePresenter.toApiInfoResponse({
      message: 'Sandbox API',
      version: '1.0.0',
      docs: '/api-docs',
      api: '/api',
      health: '/api/health',
    });
  }

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Health check with metrics' })
  @ApiResponse({ status: 200, description: 'Service health status with metrics' })
  async getHealth(): Promise<HealthResponse> {
    const healthStatus = await this.healthService.getHealthStatus();
    return this.responsePresenter.toHealthResponse(healthStatus);
  }

  @Public()
  @Get('ready')
  @ApiOperation({ summary: 'Readiness check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  async getReady(): Promise<ReadinessResponse> {
    const readinessStatus = await this.healthService.getReadinessStatus();
    return this.responsePresenter.toReadinessResponse(readinessStatus);
  }

  @Public()
  @Get('metrics')
  @ApiOperation({ summary: 'Basic metrics endpoint' })
  @ApiResponse({ status: 200, description: 'Application metrics' })
  getMetrics(): ControllerResponse<MetricsData> {
    const metrics = this.healthService.getMetrics();
    return this.responsePresenter.toMetricsResponse(metrics);
  }
}
