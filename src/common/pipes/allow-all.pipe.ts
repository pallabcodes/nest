import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

/**
 * AllowAllPipe
 * 
 * A pipe that allows all properties without validation
 * Use this to bypass ValidationPipe for endpoints that need flexible data structures
 */
@Injectable()
export class AllowAllPipe implements PipeTransform<any> {
  transform(value: any, metadata: ArgumentMetadata) {
    // Return value as-is, bypassing validation
    return value;
  }
}

