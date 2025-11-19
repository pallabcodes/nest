import { IResponseMapper } from './response-mapper.interface';

/**
 * Base ResponseMapper
 *
 * Provides default implementations that can be overridden
 * by specific controller mappers.
 */
export abstract class BaseResponseMapper<TDomain, TResponse>
  implements IResponseMapper<TDomain, TResponse>
{
  /**
   * Default implementation - can be overridden
   */
  abstract toResponse(domain: TDomain): TResponse;

  /**
   * Default CREATE response - usually same as toResponse
   * Override if CREATE needs different format
   */
  toCreateResponse(domain: TDomain): TResponse {
    return this.toResponse(domain);
  }

  /**
   * Default READ response - usually same as toResponse
   * Override if READ needs different format
   */
  toReadResponse(domain: TDomain): TResponse {
    return this.toResponse(domain);
  }

  /**
   * Default UPDATE response - usually same as toResponse
   * Override if UPDATE needs different format
   */
  toUpdateResponse(domain: TDomain): TResponse {
    return this.toResponse(domain);
  }

  /**
   * Default DELETE response - returns success message
   * Override if DELETE needs different format
   */
  toDeleteResponse(domain: TDomain | string | number): TResponse {
    const id = typeof domain === 'object' && domain !== null ? (domain as any).id : domain;

    return {
      success: true,
      message: 'Resource deleted successfully',
      id,
    } as TResponse;
  }

  /**
   * Transform array of domain entities
   */
  toListResponse(domains: TDomain[]): TResponse[] {
    return domains.map((domain) => this.toResponse(domain));
  }

  /**
   * Transform paginated results
   */
  toPaginatedResponse(
    domains: TDomain[],
    page: number,
    limit: number,
    total: number,
  ): {
    data: TResponse[];
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
