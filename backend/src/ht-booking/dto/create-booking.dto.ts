import {
  IsISO8601, IsInt, IsOptional, IsString, Min,
} from 'class-validator';

export class CreateHtBookingDto {
  @IsString()
  businessId: string;

  @IsString()
  roomTypeId: string;

  @IsString()
  @IsISO8601()
  startDate: string;

  @IsString()
  @IsISO8601()
  endDate: string;

  @IsOptional()
  @IsString()
  guestName?: string;

  @IsOptional()
  @IsString()
  guestPhone?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  adults?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  children?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
