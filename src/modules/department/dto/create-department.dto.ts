import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateDepartmentDto {
  @ApiProperty({ example: 'Computer Science', description: 'Department name' })
  @IsString({ message: 'Name must be a string' })
  name: string;

  @ApiProperty({ example: 'Department of Computer Science and Engineering', description: 'Department description', required: false })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;

  @ApiProperty({ example: true, description: 'Is department active', required: false, default: true })
  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean' })
  @Transform(({ value }) => value ?? true)
  isActive?: boolean = true;
}
