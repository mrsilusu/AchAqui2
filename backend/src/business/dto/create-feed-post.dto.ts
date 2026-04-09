import { IsBoolean, IsOptional, IsString, Length, IsUrl } from 'class-validator';

export class CreateFeedPostDto {
  @IsString()
  @Length(3, 600)
  content!: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  mediaUrl?: string;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;
}
