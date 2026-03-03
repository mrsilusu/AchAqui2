import { BusinessCategory } from '@prisma/client';
import {
  IsEnum,
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

  @IsEnum(BusinessCategory)
  category: BusinessCategory;

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
