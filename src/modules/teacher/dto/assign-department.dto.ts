import { IsInt, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignDepartmentDto {
  @ApiProperty({ example: 1, description: 'Department ID' })
  @IsInt({ message: 'Department ID must be an integer' })
  departmentId: number;

  @ApiProperty({ 
    example: 'Head', 
    description: 'Role in department (e.g., Head, Member, Advisor)',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'Role must be a string' })
  role?: string;
}

export class AssignCourseDto {
  @ApiProperty({ example: 1, description: 'Course ID' })
  @IsInt({ message: 'Course ID must be an integer' })
  courseId: number;

  @ApiProperty({ 
    example: 'Instructor', 
    description: 'Role in course (e.g., Instructor, Co-Instructor, TA)',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'Role must be a string' })
  role?: string;
}

