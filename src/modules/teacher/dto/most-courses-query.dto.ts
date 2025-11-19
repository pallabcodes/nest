import { IsOptional, IsInt, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class MostCoursesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return 10;
    const num = Number(value);
    if (isNaN(num) || !Number.isInteger(num) || num <= 0) return 10;
    return num;
  })
  limit: number = 10;
}

