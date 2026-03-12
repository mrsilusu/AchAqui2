import { IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class ImportGooglePlacesDto {
  @IsString()
  city: string;

  @IsString()
  category: string;

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
