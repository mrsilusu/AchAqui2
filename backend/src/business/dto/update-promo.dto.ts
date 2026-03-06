import { IsString, IsNumber, IsBoolean, IsOptional, MaxLength, Min, Max, IsDateString } from 'class-validator';

export class UpdatePromoDto {
  @IsString()
  @MaxLength(100)
  @IsOptional()
  title?: string;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  description?: string;

  @IsString()
  @MaxLength(20)
  @IsOptional()
  code?: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  discountPercentage?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  discountFixedAmount?: number;

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
