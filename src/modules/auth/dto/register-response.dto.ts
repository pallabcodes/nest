import { ApiProperty } from '@nestjs/swagger';

export class RegisterResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'User registered successfully' })
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
          isEmailVerified: { type: 'boolean', example: false },
        },
      },
      tokens: {
        type: 'object',
        properties: {
          accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIs...' },
          refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIs...' },
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
    tokens?: {
      accessToken: string;
      refreshToken: string;
    };
  };
}