import { IsBoolean, IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateOwnerSettingsDto {
  @IsBoolean()
  @IsOptional()
  darkMode?: boolean;

  @IsBoolean()
  @IsOptional()
  notificationsEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  autoReplyEnabled?: boolean;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  autoReplyMessage?: string;

  @IsBoolean()
  @IsOptional()
  instantBookingEnabled?: boolean;
}
