/**
 * ResponsePresenter Interface
 *
 * Each controller should have its own ResponsePresenter implementation
 * to transform domain entities/DTOs into standardized API responses.
 *
 * This ensures:
 * - Consistent response formats across endpoints
 * - Easy to match expected response formats (assignments, API contracts)
 * - Separation of concerns (controllers don't format responses)
 * - Easy to change response format without touching business logic
 */
export interface IResponsePresenter<TDomain, TResponse> {
  /**
   * Transform domain entity/DTO to API response format
   */
  toResponse(domain: TDomain): TResponse;

  /**
   * Transform for CREATE operations (201 Created)
   * Usually includes created resource and location header info
   */
  toCreateResponse(domain: TDomain): TResponse;

  /**
   * Transform for READ operations (200 OK)
   * Usually returns the resource data
   */
  toReadResponse(domain: TDomain): TResponse;

  /**
   * Transform for UPDATE operations (200 OK)
   * Usually returns updated resource
   */
  toUpdateResponse(domain: TDomain): TResponse;

  /**
   * Transform for DELETE operations (200 OK or 204 No Content)
   * Usually returns success message or deleted resource ID
   */
  toDeleteResponse(domain: TDomain | string | number): TResponse;

  /**
   * Transform array of domain entities to array response
   */
  toListResponse(domains: TDomain[]): TResponse[];

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
  };
}
