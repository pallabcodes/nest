import { Injectable } from '@nestjs/common';
import { BaseResponsePresenter } from '@common/presenters/base-response-presenter';
import { User } from '../../../database/models/user.model';
import type { PaginationMeta } from '@shared-types/api';

/**
 * User response data type (user without password and Sequelize methods)
 */
export type UserResponseData = {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  isEmailVerified: boolean;
  isActive: boolean;
  avatar: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null; // Only present for soft-deleted records
};

/**
 * UserResponsePresenter
 *
 * Presents User domain entities in clean API response formats.
 *
 * EXTENSIBILITY: Easy to modify for new requirements:
 * - Override any method for custom formatting
 * - Add new methods for specific use cases
 * - Modify fields included/excluded
 * - Add computed fields if needed
 */
@Injectable()
export class UserResponsePresenter extends BaseResponsePresenter<User, UserResponseData> {
  // Configuration for easy modification
  protected readonly config = {
    excludeFields: ['password'] as (keyof User)[],
    includeComputedFields: false,
  };

  /**
   * Core transformation: Remove sensitive fields, apply formatting
   * Override this method to change what gets excluded/included globally
   */
  protected transform(domain: User): UserResponseData {
    const raw = domain.toJSON() as UserResponseData & { password?: string };

    // Remove sensitive fields
    const { password, ...clean } = raw;

    // Add computed fields if configured (for future extensibility)
    if (this.config.includeComputedFields) {
      // Example: Add computed fields here when needed
      // clean.displayName = `${clean.name} (${clean.email})`;
    }

    return clean;
  }

  /**
   * Standard user mapping (removes passwords)
   */
  map(domain: User): UserResponseData {
    return this.transform(domain);
  }

  /**
   * Abstract method implementation (fallback to map)
   */
  toResponse(domain: User): UserResponseData {
    return this.map(domain);
  }

  /**
   * Create operation response
   */
  create(domain: User): UserResponseData {
    return this.map(domain);
  }

  /**
   * Read operation response
   */
  read(domain: User): UserResponseData {
    return this.map(domain);
  }

  /**
   * Update operation response
   */
  update(domain: User): UserResponseData {
    return this.map(domain);
  }

  /**
   * Delete confirmation response (minimal data)
   */
  delete(id: number | User): UserResponseData {
    const userId = typeof id === 'number' ? id : id.id;
    return {
      id: userId,
      email: '',
      name: '',
      phone: null,
      isEmailVerified: false,
      isActive: false,
      avatar: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Paginated list response
   * Override this method to change pagination structure
   */
  paginate(data: User[], page: number, limit: number, total: number) {
    const items = data.map((user) => this.map(user));
    const totalPages = Math.ceil(total / limit);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      data: items, // Duplicate for backward compatibility
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Multiple users response
   */
  list(domains: User[]): UserResponseData[] {
    return domains.map((user) => this.map(user));
  }
}
