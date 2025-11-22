import { Injectable } from '@nestjs/common';
import type { HealthStatus } from '../../common/health/health.service';
import type { ControllerResponse, HealthResponse, ReadinessResponse } from '../../types/api';

export interface ApiInfo {
  message: string;
  version: string;
  docs: string;
  api: string;
  health: string;
}

export interface MetricsData {
  uptime: number;
  memory: NodeJS.MemoryUsage;
  version: string;
  timestamp: string;
}

@Injectable()
export class AppResponsePresenter {
  toApiInfoResponse(data: ApiInfo): ControllerResponse<ApiInfo> {
    return {
      success: true,
      data,
    };
  }

  toHealthResponse(healthStatus: HealthStatus): HealthResponse {
    return {
      success: true,
      data: healthStatus,
    };
  }

  toReadinessResponse(readinessStatus: {
    status: 'ready' | 'not ready';
    timestamp: string;
    database: 'connected' | 'disconnected' | 'unknown';
  }): ReadinessResponse {
    return {
      success: readinessStatus.status === 'ready',
      data: readinessStatus,
    };
  }

  toMetricsResponse(metrics: MetricsData): ControllerResponse<MetricsData> {
    return {
      success: true,
      data: metrics,
    };
  }
}
