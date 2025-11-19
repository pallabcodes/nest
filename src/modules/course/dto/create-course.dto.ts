import { IsString, IsOptional, IsBoolean, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateCourseDto {
  @ApiProperty({ example: 'Introduction to Programming', description: 'Course name' })
  @IsString({ message: 'Name must be a string' })
  name: string;

  @ApiProperty({ example: 'CS101', description: 'Course code', required: false })
  @IsOptional()
  @IsString({ message: 'Code must be a string' })
  code?: string;

  @ApiProperty({ example: 'Fundamentals of programming and problem solving', description: 'Course description', required: false })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;

  @ApiProperty({ example: 3, description: 'Number of credits', required: false })
  @IsOptional()
  @IsInt({ message: 'Credits must be an integer' })
  @Min(0, { message: 'Credits must be at least 0' })
  credits?: number;

  @ApiProperty({ example: true, description: 'Is course active', required: false, default: true })
  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean' })
  @Transform(({ value }) => value ?? true)
  isActive?: boolean = true;
}
