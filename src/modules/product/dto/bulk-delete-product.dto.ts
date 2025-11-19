import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * BulkDeleteProductDto
 * 
 * Simple string-based format to avoid ValidationPipe nested DTO issues
 * Format: "1,2,3,4,5" - comma-separated IDs
 * 
 * For 2-hour interviews, this is simpler than nested DTOs
 */
export class BulkDeleteProductDto {
  @ApiProperty({ 
    example: '1,2,3,4,5', 
    description: 'Comma-separated product IDs to delete' 
  })
  @IsString({ message: 'IDs must be a string' })
  @IsNotEmpty({ message: 'IDs string is required' })
  ids: string;
}
