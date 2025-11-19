import { IsEmail, IsNotEmpty, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OtpType } from '../../../database/models/otp.model';

export class ResendOtpDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email address' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({ 
    example: 'VERIFY', 
    description: 'OTP type',
    enum: OtpType,
  })
  @IsEnum(OtpType, { message: 'Invalid OTP type' })
  @IsNotEmpty({ message: 'OTP type is required' })
  type: OtpType;
}

