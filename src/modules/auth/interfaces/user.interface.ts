/**
 * User Interface Definitions
 *
 * Type-safe interfaces for user-related operations.
 */

export interface CreateUserData {
  email: string;
  password: string;
  name?: string;
  phone?: string;
  isEmailVerified?: boolean;
  isActive?: boolean;
}

export interface UpdateUserData {
  name?: string;
  phone?: string;
  password?: string;
  isEmailVerified?: boolean;
  isActive?: boolean;
  lastLoginAt?: Date;
}

export interface UserProfile {
  id: number;
  email: string;
  name: string | null;
  phone: string | null;
  isEmailVerified: boolean;
  isActive: boolean;
  roles: string[];
  createdAt: Date;
  updatedAt: Date;
}
