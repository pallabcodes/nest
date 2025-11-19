import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

/**
 * SkipValidationPipe
 * 
 * A pipe that does nothing - used to bypass ValidationPipe for endpoints
 * that need to accept flexible data structures (like bulk operations)
 */
@Injectable()
export class SkipValidationPipe implements PipeTransform<any> {
  transform(value: any, metadata: ArgumentMetadata) {
    return value;
  }
}

