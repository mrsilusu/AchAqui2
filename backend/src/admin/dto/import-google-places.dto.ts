import { IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { BusinessCategory } from '@prisma/client';

export class ImportGooglePlacesDto {
  @IsString()
  city: string;

  @IsEnum(BusinessCategory)
  category: BusinessCategory;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(60)
  limit?: number;

  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(50000)
  radiusMeters?: number;
}
