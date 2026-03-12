import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class CreateClaimRequestDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(20, { message: 'Evidência deve ter pelo menos 20 caracteres.' })
  evidence: string;
}
