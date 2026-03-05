import { IsBoolean } from 'class-validator';

export class UpdateBusinessStatusDto {
  @IsBoolean()
  isOpen: boolean;
}
