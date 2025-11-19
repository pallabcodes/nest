import { IsString, IsEmail, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateTeacherDto {
  @ApiProperty({ example: 'Dr. John Smith', description: 'Teacher name' })
  @IsString({ message: 'Name must be a string' })
  name: string;

  @ApiProperty({ example: 'john.smith@university.edu', description: 'Teacher email' })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email: string;

  @ApiProperty({ example: '+1-555-1001', description: 'Teacher phone number', required: false })
  @IsOptional()
  @IsString({ message: 'Phone must be a string' })
  phone?: string;

  @ApiProperty({ example: 'Algorithms and Data Structures', description: 'Teacher specialization', required: false })
  @IsOptional()
  @IsString({ message: 'Specialization must be a string' })
  specialization?: string;

  @ApiProperty({ example: true, description: 'Is teacher active', required: false, default: true })
  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean' })
  @Transform(({ value }) => value ?? true)
  isActive?: boolean = true;
}
