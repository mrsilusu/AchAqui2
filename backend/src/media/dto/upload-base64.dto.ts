import { IsBase64, IsString, MinLength } from 'class-validator';

export class UploadBase64Dto {
  @IsString()
  @MinLength(3)
  fileName: string;

  @IsString()
  @MinLength(3)
  mimeType: string;

  @IsBase64()
  base64: string;
}
