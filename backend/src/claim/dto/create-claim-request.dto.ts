import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateClaimRequestDto {
  @IsString()
  @MinLength(10, { message: 'A justificação deve ter pelo menos 10 caracteres.' })
  @MaxLength(1000)
  evidence: string; // texto livre: descrição da relação com o negócio, URL de documento, etc.
}
