import { BookingStatus } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';

export class CreateBookingDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsUUID()
  businessId: string;

  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;
}
