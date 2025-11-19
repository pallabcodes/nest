import { IsInt, IsOptional, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EnrollCourseDto {
  @ApiProperty({ example: 1, description: 'Course ID to enroll in' })
  @IsInt({ message: 'Course ID must be an integer' })
  courseId: number;

  @ApiProperty({ 
    example: 'enrolled', 
    description: 'Enrollment status',
    enum: ['enrolled', 'completed', 'dropped', 'failed'],
    required: false,
    default: 'enrolled'
  })
  @IsOptional()
  @IsEnum(['enrolled', 'completed', 'dropped', 'failed'], {
    message: 'Status must be one of: enrolled, completed, dropped, failed',
  })
  status?: string;
}

export class UpdateEnrollmentDto {
  @ApiProperty({ 
    example: 'completed', 
    description: 'Enrollment status',
    enum: ['enrolled', 'completed', 'dropped', 'failed'],
    required: false
  })
  @IsOptional()
  @IsEnum(['enrolled', 'completed', 'dropped', 'failed'], {
    message: 'Status must be one of: enrolled, completed, dropped, failed',
  })
  status?: string;

  @ApiProperty({ 
    example: 85.5, 
    description: 'Final grade (0-100)',
    required: false
  })
  @IsOptional()
  @IsNumber({}, { message: 'Grade must be a number' })
  @Min(0, { message: 'Grade must be at least 0' })
  @Max(100, { message: 'Grade must be at most 100' })
  grade?: number;
}

