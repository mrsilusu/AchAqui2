import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CheckInDto {
  @IsOptional()
  @IsUUID()
  roomId?: string;

  @IsOptional()
  @IsString()
  guestName?: string;

  @IsOptional()
  @IsString()
  guestPhone?: string;
}
