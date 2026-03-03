import { IsNumber, IsString, IsUUID, Min, MinLength } from 'class-validator';

export class CreateItemDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @Min(1)
  capacity: number;

  @IsString()
  @MinLength(3)
  description: string;

  @IsUUID()
  businessId: string;
}
