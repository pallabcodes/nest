import { IResponsePresenter } from './response-presenter.interface';

/**
 * Base ResponsePresenter
 *
 * Provides default implementations that can be overridden
 * by specific controller presenters.
 *
 * TDomain: Domain entity type (must have an id property)
 * TResponse: API response type
 */
export abstract class BaseResponsePresenter<TDomain extends { id: string | number }, TResponse>
  implements IResponsePresenter<TDomain, TResponse>
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
    const id =
      typeof domain === 'object' && domain !== null && 'id' in domain
        ? (domain as { id: string | number }).id
        : domain;

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
