import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class RejectBookingDto {
  @IsOptional()
  @IsUUID()
  businessId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
