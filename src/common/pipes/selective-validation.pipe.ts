import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

/**
 * SelectiveValidationPipe
 * 
 * A ValidationPipe that can skip validation for specific routes
 * Use this for bulk operations that need flexible data structures
 */
@Injectable()
export class SelectiveValidationPipe implements PipeTransform<any> {
  constructor(
    private readonly skipValidation: boolean = false,
  ) {}

  async transform(value: any, { metatype }: ArgumentMetadata) {
    // If skipValidation is true, return value as-is
    if (this.skipValidation) {
      return value;
    }

    // If no metatype or not a class, return value
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    // Transform plain object to class instance
    const object = plainToInstance(metatype, value);
    
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

