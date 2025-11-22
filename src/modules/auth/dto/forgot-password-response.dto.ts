import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ForgotPasswordResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Password reset OTP sent if email exists' })
  message: string;

  @ApiPropertyOptional({
    type: 'object',
    properties: {
      otp: {
        type: 'object',
        properties: {
          code: { type: 'string', example: '123456' },
          expiresAt: { type: 'string', format: 'date-time', example: '2025-11-22T20:00:00.000Z' },
        },
      },
    },
  })
  data?: {
    otp?: {
      code: string;
      expiresAt: Date;
    };
  };
}