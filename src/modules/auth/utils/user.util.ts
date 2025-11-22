import { Injectable } from '@nestjs/common';

/**
 * User Utility
 *
 * User-related validations and transformations.
 * Keeps business logic out of services.
 */
@Injectable()
export class UserUtil {
  /**
   * Validate email format
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone number format
   */
  isValidPhone(phone: string): boolean {
    // Basic international phone validation
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone.replace(/\s+/g, ''));
  }

  /**
   * Sanitize user input
   */
  sanitizeInput(input: string): string {
    return input.trim().toLowerCase();
  }

  /**
   * Format user display name
   */
  formatDisplayName(firstName?: string, lastName?: string): string {
    if (!firstName && !lastName) return 'User';
    return [firstName, lastName].filter(Boolean).join(' ');
  }

  /**
   * Check if user account is active
   */
  isAccountActive(isActive: boolean | undefined, isEmailVerified: boolean): boolean {
    return (isActive !== undefined ? isActive : true) && isEmailVerified;
  }

  /**
   * Generate default user profile
   */
  getDefaultProfile(): {
    isActive: boolean;
    isEmailVerified: boolean;
    roles: string[];
  } {
    return {
      isActive: true,
      isEmailVerified: false,
      roles: ['user'],
    };
  }
}
