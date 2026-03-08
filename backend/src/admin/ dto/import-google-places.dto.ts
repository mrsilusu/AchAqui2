import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { BusinessCategory } from '@prisma/client';

export class ImportGooglePlacesDto {
  @IsString()
  city: string; // ex: "Luanda"

  @IsEnum(BusinessCategory)
  category: BusinessCategory;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(60) // Google Places API max per request
  limit?: number;

  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(50000)
  radiusMeters?: number; // raio de pesquisa em metros (default: 5000)
}
