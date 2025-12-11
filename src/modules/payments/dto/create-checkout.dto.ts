import { IsArray, IsEnum, IsInt, IsOptional, IsPositive, IsString, Min } from 'class-validator';

export enum CheckoutMode {
  PAYMENT = 'payment',
  SUBSCRIPTION = 'subscription',
}

export enum PurchasableType {
  COURSE = 'course',
}

export class CheckoutItemDto {
  @IsEnum(PurchasableType)
  type: PurchasableType;

  @IsInt()
  @Min(1)
  id: number;

  @IsInt()
  @IsPositive()
  quantity: number = 1;
}

export class CreateCheckoutDto {
  @IsEnum(CheckoutMode)
  @IsOptional()
  mode?: CheckoutMode = CheckoutMode.PAYMENT;

  @IsArray()
  items: CheckoutItemDto[];

  @IsString()
  @IsOptional()
  clientReferenceId?: string;
}

