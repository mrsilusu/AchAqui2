import { IsString, IsNumber, IsBoolean, IsOptional, MaxLength, Min } from 'class-validator';

export class UpdateRoomDto {
  @IsString()
  @MaxLength(100)
  @IsOptional()
  name?: string;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  pricePerNight?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  maxGuests?: number;

  @IsBoolean()
  @IsOptional()
  available?: boolean;

  @IsNumber()
  @Min(1)
  @IsOptional()
  totalRooms?: number;

  @IsString()
  @IsOptional()
  amenities?: string;

  @IsString()
  @IsOptional()
  businessId?: string;
}
