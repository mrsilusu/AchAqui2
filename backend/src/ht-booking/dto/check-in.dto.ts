import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

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

  @IsOptional()
  @IsIn(['definitivo', 'temporario'])
  assignType?: 'definitivo' | 'temporario';

  @IsOptional()
  @IsString()
  note?: string;
}
