import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProfileResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({
    type: 'object',
    properties: {
      id: { type: 'number', example: 1 },
      email: { type: 'string', example: 'user@example.com' },
      name: { type: 'string', example: 'John Doe' },
      phone: { type: 'string', example: '+1234567890', nullable: true },
      isEmailVerified: { type: 'boolean', example: true },
      isActive: { type: 'boolean', example: true },
      roles: {
        type: 'array',
        items: { type: 'string' },
        example: ['user']
      },
      createdAt: { type: 'string', format: 'date-time', example: '2025-11-22T19:00:00.000Z' },
      updatedAt: { type: 'string', format: 'date-time', example: '2025-11-22T19:00:00.000Z' },
    },
  })
  data: {
    id: number;
    email: string;
    name: string;
    phone?: string | null;
    isEmailVerified: boolean;
    isActive: boolean;
    roles: string[];
    createdAt: Date;
    updatedAt: Date;
  };
}