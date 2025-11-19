// Mock types for @neat/core to allow middleware package to build independently

export interface HttpRequest {
  method: string;
  url: string;
  path?: string;
  query?: Record<string, any>;
  params?: Record<string, string>;
  body?: any;
  headers?: Record<string, string>;
  ip?: string;
}

export interface HttpResponse {
  status?: number;
  headers?: Record<string, string>;
  body?: any;
}

export declare const Injectable: any;

// Mock scanner for middleware auto-discovery
export const scanner = {
  scanForGuards: () => Promise.resolve([]),
  scanForPipes: () => Promise.resolve([]),
  scanForInterceptors: () => Promise.resolve([]),
  scanForExceptionFilters: () => Promise.resolve([])
};
