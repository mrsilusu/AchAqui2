import {
  IsString, IsNumber, IsBoolean, IsOptional,
  IsArray, MaxLength, Min, Max,
} from 'class-validator';

export class CreateRoomTypeDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @MaxLength(1000)
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  pricePerNight: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  maxGuests?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  totalRooms?: number;

  @IsBoolean()
  @IsOptional()
  available?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  amenities?: string[];

  @IsNumber()
  @Min(1)
  @IsOptional()
  minNights?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  taxRate?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  weekendMultiplier?: number;

  @IsOptional()
  seasonalRates?: any;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  photos?: string[];

  @IsString()
  @IsOptional()
  businessId?: string;
}
