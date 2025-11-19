import { Injectable } from '@nestjs/common';
import { BaseResponseMapper } from '@common/mappers/base-response-mapper';

/**
 * ProductResponseMapper
 *
 * Maps product-related domain entities/DTOs to API response format.
 */
@Injectable()
export class ProductResponseMapper extends BaseResponseMapper<any, any> {
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
      message: 'Product created successfully',
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
      message: 'Product updated successfully',
      data: domain,
    };
  }

  /**
   * Override toListResponse to return domains directly (no wrapping)
   * This prevents double-wrapping in paginated responses
   */
  toListResponse(domains: any[]): any[] {
    return domains; // Return domains directly without wrapping
  }

  /**
   * Override toPaginatedResponse to use custom toListResponse
   * Returns domains directly without wrapping each item
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
      data: this.toListResponse(domains), // Use overridden toListResponse (returns domains directly)
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
