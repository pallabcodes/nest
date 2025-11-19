import { IsString, IsNotEmpty, MinLength, IsNumber, IsOptional, Min, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty({ example: 'Laptop', description: 'Product name' })
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name is required' })
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  name: string;

  @ApiProperty({ example: 999.99, description: 'Product price' })
  @IsNumber({}, { message: 'Price must be a number' })
  @IsNotEmpty({ message: 'Price is required' })
  @Min(0, { message: 'Price must be greater than or equal to 0' })
  @Type(() => Number)
  price: number;

  @ApiProperty({ example: 'High-performance laptop', description: 'Product description', required: false })
  @IsString({ message: 'Description must be a string' })
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 10, description: 'Stock quantity', required: false, default: 0 })
  @IsNumber({}, { message: 'Stock must be a number' })
  @IsOptional()
  @Min(0, { message: 'Stock must be greater than or equal to 0' })
  @Type(() => Number)
  @Transform(({ value }) => value ?? 0)
  stock?: number = 0;

  @ApiProperty({ example: true, description: 'Product active status', required: false, default: true })
  @IsBoolean({ message: 'isActive must be a boolean' })
  @IsOptional()
  @Transform(({ value }) => value ?? true)
  isActive?: boolean = true;

  @ApiProperty({ example: 1, description: 'Seller ID', required: false })
  @IsNumber({}, { message: 'sellerId must be a number' })
  @IsOptional()
  @Type(() => Number)
  sellerId?: number;
}
