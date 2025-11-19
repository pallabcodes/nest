import { Injectable } from '@nestjs/common';
import { BaseResponseMapper } from '@common/mappers/base-response-mapper';
import { User } from '../../../database/models/user.model';

/**
 * UserResponseMapper
 *
 * Maps User-related domain entities/DTOs to API response format.
 */
@Injectable()
export class UserResponseMapper extends BaseResponseMapper<User, any> {
  /**
   * Transform domain entity to API response format
   */
  toResponse(domain: User): any {
    const { password, ...userWithoutPassword } = domain.toJSON();
    return userWithoutPassword;
  }

  /**
   * Override if CREATE needs different format
   */
  toCreateResponse(domain: User): any {
    return {
      success: true,
      message: 'User created successfully',
      data: this.toResponse(domain),
    };
  }

  /**
   * Override if READ needs different format
   */
  toReadResponse(domain: User): any {
    return {
      success: true,
      data: this.toResponse(domain),
    };
  }

  /**
   * Override if UPDATE needs different format
   */
  toUpdateResponse(domain: User): any {
    return {
      success: true,
      message: 'User updated successfully',
      data: this.toResponse(domain),
    };
  }

  /**
   * Paginated response
   */
  toPaginatedResponse(
    data: User[],
    page: number,
    limit: number,
    total: number,
  ): any {
    return {
      items: data.map((user) => this.toResponse(user)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Override toListResponse to return domains directly (no wrapping)
   */
  toListResponse(domains: User[]): any[] {
    return domains.map((user) => this.toResponse(user));
  }

  /**
   * Delete response
   */
  toDeleteResponse(id: number): any {
    return {
      success: true,
      message: 'User deleted successfully',
      data: { id },
    };
  }
}
