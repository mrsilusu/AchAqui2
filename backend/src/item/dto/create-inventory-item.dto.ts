import { IsString, IsNumber, IsBoolean, IsOptional, MaxLength, Min } from 'class-validator';

export class CreateInventoryItemDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @Min(0)
  stock: number; // Quantidade em stock

  @IsString()
  @MaxLength(50)
  @IsOptional()
  category?: string; // 'Bebidas', 'Snacks', 'Utensílios', etc.

  @IsBoolean()
  @IsOptional()
  available?: boolean; // default: true

  @IsString()
  @IsOptional()
  businessId?: string; // To validate ownership
}
