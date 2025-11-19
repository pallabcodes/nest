import { Injectable } from '@nestjs/common';
import { BaseResponseMapper } from '@common/mappers/base-response-mapper';

/**
 * DepartmentResponseMapper
 *
 * Maps department-related domain entities/DTOs to API response format.
 */
@Injectable()
export class DepartmentResponseMapper extends BaseResponseMapper<any, any> {
  /**
   * Transform domain entity to API response format
   */
  toResponse(domain: any): any {
    return {
      success: true,
      data: domain,
    };
  }

  /**
   * Override if CREATE needs different format
   */
  toCreateResponse(domain: any): any {
    return {
      success: true,
      message: 'Department created successfully',
      data: domain,
    };
  }

  /**
   * Override if READ needs different format
   */
  toReadResponse(domain: any): any {
    return {
      success: true,
      data: domain,
    };
  }

  /**
   * Override if UPDATE needs different format
   */
  toUpdateResponse(domain: any): any {
    return {
      success: true,
      message: 'Department updated successfully',
      data: domain,
    };
  }

  /**
   * Override toListResponse to return domains directly (no wrapping)
   */
  toListResponse(domains: any[]): any[] {
    return domains;
  }

  /**
   * Override toPaginatedResponse to use custom toListResponse
   */
  toPaginatedResponse(
    domains: any[],
    page: number,
    limit: number,
    total: number,
  ): {
    data: any[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  } {
    return {
      data: this.toListResponse(domains),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
