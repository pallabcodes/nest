import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

/**
 * SkipValidationForBulkPipe
 * 
 * Completely bypasses ValidationPipe by returning the value as-is
 * This is used for bulk operations that need flexible data structures
 */
@Injectable()
export class SkipValidationForBulkPipe implements PipeTransform<any> {
  transform(value: any, metadata: ArgumentMetadata) {
    // Return value as-is, completely bypassing validation
    return value;
  }
}

