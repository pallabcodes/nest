import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException, ExecutionContext } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

/**
 * BulkFriendlyValidationPipe
 * 
 * Skips validation for bulk routes - pragmatic solution for 2-hour interviews
 * For production, use proper DTOs or separate controllers
 */
@Injectable()
export class BulkFriendlyValidationPipe implements PipeTransform<any> {
  async transform(value: any, metadata: ArgumentMetadata) {
    // Skip validation if no metatype (e.g., when using @Req())
    // This allows bulk operations to bypass validation
    if (!metadata.metatype || !this.toValidate(metadata.metatype)) {
      return value;
    }

    // Skip validation for Request type (used in bulk operations)
    if (metadata.metatype.name === 'Request' || metadata.metatype === Object) {
      return value;
    }

    // Transform plain object to class instance
    const object = plainToInstance(metadata.metatype, value);
    
    // Validate
    const errors = await validate(object);
    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: errors.map((err) => ({
          field: err.property,
          message: Object.values(err.constraints || {}).join(', '),
        })),
      });
    }

    return object;
  }

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }
}

