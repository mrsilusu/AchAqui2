import {
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateBusinessDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  category: string;

  @IsString()
  @MinLength(5)
  description: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;
}
