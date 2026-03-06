import { IsString, IsNumber, IsBoolean, IsOptional, MaxLength, Min, IsEnum } from 'class-validator';

export class CreateMenuItemDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  category?: string; // 'Entradas', 'Pratos Principais', 'Bebidas', 'Sobremesas', etc.

  @IsBoolean()
  @IsOptional()
  available?: boolean; // default: true

  @IsString()
  @IsOptional()
  businessId?: string; // To validate ownership
}
