import { ApiProperty } from '@nestjs/swagger';

export class LoginResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Login successful' })
  message: string;

  @ApiProperty({
    type: 'object',
    properties: {
      user: {
        type: 'object',
        properties: {
          id: { type: 'number', example: 1 },
          email: { type: 'string', example: 'user@example.com' },
          name: { type: 'string', example: 'John Doe' },
          isEmailVerified: { type: 'boolean', example: true },
        },
      },
    },
  })
  data: {
    user: {
      id: number;
      email: string;
      name: string;
      isEmailVerified: boolean;
    };
  };
}