import { IsString, IsNumber, IsBoolean, IsOptional, MaxLength, Min } from 'class-validator';

export class CreateServiceDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  basePrice: number;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  duration?: string; // "30 min", "1 hora", etc.

  @IsBoolean()
  @IsOptional()
  available?: boolean;

  @IsString()
  @IsOptional()
  businessId?: string;
}
