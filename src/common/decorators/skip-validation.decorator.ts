import { SetMetadata } from '@nestjs/common';

export const SKIP_VALIDATION_KEY = 'skip_validation';

/**
 * SkipValidation decorator
 *
 * Use this on DTOs that should bypass ValidationPipe validation
 * Useful for bulk operations that need flexible data structures
 */
export const SkipValidation = () => SetMetadata(SKIP_VALIDATION_KEY, true);
