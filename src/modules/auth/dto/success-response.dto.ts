import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SuccessResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Operation completed successfully' })
  message: string;

  @ApiPropertyOptional()
  data?: unknown;
}