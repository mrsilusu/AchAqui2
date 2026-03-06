import { IsString, IsNumber, IsBoolean, IsOptional, MaxLength, Min, Max, IsDateString } from 'class-validator';

export class CreatePromoDto {
  @IsString()
  @MaxLength(100)
  title: string;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  description?: string;

  @IsString()
  @MaxLength(20)
  code: string; // Código de promoção (ex: "SUMMER2024")

  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercentage?: number; // 0-100

  @IsNumber()
  @Min(0)
  @IsOptional()
  discountFixedAmount?: number; // Valor fixo de desconto

  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  businessId?: string;
}
