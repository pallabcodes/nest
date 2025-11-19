import { IsString, IsEmail, IsOptional, IsBoolean, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateStudentDto {
  @ApiProperty({ example: 'John Doe', description: 'Student name' })
  @IsString({ message: 'Name must be a string' })
  name: string;

  @ApiProperty({ example: 'john.doe@student.edu', description: 'Student email' })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email: string;

  @ApiProperty({ example: '+1-555-1234', description: 'Student phone number', required: false })
  @IsOptional()
  @IsString({ message: 'Phone must be a string' })
  phone?: string;

  @ApiProperty({ example: 'STU001', description: 'Student ID', required: false })
  @IsOptional()
  @IsString({ message: 'Student ID must be a string' })
  studentId?: string;

  @ApiProperty({ example: '2000-01-15', description: 'Date of birth', required: false })
  @IsOptional()
  @IsDateString({}, { message: 'Date of birth must be a valid date' })
  dateOfBirth?: string;

  @ApiProperty({ example: true, description: 'Is student active', required: false, default: true })
  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean' })
  @Transform(({ value }) => value ?? true)
  isActive?: boolean = true;
}
