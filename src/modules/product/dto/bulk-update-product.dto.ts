import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * BulkUpdateProductDto
 * 
 * Simple string-based format to avoid ValidationPipe nested DTO issues
 * Format: "id1:field1:value1,id2:field2:value2" or "id1:price:100,id2:stock:50"
 * 
 * For 2-hour interviews, this is simpler than nested DTOs
 */
export class BulkUpdateProductDto {
  @ApiProperty({ 
    example: '1:price:249.99,2:stock:25', 
    description: 'Comma-separated updates in format id:field:value' 
  })
  @IsString({ message: 'Updates must be a string' })
  @IsNotEmpty({ message: 'Updates string is required' })
  updates: string;
}
