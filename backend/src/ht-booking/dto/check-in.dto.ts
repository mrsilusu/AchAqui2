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

  @IsOptional()
  @IsString()
  documentType?: string;

  @IsOptional()
  @IsString()
  documentNumber?: string;

  @IsOptional()
  @IsString()
  nationality?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  nif?: string;

  @IsOptional()
  @IsString()
  dateOfBirth?: string;
}
